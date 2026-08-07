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
const crypto_config_service_1 = require("./crypto-config.service");
const client_1 = require("../../generated/client/index.js");
const TRANSFER_TOPIC = (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)('Transfer(address,address,uint256)'));
const STABLECOIN_DECIMALS = 6;
const RECENT_HASHES_MAX = 2048;
const CATCH_UP_MAX_BLOCKS = 200;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;
let EvmDepositListenerService = EvmDepositListenerService_1 = class EvmDepositListenerService {
    prisma;
    walletService;
    depositRegistry;
    config;
    logger = new common_1.Logger(EvmDepositListenerService_1.name);
    provider = null;
    connected = false;
    lastConnectedAt = null;
    lastError = null;
    depositsDetected = 0;
    catchUpRuns = 0;
    latestBlock = null;
    reconnectTimer = null;
    reconnectAttempts = 0;
    connecting = false;
    processingBlock = false;
    pendingBlocks = new Set();
    recentHashes = new Map();
    cursorLastBlock = 0;
    cursorLastBlockHash = null;
    constructor(prisma, walletService, depositRegistry, config) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.depositRegistry = depositRegistry;
        this.config = config;
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
                void this.drainBlocks();
            });
            await this.subscribeTokens(provider);
            await provider.getBlockNumber();
            this.connected = true;
            this.lastConnectedAt = new Date();
            this.lastError = null;
            this.reconnectAttempts = 0;
            this.logger.log('EVM WebSocket connected; listening for deposits');
            await this.catchUp();
            const latest = await provider.getBlockNumber();
            await this.finalizePendingDeposits(latest - this.config.evmConfirmations + 1);
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
    teardown(clearReconnect = true) {
        if (clearReconnect && this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
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
        if (log.removed || !log.topics?.[2])
            return;
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
    async drainBlocks() {
        if (this.processingBlock)
            return;
        this.processingBlock = true;
        try {
            while (this.pendingBlocks.size > 0) {
                const next = Math.min(...this.pendingBlocks);
                this.pendingBlocks.delete(next);
                await this.handleBlock(next);
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`EVM block handler failed: ${err.message}`);
        }
        finally {
            this.processingBlock = false;
        }
    }
    async handleBlock(blockNumber) {
        const provider = this.provider;
        if (!provider)
            return;
        this.latestBlock = blockNumber;
        const required = this.config.evmConfirmations;
        const maxFrom = blockNumber - required + 1;
        if (maxFrom > 0) {
            await this.finalizePendingDeposits(maxFrom);
        }
        const addresses = this.depositRegistry.addressesForChain('EVM');
        if (addresses.length === 0)
            return;
        const block = await provider.getBlock(blockNumber, true);
        if (!block)
            return;
        if (block.hash)
            this.recentHashes.set(blockNumber, block.hash);
        if (this.recentHashes.size > RECENT_HASHES_MAX) {
            const oldest = Math.min(...this.recentHashes.keys());
            this.recentHashes.delete(oldest);
        }
        const prevHash = this.recentHashes.get(blockNumber - 1);
        const boundaryHash = this.recentHashes.get(maxFrom);
        const reorged = (prevHash && block.parentHash !== prevHash) ||
            (this.cursorLastBlockHash &&
                boundaryHash &&
                boundaryHash !== this.cursorLastBlockHash);
        if (reorged) {
            this.logger.warn(`EVM re-org detected near block ${blockNumber}; rewinding for catch-up`);
            await this.rewindForCatchUp(maxFrom);
            await this.catchUp();
            return;
        }
        const addressSet = new Set(addresses.map((a) => a.toLowerCase()));
        const txs = block.prefetchedTransactions;
        for (const tx of txs) {
            if (!tx.to || !addressSet.has(tx.to.toLowerCase()))
                continue;
            const amount = Number((0, ethers_1.formatEther)(tx.value));
            if (!Number.isFinite(amount) || amount <= 0)
                continue;
            await this.recordPending({
                address: tx.to.toLowerCase(),
                currency: client_1.Currency.ETH,
                amount,
                txHash: tx.hash,
                sourceAddress: tx.from || null,
                blockNumber,
            });
        }
        if (maxFrom > this.cursorLastBlock) {
            await this.prisma.chainCursor.upsert({
                where: { chain: 'EVM' },
                update: { lastBlock: maxFrom, lastBlockHash: boundaryHash ?? null },
                create: {
                    chain: 'EVM',
                    lastBlock: maxFrom,
                    lastBlockHash: boundaryHash ?? null,
                },
            });
            this.cursorLastBlock = maxFrom;
            this.cursorLastBlockHash = boundaryHash ?? null;
        }
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
        if (maxFrom - from + 1 > CATCH_UP_MAX_BLOCKS) {
            from = maxFrom - CATCH_UP_MAX_BLOCKS + 1;
            this.logger.warn(`EVM catch-up gap exceeds ${CATCH_UP_MAX_BLOCKS} blocks; scanning the most recent ${CATCH_UP_MAX_BLOCKS}`);
        }
        const addressSet = new Set(addresses.map((a) => a.toLowerCase()));
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
            const logs = await provider.getLogs({
                fromBlock: from,
                toBlock: maxFrom,
                address: address.toLowerCase(),
                topics: [TRANSFER_TOPIC],
            });
            for (const log of logs) {
                if (log.removed || !log.topics?.[2])
                    continue;
                const to = '0x' + log.topics[2].slice(26).toLowerCase();
                if (!addressSet.has(to))
                    continue;
                const amount = Number((0, ethers_1.formatUnits)(BigInt(log.data), STABLECOIN_DECIMALS));
                if (!Number.isFinite(amount) || amount <= 0)
                    continue;
                await this.recordPending({
                    address: to,
                    currency,
                    amount,
                    txHash: log.transactionHash,
                    sourceAddress: log.topics[1]
                        ? '0x' + log.topics[1].slice(26).toLowerCase()
                        : null,
                    blockNumber: log.blockNumber,
                });
            }
        }
        for (let b = from; b <= maxFrom; b++) {
            const block = await provider.getBlock(b, true);
            if (!block)
                continue;
            const txs = block.prefetchedTransactions;
            for (const tx of txs) {
                if (!tx.to || !addressSet.has(tx.to.toLowerCase()))
                    continue;
                const amount = Number((0, ethers_1.formatEther)(tx.value));
                if (!Number.isFinite(amount) || amount <= 0)
                    continue;
                await this.recordPending({
                    address: tx.to.toLowerCase(),
                    currency: client_1.Currency.ETH,
                    amount,
                    txHash: tx.hash,
                    sourceAddress: tx.from || null,
                    blockNumber: b,
                });
            }
        }
        await this.prisma.chainCursor.upsert({
            where: { chain: 'EVM' },
            update: { lastBlock: maxFrom },
            create: { chain: 'EVM', lastBlock: maxFrom, lastBlockHash: null },
        });
        this.catchUpRuns += 1;
        this.logger.log(`EVM catch-up complete: scanned blocks ${from}..${maxFrom}`);
    }
    async rewindForCatchUp(maxFrom) {
        this.cursorLastBlock = 0;
        this.cursorLastBlockHash = null;
        this.recentHashes.clear();
        await this.prisma.chainCursor.upsert({
            where: { chain: 'EVM' },
            update: { lastBlock: Math.max(0, maxFrom - 1) },
            create: {
                chain: 'EVM',
                lastBlock: Math.max(0, maxFrom - 1),
                lastBlockHash: null,
            },
        });
    }
    async finalizePendingDeposits(maxFrom) {
        const provider = this.provider;
        if (!provider || maxFrom < 1)
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
            if (!receipt || receipt.blockNumber !== blockNumber)
                continue;
            await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
                confirmations: maxFrom - blockNumber + 1,
                completedAt: new Date().toISOString(),
            });
            this.logger.log(`Deposit finalized: ${tx.amount.toNumber()} ${meta.asset ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`);
        }
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
        crypto_config_service_1.CryptoConfigService])
], EvmDepositListenerService);
//# sourceMappingURL=evm-deposit-listener.service.js.map