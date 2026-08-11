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
var CryptoConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoConfigService = exports.STABLECOIN_CONTRACTS_TESTNET = exports.STABLECOIN_CONTRACTS_MAINNET = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
exports.STABLECOIN_CONTRACTS_MAINNET = {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};
exports.STABLECOIN_CONTRACTS_TESTNET = {
    USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};
let CryptoConfigService = CryptoConfigService_1 = class CryptoConfigService {
    configService;
    logger = new common_1.Logger(CryptoConfigService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const raw = (this.configService.get('CRYPTO_PROVIDER', 'alchemy') || 'alchemy').toLowerCase();
        if (raw !== 'alchemy') {
            this.logger.warn(`Unsupported CRYPTO_PROVIDER "${raw}": only "alchemy" is available. Falling back to alchemy.`);
        }
        if (!this.evmMasterMnemonic) {
            this.logger.warn('No EVM master mnemonic configured (HD_EVM_MASTER_MNEMONIC); EVM address/private-key derivation will fail.');
        }
        if (!this.btcMasterMnemonic) {
            this.logger.warn('No BTC master mnemonic configured (HD_BTC_MASTER_MNEMONIC); BTC address/private-key derivation will fail.');
        }
    }
    get provider() {
        return 'alchemy';
    }
    get isAlchemy() {
        return true;
    }
    get network() {
        return (this.configService.get('ALCHEMY_NETWORK', 'sepolia') || 'sepolia').toLowerCase();
    }
    get isTestnet() {
        return this.network !== 'mainnet';
    }
    get evmMasterMnemonic() {
        return this.configService.get('HD_EVM_MASTER_MNEMONIC') || null;
    }
    get btcMasterMnemonic() {
        return this.configService.get('HD_BTC_MASTER_MNEMONIC') || null;
    }
    get evmMasterXpub() {
        return this.configService.get('HD_EVM_MASTER_XPUB') || null;
    }
    get btcMasterXpub() {
        return this.configService.get('HD_BTC_MASTER_XPUB') || null;
    }
    get evmDerivationPath() {
        return (this.configService.get('HD_EVM_DERIVATION_PATH', "m/44'/60'/0'/0") || "m/44'/60'/0'/0");
    }
    get btcDerivationPath() {
        return (this.configService.get('HD_BTC_DERIVATION_PATH', "m/84'/0'/0'/0") || "m/84'/0'/0'/0");
    }
    get evmAccountIndex() {
        return Number(this.configService.get('HD_EVM_ACCOUNT', '0'));
    }
    get btcAccountIndex() {
        return Number(this.configService.get('HD_BTC_ACCOUNT', '0'));
    }
    get alchemyEthWsUrl() {
        return this.configService.get('ALCHEMY_ETH_WS_URL') || null;
    }
    get alchemyEthHttpUrl() {
        return this.configService.get('ALCHEMY_ETH_HTTP_URL') || null;
    }
    get alchemyBtcHttpUrl() {
        return this.configService.get('ALCHEMY_BTC_HTTP_URL') || null;
    }
    get mempoolApiUrl() {
        return this.configService.get('MEMPOOL_API_URL') || null;
    }
    get evmConfirmations() {
        return Number(this.configService.get('BLOCK_CONFIRMATIONS_ETH', '12'));
    }
    get btcConfirmations() {
        return Number(this.configService.get('BLOCK_CONFIRMATIONS_BTC', '2'));
    }
    get evmCatchUpMaxBlocks() {
        return Number(this.configService.get('EVM_CATCH_UP_MAX_BLOCKS', '50'));
    }
    get evmCatchUpMinIntervalMs() {
        return Number(this.configService.get('EVM_CATCH_UP_MIN_INTERVAL_MS', '60000'));
    }
    get evmAssetTransferBatchBlocks() {
        return Number(this.configService.get('EVM_ASSET_TRANSFER_BATCH_BLOCKS', '5'));
    }
    get evmAssetTransferBatchMaxMs() {
        return Number(this.configService.get('EVM_ASSET_TRANSFER_BATCH_MAX_MS', '30000'));
    }
    get depositSweepThreshold() {
        return Number(this.configService.get('DEPOSIT_SWEEP_THRESHOLD', '0'));
    }
    getStablecoinContract(currency) {
        const override = this.configService.get(`ALCHEMY_${currency}_CONTRACT`);
        if (override)
            return override;
        return this.isTestnet
            ? exports.STABLECOIN_CONTRACTS_TESTNET[currency] || null
            : exports.STABLECOIN_CONTRACTS_MAINNET[currency] || null;
    }
};
exports.CryptoConfigService = CryptoConfigService;
exports.CryptoConfigService = CryptoConfigService = CryptoConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CryptoConfigService);
//# sourceMappingURL=crypto-config.service.js.map