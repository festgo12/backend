import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { getAddress } from 'ethers';
import * as bs58 from 'bs58';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { ChainClientService } from './chain-client.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { HdWalletService } from './hd-wallet.service';
import { PlatformService } from './platform.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  response?: { data?: { message?: string } };
}

/**
 * Local-first (Alchemy) withdrawal executor. Mirrors the legacy withdrawal
 * service's contract so the controller can swap providers transparently:
 * validate balance -> broadcast with a locally derived key -> record a
 * PENDING WalletTransaction -> enqueue a WithdrawalJob for confirmation
 * polling. Zero external API calls.
 */
@Injectable()
export class CryptoWithdrawalService {
  private readonly logger = new Logger(CryptoWithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hdWallet: HdWalletService,
    private readonly chainClient: ChainClientService,
    private readonly tracker: WithdrawalTrackerService,
    private readonly platformService: PlatformService,
    private readonly cryptoConfig: CryptoConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processWithdrawal(params: {
    walletId: string;
    amount: number;
    destinationAddress: string;
    currency: Currency;
  }): Promise<{ txId: string; status: string }> {
    const { walletId, amount, destinationAddress, currency } = params;

    this.logger.log(
      `Initiating local withdrawal: ${amount} ${currency} to ${destinationAddress}`,
    );

    // 1. Validate wallet exists
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        isFrozen: true,
        currency: true,
        chain: true,
        address: true,
      },
    });
    if (!wallet) throw new BadRequestException('Wallet not found');

    // Wallet frozen due to rollback detection
    if (wallet.isFrozen) {
      throw new BadRequestException(
        'Wallet is frozen due to rollback detection. Please contact support.',
      );
    }

    // Legacy 'EVM' family wallets share a single 0x address but predate
    // per-chain wallets. Normalize to the canonical EVM chain (Ethereum) so
    // the ENTIRE flow (validation, broadcast, confirmation tracker) uses a
    // concrete, provider-resolvable chain.
    const rawChain = (wallet.chain as string) || 'ETH';
    const chain = rawChain === 'EVM' ? 'ETH' : rawChain;

    // 2. Validate chain and destination BEFORE reserving funds to avoid locking
    if (!wallet.currency || !this.hdWallet.chainForCurrency(wallet.currency)) {
      throw new BadRequestException(
        'Wallet has no on-chain address yet. Please request a deposit address first.',
      );
    }
    this.validateAddress(currency, chain, destinationAddress);

    // 3. Atomically reserve funds — prevents double-spend on concurrent requests
    const amountDecimal = new Prisma.Decimal(amount);
    const reserveResult = await this.prisma.$executeRaw`
      UPDATE "Wallet"
      SET "reservedBalance" = "reservedBalance" + ${amountDecimal}
      WHERE "id" = ${walletId}::uuid
        AND ("balance" - "reservedBalance") >= ${amountDecimal}
    `;

    if (reserveResult === 0) {
      throw new BadRequestException('Insufficient balance');
    }

    // 4. Record intent
    await this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        metadata: {
          destination: destinationAddress,
          blockchain: chain,
          provider: 'alchemy',
          intent: true,
        },
      },
    });

    // Always sign from master wallet (index 0) — all funds are swept here
    const fromIndex = 0;

    // 5. Broadcast with the wallet's own derived key
    let txHash: string;
    try {
      txHash = await this.broadcastByChain(
        currency,
        chain,
        fromIndex,
        destinationAddress,
        amount,
      );
    } catch (error) {
      const err = error as ErrorLike;
      const message = err.response?.data?.message || err.message;
      this.logger.error(
        `Blockchain submission failed for ${currency}/${chain}: ${message}`,
      );

      // Release reservation on broadcast failure
      await this.prisma.$executeRaw`
        UPDATE "Wallet"
        SET "reservedBalance" = "reservedBalance" - ${amountDecimal}
        WHERE "id" = ${walletId}::uuid
      `;

      throw new InternalServerErrorException(`Withdrawal failed: ${message}`);
    }

    // 6. Link the intent record to the broadcast txHash
    await this.prisma.walletTransaction.updateMany({
      where: {
        walletId,
        status: 'PENDING',
        reference: { startsWith: 'intent-' },
      },
      data: {
        reference: txHash,
        metadata: {
          destination: destinationAddress,
          blockchain: chain,
          provider: 'alchemy',
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await this.tracker.enqueue({
      txHash,
      walletId,
      currency,
      chain,
      amount,
      destination: destinationAddress,
      metadata: { source: 'USER_WITHDRAWAL' },
    });

    this.eventEmitter.emit('wallet.withdrawal.initiated', {
      transactionId: txHash,
      walletId,
      type: LedgerType.WITHDRAWAL,
      reference: txHash,
      amount,
      status: 'PENDING',
    });

    this.logger.log(
      `Local withdrawal submitted: ${txHash} (${amount} ${currency})`,
    );
    return { txId: txHash, status: 'PENDING' };
  }

  /**
   * Retries a previously failed withdrawal. Only locally-derived wallets can
   * be retried through this path.
   */
  async retryWithdrawal(
    transactionId: string,
  ): Promise<{ txId: string; status: string }> {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!tx || tx.status !== 'FAILED') {
      throw new BadRequestException(
        'Transaction not found or not in FAILED status',
      );
    }

    const meta = (tx.metadata ?? {}) as { destination?: string };

    await this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { status: 'CANCELLED' },
    });

    return this.processWithdrawal({
      walletId: tx.walletId,
      amount: tx.amount.toNumber(),
      destinationAddress: meta.destination ?? '',
      currency: tx.wallet.currency,
    });
  }

  /**
   * Sweeps a platform fee wallet to a treasury/destination address. Used by
   * admins to move accumulated fee revenue off-chain. Sourced from the fee
   * wallet's locally-derived address; the sweep is tracked by the withdrawal
   * queue so confirmations update the ledger debit automatically.
   */
  async sweepFeeWallet(params: {
    currency: Currency;
    destinationAddress: string;
    amount?: number;
    chain?: string;
  }): Promise<{ txId: string; status: string }> {
    const {
      currency,
      destinationAddress,
      amount: requestedAmount,
      chain: requestedChain,
    } = params;

    const feeWallet = await this.platformService.getPlatformFeeWallet(
      currency,
      requestedChain,
    );
    if (!feeWallet) {
      throw new BadRequestException(`Fee wallet not found for ${currency}`);
    }
    if (!feeWallet.address) {
      throw new BadRequestException(
        `Fee wallet for ${currency} has no on-chain address`,
      );
    }

    // The fee wallet's stored chain determines which network the sweep runs on.
    // Legacy 'EVM' rows normalize to the canonical EVM chain (Ethereum).
    const rawChain = requestedChain || (feeWallet.chain as string) || 'ETH';
    const chain = rawChain === 'EVM' ? 'ETH' : rawChain;
    this.validateAddress(currency, chain, destinationAddress);

    // Guard against self-sweeps: the platform fee wallet lives on the master
    // address (index 0), so it can never be a valid sweep destination.
    const evmFamily = this.cryptoConfig.isEvmChain(chain);
    const masterAddress = this.cryptoConfig.isEvmChain(chain)
      ? this.hdWallet.getMasterAddress('EVM')
      : chain === 'BTC'
        ? this.hdWallet.getMasterAddress('BTC')
        : this.hdWallet.getMasterAddressForChain(chain);
    const dest = destinationAddress.trim();
    const sameMaster =
      evmFamily || chain === 'TRON'
        ? masterAddress.toLowerCase() === dest.toLowerCase()
        : masterAddress === dest;
    if (
      sameMaster ||
      (evmFamily || chain === 'TRON'
        ? feeWallet.address.toLowerCase() === dest.toLowerCase()
        : feeWallet.address === dest)
    ) {
      throw new BadRequestException(
        `Destination cannot be the platform address itself for ${currency}`,
      );
    }

    let fromIndex = feeWallet.derivationIndex;
    if (fromIndex === null) {
      // Legacy fee wallet (pre-HD address, no derivation index): reassign the
      // platform's pinned master address (index 0) so the sweep can be signed
      // from a derived key. Deterministic across DB resets.
      const info = this.platformFeeAddress(chain);
      await this.prisma.wallet.update({
        where: { id: feeWallet.id },
        data: {
          address: info.address,
          derivationIndex: info.derivationIndex,
          chain: info.chain,
        },
      });
      fromIndex = info.derivationIndex;
    }

    // If no amount specified, fetch the full on-chain balance
    let amount: number;
    if (requestedAmount && requestedAmount > 0) {
      amount = requestedAmount;
    } else {
      // Sweep full on-chain balance
      amount = await this.onChainBalance(currency, chain, feeWallet.address);
      if (amount <= 0) {
        throw new BadRequestException(
          `No on-chain balance available for ${currency} sweep`,
        );
      }
    }

    let txHash: string;
    try {
      txHash = await this.broadcastByChain(
        currency,
        chain,
        fromIndex,
        destinationAddress,
        amount,
      );
    } catch (error) {
      const err = error as ErrorLike;
      const message = err.response?.data?.message || err.message;
      this.logger.error(
        `Fee sweep failed for ${currency}/${chain}: ${message}`,
      );
      throw new InternalServerErrorException(`Fee sweep failed: ${message}`);
    }

    await this.prisma.walletTransaction.create({
      data: {
        walletId: feeWallet.id,
        type: LedgerType.WITHDRAWAL,
        amount,
        status: 'PENDING',
        reference: txHash,
        metadata: {
          destination: destinationAddress,
          blockchain: chain,
          provider: 'alchemy',
          sweep: true,
          feeWallet: true,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    await this.tracker.enqueue({
      txHash,
      walletId: feeWallet.id,
      currency,
      chain,
      amount,
      destination: destinationAddress,
      metadata: { source: 'FEE_WALLET_SWEEP' },
    });

    this.logger.log(
      `Fee wallet sweep submitted: ${amount} ${currency}/${chain} -> ${destinationAddress} (TX: ${txHash})`,
    );
    return { txId: txHash, status: 'PENDING' };
  }

  private validateAddress(
    currency: Currency,
    chain: string,
    address: string,
  ) {
    if (!address || typeof address !== 'string') {
      throw new BadRequestException('Invalid destination address');
    }

    const trimmed = address.trim();

    if (currency === Currency.BTC) {
      if (this.cryptoConfig.isTestnet) {
        if (
          !(
            /^(?:m|n)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) ||
            /^2[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) ||
            /^tb1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(trimmed)
          )
        ) {
          throw new BadRequestException('Invalid Bitcoin address format');
        }
      } else if (
        !/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(
          trimmed,
        )
      ) {
        throw new BadRequestException('Invalid Bitcoin address format');
      }
      return;
    }

    if (chain === 'SOLANA') {
      this.validateSolanaAddress(trimmed);
      return;
    }

    if (chain === 'TRON') {
      this.validateTronAddress(trimmed);
      return;
    }

    // EVM-family chains (ETH/BSC/POLYGON) use the 0x checksum format.
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      throw new BadRequestException('Invalid Ethereum address format');
    }
    try {
      // EIP-55 checksum validation — rejects mistyped addresses
      getAddress(trimmed);
    } catch {
      throw new BadRequestException(
        'Invalid Ethereum address checksum (EIP-55). Use a properly checksummed address.',
      );
    }
  }

  /** Validates a Solana Base58 public key (32-byte payload). */
  private validateSolanaAddress(address: string) {
    if (address.length < 32 || address.length > 44) {
      throw new BadRequestException('Invalid Solana address length');
    }
    try {
      const decoded = bs58.decode(address);
      if (decoded.length !== 32) {
        throw new BadRequestException('Invalid Solana address length');
      }
    } catch {
      throw new BadRequestException('Invalid Solana address format');
    }
  }

  /** Validates a TRON base58check address starting with 'T' (0x41 prefix). */
  private validateTronAddress(address: string) {
    if (!/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(address)) {
      throw new BadRequestException('Invalid TRON address format');
    }
  }

  /** Broadcasts a withdrawal/sweep on the correct chain for the parameters. */
  private async broadcastByChain(
    currency: Currency,
    chain: string,
    fromIndex: number,
    to: string,
    amount: number,
  ): Promise<string> {
    // Legacy 'EVM' family rows share a single 0x address and were created
    // before per-chain wallets existed; route them to the canonical EVM chain
    // (Ethereum) so the RPC provider / signer can be resolved concretely.
    if (chain === 'EVM') chain = 'ETH';

    if (chain === 'BTC') {
      const feePerByte = await this.chainClient.getBtcRecommendedFee();
      return this.chainClient.broadcastBtc(fromIndex, to, amount, feePerByte);
    }
    if (this.cryptoConfig.isEvmChain(chain)) {
      if (currency === Currency.ETH) {
        return this.chainClient.broadcastEvmNative(fromIndex, to, amount, chain);
      }
      if (currency === Currency.USDT || currency === Currency.USDC) {
        return this.chainClient.broadcastEvmToken(currency, fromIndex, to, amount, chain);
      }
      throw new BadRequestException(
        `Withdrawals not supported for ${currency} on ${chain}`,
      );
    }
    if (chain === 'SOLANA') {
      if (currency === Currency.USDT || currency === Currency.USDC) {
        return this.chainClient.broadcastSolanaToken(currency, fromIndex, to, amount);
      }
      throw new BadRequestException(
        `Withdrawals not supported for ${currency} on SOLANA`,
      );
    }
    if (chain === 'TRON') {
      if (currency === Currency.USDT || currency === Currency.USDC) {
        return this.chainClient.broadcastTronToken(currency, fromIndex, to, amount);
      }
      throw new BadRequestException(
        `Withdrawals not supported for ${currency} on TRON`,
      );
    }
    throw new BadRequestException(
      `Withdrawals not supported for ${currency} on ${chain}`,
    );
  }

  /** Reads the on-chain balance of a fee wallet for a (currency, chain). */
  private async onChainBalance(
    currency: Currency,
    chain: string,
    address: string,
  ): Promise<number> {
    if (chain === 'BTC') {
      const utxos = await this.chainClient.getBtcUtxos(address);
      return utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
    }
    if (this.cryptoConfig.isEvmChain(chain)) {
      if (currency === Currency.ETH) return 0;
      return this.chainClient.getEvmBalance(address, currency, chain);
    }
    if (chain === 'SOLANA') {
      const mint = this.cryptoConfig.getStablecoinContractFor('SOLANA', currency);
      if (!mint) return 0;
      return this.chainClient.getSolanaTokenBalance(mint, address);
    }
    if (chain === 'TRON') {
      const contract = this.cryptoConfig.getStablecoinContractFor('TRON', currency);
      if (!contract) return 0;
      return this.chainClient.getTronTokenBalance(contract, address);
    }
    return 0;
  }

  /** Pinned master (index 0) address details for a chain (legacy reassignment). */
  private platformFeeAddress(chain: string): {
    chain: string;
    address: string;
    derivationIndex: number;
  } {
    if (chain === 'BTC') {
      return { chain: 'BTC', address: this.hdWallet.getMasterAddress('BTC'), derivationIndex: 0 };
    }
    if (chain === 'SOLANA') {
      return { chain: 'SOLANA', address: this.hdWallet.getMasterAddressForChain('SOLANA'), derivationIndex: 0 };
    }
    if (chain === 'TRON') {
      return { chain: 'TRON', address: this.hdWallet.getMasterAddressForChain('TRON'), derivationIndex: 0 };
    }
    return { chain, address: this.hdWallet.getMasterAddress('EVM'), derivationIndex: 0 };
  }
}
