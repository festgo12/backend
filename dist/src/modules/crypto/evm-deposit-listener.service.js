"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EvmDepositListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmDepositListenerService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const prisma_service_1 = require("../../core/database/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const chain_client_service_1 = require("./chain-client.service");
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
const TRANSFER_TOPIC = (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)('Transfer(address,address,uint256)'));
const STABLECOIN_DECIMALS = 6;
const RECENT_HASHES_MAX = 2048;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;
let EvmDepositListenerService = EvmDepositListenerService_1 = class EvmDepositListenerService {
    prisma;
    walletService;
    depositRegistry;
    config;
    chainClient;
    logger = new common_1.Logger(EvmDepositListenerService_1.name);
    provider = null;
    connected = false;
    lastConnectedAt = null;
    lastError = null;
    depositsDetected = 0;
    catchUpRuns = 0;
    latestBlock = null;
    reconnectTimer = null;
    catchUpRetryTimer = null;
    batchTimer = null;
    reconnectAttempts = 0;
    connecting = false;
    batchFlushing = false;
    socketDown = false;
    pendingBlocks = new Set();
    recentHashes = new Map();
    cursorLastBlock = 0;
    cursorLastBlockHash = null;
    lastCatchUpAt = 0;
    pendingHashes = new Set();
    pendingCacheLoaded = false;
    staleReceiptMisses = new Map();
    constructor(prisma, walletService, depositRegistry, config, chainClient) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.depositRegistry = depositRegistry;
        this.config = config;
        this.chainClient = chainClient;
    }
    async onApplicationBootstrap() {
        await this.depositRegistry.rebuild();
        if (!this.config.alchemyEthWsUrl) {
            this.logger.warn('ALCHEMY_ETH_WS_URL is not configured; EVM WebSocket deposit listener is disabled.');
            return;
        }
        await this.connect();
    }
    onApplicationShutdown() {
        this.teardown();
    }
    async getStatus() {
        const pendingCount = await this.prisma.walletTransaction.count({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'EVM_WS' },
            },
        });
        return {
            enabled: Boolean(this.config.alchemyEthWsUrl),
            connected: this.connected,
            lastConnectedAt: this.lastConnectedAt?.toISOString() ?? null,
            lastError: this.lastError,
            depositsDetected: this.depositsDetected,
            catchUpRuns: this.catchUpRuns,
            pendingCount,
            latestBlock: this.latestBlock,
        };
    }
    async connect() {
        if (this.connecting)
            return;
        this.connecting = true;
        try {
            this.teardown(false);
            const url = this.config.alchemyEthWsUrl;
            const provider = new ethers_1.WebSocketProvider(url);
            this.provider = provider;
            const ws = provider.websocket;
            ws.onclose = () => {
                void this.handleClose();
            };
            ws.onerror = (event) => {
                const err = event;
                this.logger.warn(`EVM WebSocket transport error: ${err?.message || 'unknown'}`);
            };
            await provider.on('block', (blockNumber) => {
                this.pendingBlocks.add(blockNumber);
                this.scheduleBatchFlush();
            });
            await this.subscribeTokens(provider);
            await provider.getBlockNumber();
            this.connected = true;
            this.lastConnectedAt = new Date();
            this.lastError = null;
            this.reconnectAttempts = 0;
            this.logger.log('EVM WebSocket connected; listening for deposits');
            try {
                await this.catchUp();
                const latest = await provider.getBlockNumber();
                await this.finalizePendingDeposits(latest - this.config.evmConfirmations + 1);
            }
            catch (error) {
                const err = error;
                this.logger.error(`EVM catch-up after connect failed: ${err.message}`);
                this.scheduleCatchUpRetry();
            }
        }
        catch (error) {
            const err = error;
            this.lastError = err.message || 'unknown';
            this.connected = false;
            this.logger.error(`EVM WebSocket connect failed: ${this.lastError}`);
            this.scheduleReconnect();
        }
        finally {
            this.connecting = false;
        }
    }
    handleClose() {
        this.connected = false;
        this.socketDown = true;
        this.logger.warn('EVM WebSocket connection closed');
        this.scheduleReconnect();
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** this.reconnectAttempts);
        this.reconnectAttempts += 1;
        this.logger.log(`EVM WebSocket reconnect scheduled in ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, delay);
    }
    scheduleCatchUpRetry() {
        if (this.catchUpRetryTimer)
            return;
        const delay = Math.max(this.config.evmCatchUpMinIntervalMs, 5_000);
        this.logger.log(`EVM catch-up retry scheduled in ${delay}ms`);
        this.catchUpRetryTimer = setTimeout(() => {
            this.catchUpRetryTimer = null;
            if (!this.connected)
                return;
            void this.catchUp().catch((error) => {
                this.logger.error(`EVM catch-up retry failed: ${error.message}`);
                this.scheduleCatchUpRetry();
            });
        }, delay);
    }
    teardown(clearReconnect = true) {
        if (clearReconnect && this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.catchUpRetryTimer) {
            clearTimeout(this.catchUpRetryTimer);
            this.catchUpRetryTimer = null;
        }
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        const provider = this.provider;
        this.provider = null;
        this.connected = false;
        this.pendingBlocks.clear();
        if (provider) {
            try {
                const ws = provider.websocket;
                ws.onclose = null;
            }
            catch {
            }
            void provider.removeAllListeners();
            try {
                if (!provider.destroyed)
                    void provider.destroy();
            }
            catch {
            }
        }
    }
    async subscribeTokens(provider) {
        const contracts = [
            {
                currency: client_1.Currency.USDT,
                address: this.config.getStablecoinContract('USDT'),
            },
            {
                currency: client_1.Currency.USDC,
                address: this.config.getStablecoinContract('USDC'),
            },
        ];
        for (const { currency, address } of contracts) {
            if (!address)
                continue;
            await provider.on({ address: address.toLowerCase(), topics: [TRANSFER_TOPIC] }, (log) => {
                void this.handleTransferLog(log, currency);
            });
        }
    }
    async handleTransferLog(log, currency) {
        if (!log.topics?.[2])
            return;
        if (log.removed) {
            await this.cancelRemovedTransfer(log.transactionHash);
            return;
        }
        const to = '0x' + log.topics[2].slice(26).toLowerCase();
        if (!this.depositRegistry.has(to, 'EVM'))
            return;
        const amount = Number((0, ethers_1.formatUnits)(BigInt(log.data), STABLECOIN_DECIMALS));
        if (!Number.isFinite(amount) || amount <= 0)
            return;
        const from = log.topics[1]
            ? '0x' + log.topics[1].slice(26).toLowerCase()
            : null;
        await this.recordPending({
            address: to,
            currency,
            amount,
            txHash: log.transactionHash,
            sourceAddress: from,
            blockNumber: log.blockNumber,
        });
    }
    async cancelRemovedTransfer(txHash) {
        if (!txHash)
            return;
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: txHash },
        });
        if (!existing || existing.status !== 'PENDING')
            return;
        await this.walletService.updateTransactionStatus(existing.id, 'CANCELLED', {
            finalization: 'REORG_REMOVED_LOG',
            cancelledAt: new Date().toISOString(),
        });
        this.pendingHashes.delete(txHash);
        this.staleReceiptMisses.delete(txHash);
        this.logger.warn(`Deposit cancelled (REORG_REMOVED_LOG): ${txHash}`);
    }
    scheduleBatchFlush() {
        if (this.pendingBlocks.size >=
            Math.max(1, this.config.evmAssetTransferBatchBlocks)) {
            void this.flushBatch();
            return;
        }
        if (this.batchTimer)
            return;
        this.batchTimer = setTimeout(() => {
            this.batchTimer = null;
            void this.flushBatch();
        }, Math.max(1, this.config.evmAssetTransferBatchMaxMs));
    }
    async flushBatch() {
        if (this.batchFlushing)
            return;
        this.batchFlushing = true;
        try {
            if (this.pendingBlocks.size === 0)
                return;
            const numbers = [...this.pendingBlocks].sort((a, b) => a - b);
            this.pendingBlocks.clear();
            const first = numbers[0];
            const last = numbers[numbers.length - 1];
            const provider = this.provider;
            if (!provider)
                return;
            this.latestBlock = last;
            const required = this.config.evmConfirmations;
            const maxFrom = last - required + 1;
            const addresses = this.depositRegistry.addressesForChain('EVM');
            if (maxFrom > 0) {
                await this.finalizePendingDeposits(maxFrom);
            }
            const reorged = await this.checkReorg(provider, numbers, maxFrom);
            if (reorged) {
                if (addresses.length > 0) {
                    await this.scanTransfers(provider, Math.max(1, maxFrom), last, addresses);
                }
                return;
            }
            if (addresses.length > 0) {
                await this.scanTransfers(provider, first, last, addresses);
            }
            if (maxFrom > this.cursorLastBlock) {
                const boundaryHash = this.recentHashes.get(maxFrom) ?? null;
                await this.prisma.chainCursor.upsert({
                    where: { chain: 'EVM' },
                    update: { lastBlock: maxFrom, lastBlockHash: boundaryHash },
                    create: {
                        chain: 'EVM',
                        lastBlock: maxFrom,
                        lastBlockHash: boundaryHash,
                    },
                });
                this.cursorLastBlock = maxFrom;
                this.cursorLastBlockHash = boundaryHash;
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`EVM batch scan failed: ${err.message}`);
        }
        finally {
            this.batchFlushing = false;
        }
    }
    async checkReorg(provider, numbers, maxFrom) {
        let reorged = false;
        for (const b of numbers) {
            const block = await provider.getBlock(b, false);
            if (!block)
                continue;
            if (block.hash) {
                this.recentHashes.set(b, block.hash);
                if (this.recentHashes.size > RECENT_HASHES_MAX) {
                    const oldest = Math.min(...this.recentHashes.keys());
                    this.recentHashes.delete(oldest);
                }
            }
            const prevHash = this.recentHashes.get(b - 1);
            if (block.parentHash && prevHash && block.parentHash !== prevHash) {
                reorged = true;
            }
        }
        const boundaryHash = this.recentHashes.get(maxFrom);
        if (this.cursorLastBlockHash &&
            boundaryHash &&
            boundaryHash !== this.cursorLastBlockHash) {
            reorged = true;
        }
        if (!reorged)
            return false;
        this.logger.warn(`EVM re-org detected near block ${numbers[numbers.length - 1]}; resetting cursor (live newHeads continue)`);
        await this.rewindForReorg(maxFrom);
        return true;
    }
    async rewindForReorg(maxFrom) {
        this.cursorLastBlock = 0;
        this.cursorLastBlockHash = null;
        this.recentHashes.clear();
        await this.prisma.chainCursor.upsert({
            where: { chain: 'EVM' },
            update: { lastBlock: Math.max(0, maxFrom - 1), lastBlockHash: null },
            create: {
                chain: 'EVM',
                lastBlock: Math.max(0, maxFrom - 1),
                lastBlockHash: null,
            },
        });
    }
    async scanTransfers(provider, fromBlock, toBlock, addresses) {
        if (fromBlock > toBlock)
            return;
        const transfers = await this.chainClient.getAssetTransfers(provider, {
            fromBlock,
            toBlock,
            toAddresses: addresses,
        });
        const addressSet = new Set(addresses.map((a) => a.toLowerCase()));
        for (const t of transfers) {
            if (!addressSet.has(t.to))
                continue;
            if (!Number.isFinite(t.amount) || t.amount <= 0)
                continue;
            const currency = this.currencyForTransfer(t);
            if (!currency)
                continue;
            await this.recordPending({
                address: t.to,
                currency,
                amount: t.amount,
                txHash: t.hash,
                sourceAddress: t.from || null,
                blockNumber: t.blockNumber,
            });
        }
    }
    currencyForTransfer(transfer) {
        if (transfer.category === 'external')
            return client_1.Currency.ETH;
        const asset = (transfer.asset ?? '').toUpperCase();
        if (asset === 'USDT')
            return client_1.Currency.USDT;
        if (asset === 'USDC')
            return client_1.Currency.USDC;
        return null;
    }
    async catchUp() {
        const provider = this.provider;
        if (!provider)
            return;
        const addresses = this.depositRegistry.addressesForChain('EVM');
        if (addresses.length === 0)
            return;
        const latest = await provider.getBlockNumber();
        const maxFrom = latest - this.config.evmConfirmations + 1;
        if (maxFrom < 1)
            return;
        const cursor = await this.prisma.chainCursor.upsert({
            where: { chain: 'EVM' },
            update: {},
            create: { chain: 'EVM', lastBlock: 0, lastBlockHash: null },
        });
        let from = cursor.lastBlock + 1;
        if (from > maxFrom)
            return;
        const maxBlocks = Math.max(1, this.config.evmCatchUpMaxBlocks);
        const gap = maxFrom - from + 1;
        if (gap > maxBlocks) {
            from = maxFrom - maxBlocks + 1;
            this.logger.warn(`EVM catch-up gap exceeds ${maxBlocks} blocks; scanning the most recent ${maxBlocks}`);
        }
        const now = Date.now();
        const elapsed = this.lastCatchUpAt > 0 ? now - this.lastCatchUpAt : Infinity;
        if (!this.socketDown &&
            elapsed < this.config.evmCatchUpMinIntervalMs &&
            gap <= maxBlocks) {
            this.logger.debug(`EVM catch-up throttled (${elapsed}ms since last run); live subscription covers recent blocks`);
            return;
        }
        await this.scanTransfers(provider, from, maxFrom, addresses);
        await this.prisma.chainCursor.upsert({
            where: { chain: 'EVM' },
            update: { lastBlock: maxFrom },
            create: { chain: 'EVM', lastBlock: maxFrom, lastBlockHash: null },
        });
        this.catchUpRuns += 1;
        this.lastCatchUpAt = Date.now();
        this.socketDown = false;
        this.logger.log(`EVM catch-up complete: scanned blocks ${from}..${maxFrom}`);
    }
    async finalizePendingDeposits(maxFrom) {
        const provider = this.provider;
        if (!provider || maxFrom < 1)
            return;
        await this.loadPendingCache();
        if (this.pendingHashes.size === 0)
            return;
        const pending = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'EVM_WS' },
            },
            take: 200,
        });
        for (const tx of pending) {
            const meta = (tx.metadata ?? {});
            const blockNumber = typeof meta.blockNumber === 'number' ? meta.blockNumber : NaN;
            if (!Number.isFinite(blockNumber) || blockNumber > maxFrom)
                continue;
            if (!tx.reference)
                continue;
            const receipt = await provider.getTransactionReceipt(tx.reference);
            if (receipt && receipt.blockNumber === blockNumber) {
                await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
                    confirmations: maxFrom - blockNumber + 1,
                    completedAt: new Date().toISOString(),
                });
                this.pendingHashes.delete(tx.reference);
                this.staleReceiptMisses.delete(tx.reference);
                this.logger.log(`Deposit finalized: ${tx.amount.toNumber()} ${meta.asset ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`);
            }
            else if (receipt && receipt.blockNumber !== blockNumber) {
                await this.cancelPending(tx, blockNumber, 'REORG_DROPPED');
            }
            else {
                const miss = this.staleReceiptMisses.get(tx.reference) ?? 0;
                this.staleReceiptMisses.set(tx.reference, miss + 1);
                if (miss + 1 >= 2) {
                    await this.cancelPending(tx, blockNumber, 'RECEIPT_MISSING');
                }
            }
        }
    }
    async loadPendingCache() {
        if (this.pendingCacheLoaded)
            return;
        const pendings = await this.prisma.walletTransaction.findMany({
            where: {
                type: client_1.LedgerType.DEPOSIT,
                status: 'PENDING',
                metadata: { path: ['listener'], equals: 'EVM_WS' },
            },
            select: { reference: true },
            take: 500,
        });
        for (const p of pendings) {
            if (p.reference)
                this.pendingHashes.add(p.reference);
        }
        this.pendingCacheLoaded = true;
    }
    async cancelPending(tx, blockNumber, reason) {
        if (!tx.reference)
            return;
        await this.walletService.updateTransactionStatus(tx.id, 'CANCELLED', {
            finalization: reason,
            cancelledAt: new Date().toISOString(),
        });
        this.pendingHashes.delete(tx.reference);
        this.staleReceiptMisses.delete(tx.reference);
        this.logger.warn(`Deposit cancelled (${reason}): ${tx.reference} (was block ${blockNumber})`);
    }
    async recordPending(params) {
        const { address, currency, amount, txHash, sourceAddress, blockNumber } = params;
        const existing = await this.prisma.walletTransaction.findUnique({
            where: { reference: txHash },
        });
        if (existing)
            return;
        const registrations = this.depositRegistry.lookup(address, 'EVM');
        if (registrations.length === 0)
            return;
        for (const reg of registrations) {
            const wallet = await this.prisma.wallet.findUnique({
                where: { id: reg.walletId },
            });
            if (!wallet || wallet.currency !== currency)
                continue;
            try {
                await this.walletService.createTransaction({
                    walletId: wallet.id,
                    type: client_1.LedgerType.DEPOSIT,
                    amount,
                    reference: txHash,
                    status: 'PENDING',
                    metadata: {
                        source: 'EVM_WS',
                        listener: 'EVM_WS',
                        blockTxId: txHash,
                        asset: currency,
                        address,
                        sourceAddress,
                        blockNumber,
                        confirmations: 0,
                        receivedAt: new Date().toISOString(),
                    },
                });
                this.depositsDetected += 1;
                this.pendingHashes.add(txHash);
                this.logger.log(`Deposit detected (pending): ${amount} ${currency} to wallet ${wallet.id} (TX: ${txHash}, block ${blockNumber})`);
            }
            catch (error) {
                const err = error;
                if (err.code === 'P2002') {
                    this.logger.debug(`Deposit ${txHash} already recorded for wallet ${wallet.id}; skipping`);
                }
                else {
                    this.logger.error(`Failed to record deposit ${txHash} for wallet ${wallet.id}: ${err.message}`);
                }
            }
        }
    }
};
exports.EvmDepositListenerService = EvmDepositListenerService;
exports.EvmDepositListenerService = EvmDepositListenerService = EvmDepositListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        crypto_config_service_1.CryptoConfigService,
        chain_client_service_1.ChainClientService])
], EvmDepositListenerService);
//# sourceMappingURL=evm-deposit-listener.service.js.map