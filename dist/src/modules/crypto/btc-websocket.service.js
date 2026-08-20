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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BtcAlchemyWebSocketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BtcAlchemyWebSocketService = void 0;
const common_1 = require("@nestjs/common");
const ws_1 = __importDefault(require("ws"));
const crypto_config_service_1 = require("./crypto-config.service");
const webhook_processor_service_1 = require("./webhook-processor.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
let BtcAlchemyWebSocketService = class BtcAlchemyWebSocketService {
    static { BtcAlchemyWebSocketService_1 = this; }
    cryptoConfig;
    webhookProcessor;
    depositRegistry;
    logger = new common_1.Logger(BtcAlchemyWebSocketService_1.name);
    ws = null;
    monitoredAddresses = [];
    reconnectAttempts = 0;
    reconnectTimer = null;
    isShuttingDown = false;
    subscriptionId = 'sub_btc_1';
    static MAX_BACKOFF_MS = 30_000;
    static INITIAL_BACKOFF_MS = 1_000;
    constructor(cryptoConfig, webhookProcessor, depositRegistry) {
        this.cryptoConfig = cryptoConfig;
        this.webhookProcessor = webhookProcessor;
        this.depositRegistry = depositRegistry;
    }
    onModuleInit() {
        this.monitoredAddresses = this.depositRegistry.addressesForChain('BTC');
        this.logger.log(`BTC WebSocket: loaded ${this.monitoredAddresses.length} monitored addresses from registry`);
        if (this.monitoredAddresses.length > 0) {
            this.connect();
        }
        else {
            this.logger.warn('BTC WebSocket: no BTC addresses in registry; connection deferred until first address is registered');
        }
    }
    connect() {
        const wsUrl = this.cryptoConfig.alchemyBtcWsUrl;
        if (!wsUrl) {
            this.logger.error('ALCHEMY_BTC_WS_URL is not configured; cannot connect');
            return;
        }
        if (this.ws) {
            this.cleanupSocket();
        }
        this.logger.log(`BTC WebSocket: connecting to ${wsUrl}`);
        const ws = new ws_1.default(wsUrl);
        this.ws = ws;
        ws.on('open', () => {
            this.logger.log('BTC WebSocket: connected');
            this.reconnectAttempts = 0;
            this.resubscribe();
        });
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                this.handleMessage(msg);
            }
            catch (error) {
                const err = error;
                this.logger.debug(`BTC WebSocket: failed to parse message: ${err.message}`);
            }
        });
        ws.on('close', (code, reason) => {
            this.logger.warn(`BTC WebSocket: closed (code=${code}, reason=${reason.toString()})`);
            this.ws = null;
            if (!this.isShuttingDown) {
                this.scheduleReconnect();
            }
        });
        ws.on('error', (error) => {
            this.logger.error(`BTC WebSocket: error — ${error.message}`);
        });
    }
    cleanupSocket() {
        if (!this.ws)
            return;
        try {
            this.ws.removeAllListeners();
            if (this.ws.readyState === ws_1.default.OPEN ||
                this.ws.readyState === ws_1.default.CONNECTING) {
                this.ws.close();
            }
        }
        catch {
        }
        this.ws = null;
    }
    scheduleReconnect() {
        if (this.isShuttingDown || this.reconnectTimer)
            return;
        const delay = Math.min(BtcAlchemyWebSocketService_1.INITIAL_BACKOFF_MS *
            Math.pow(2, this.reconnectAttempts), BtcAlchemyWebSocketService_1.MAX_BACKOFF_MS);
        this.reconnectAttempts++;
        this.logger.log(`BTC WebSocket: reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }
    resubscribe() {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN)
            return;
        if (this.monitoredAddresses.length === 0) {
            this.logger.debug('BTC WebSocket: no addresses to subscribe');
            return;
        }
        const payload = {
            id: this.subscriptionId,
            method: 'subscribeAddresses',
            params: {
                addresses: [...this.monitoredAddresses],
                newBlockTxs: true,
            },
        };
        this.ws.send(JSON.stringify(payload));
        this.logger.log(`BTC WebSocket: subscribed to ${this.monitoredAddresses.length} addresses`);
    }
    addAddress(address) {
        if (this.monitoredAddresses.includes(address))
            return;
        this.monitoredAddresses.push(address);
        this.logger.log(`BTC WebSocket: added address ${address} (${this.monitoredAddresses.length} total)`);
        this.resubscribe();
    }
    removeAddress(address) {
        const idx = this.monitoredAddresses.indexOf(address);
        if (idx === -1)
            return;
        this.monitoredAddresses.splice(idx, 1);
        this.logger.log(`BTC WebSocket: removed address ${address} (${this.monitoredAddresses.length} total)`);
        this.resubscribe();
    }
    refreshAll() {
        this.monitoredAddresses = this.depositRegistry.addressesForChain('BTC');
        this.resubscribe();
    }
    handleMessage(msg) {
        if (msg.data?.subscribed === true) {
            this.logger.debug(`BTC WebSocket: subscription confirmed (id=${msg.id})`);
            return;
        }
        if (msg.error) {
            this.logger.error(`BTC WebSocket: subscription error — ${msg.error.message}`);
            return;
        }
        if (msg.data?.tx && msg.data?.address) {
            void this.processTransaction(msg.data.address, msg.data.tx);
        }
    }
    async processTransaction(matchedAddress, tx) {
        try {
            const event = this.normalizeTx(matchedAddress, tx);
            if (!event)
                return;
            await this.webhookProcessor.processBtcEvent(event);
        }
        catch (error) {
            const err = error;
            this.logger.error(`BTC WebSocket: failed to process tx ${tx.txid}: ${err.message}`);
        }
    }
    normalizeTx(matchedAddress, tx) {
        if (!tx || !tx.txid)
            return null;
        const vinAddresses = this.extractAddresses(tx.vin);
        const voutAddresses = this.extractAddresses(tx.vout);
        const isSender = vinAddresses.includes(matchedAddress);
        const isReceiver = voutAddresses.includes(matchedAddress);
        if (!isSender && !isReceiver)
            return null;
        const amountBtc = this.parseBtcAmount(tx.value, tx.vin, tx.vout);
        const blockNumber = tx.blockHeight > 0 ? tx.blockHeight : 0;
        if (isReceiver) {
            const fromAddr = vinAddresses.find((a) => !this.isMonitoredAddress(a)) ||
                vinAddresses[0] ||
                '';
            return {
                provider: 'btc_websocket',
                chain: 'BTC',
                direction: 'INBOUND',
                txHash: tx.txid,
                fromAddress: fromAddr,
                toAddress: matchedAddress,
                asset: 'BTC',
                amount: amountBtc,
                blockNumber,
            };
        }
        const toAddr = voutAddresses.find((a) => !this.isMonitoredAddress(a)) ||
            voutAddresses[0] ||
            '';
        return {
            provider: 'btc_websocket',
            chain: 'BTC',
            direction: 'OUTBOUND',
            txHash: tx.txid,
            fromAddress: matchedAddress,
            toAddress: toAddr,
            asset: 'BTC',
            amount: amountBtc,
            blockNumber,
        };
    }
    extractAddresses(items) {
        const addrs = [];
        for (const item of items) {
            if (Array.isArray(item.addresses)) {
                addrs.push(...item.addresses);
            }
        }
        return addrs;
    }
    isMonitoredAddress(address) {
        return this.monitoredAddresses.includes(address);
    }
    parseBtcAmount(txValue, vin, vout) {
        const parsed = parseFloat(txValue);
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
        const totalVout = vout.reduce((sum, o) => sum + parseFloat(o.value || '0'), 0);
        if (totalVout > 10000) {
            return totalVout / 1e8;
        }
        return totalVout;
    }
    onApplicationShutdown() {
        this.isShuttingDown = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.cleanupSocket();
        this.logger.log('BTC WebSocket: shutdown complete');
    }
};
exports.BtcAlchemyWebSocketService = BtcAlchemyWebSocketService;
exports.BtcAlchemyWebSocketService = BtcAlchemyWebSocketService = BtcAlchemyWebSocketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [crypto_config_service_1.CryptoConfigService,
        webhook_processor_service_1.WebhookProcessorService,
        deposit_address_registry_service_1.DepositAddressRegistry])
], BtcAlchemyWebSocketService);
//# sourceMappingURL=btc-websocket.service.js.map