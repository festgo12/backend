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
exports.CryptoConfigService = exports.EVM_CHAINS = exports.STABLECOIN_MINTS_SOLANA = exports.STABLECOIN_CONTRACTS_BY_CHAIN = exports.STABLECOIN_CONTRACTS_TESTNET = exports.STABLECOIN_CONTRACTS_MAINNET = void 0;
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
exports.STABLECOIN_CONTRACTS_BY_CHAIN = {
    BSC: {
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    POLYGON: {
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791BcA1f2de4661ED88A30C99A7a9449Aa84174',
    },
    TRON: {
        USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    },
};
exports.STABLECOIN_MINTS_SOLANA = {
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};
exports.EVM_CHAINS = ['ETH', 'BSC', 'POLYGON'];
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
        if (!this.solMasterMnemonic) {
            this.logger.warn('No Solana master mnemonic configured (HD_SOL_MASTER_MNEMONIC); Solana address/private-key derivation will fail.');
        }
        if (!this.tronMasterMnemonic) {
            this.logger.warn('No TRON master mnemonic configured (HD_TRON_MASTER_MNEMONIC); TRON address/private-key derivation will fail.');
        }
        if (!this.alchemySigningKey) {
            this.logger.warn('ALCHEMY_SIGNING_KEY is not set; Alchemy webhook signature verification will fail.');
        }
    }
    get supportedChains() {
        return ['ETH', 'BSC', 'POLYGON', 'SOLANA', 'TRON'];
    }
    chainFamily(chain) {
        switch (chain) {
            case 'EVM':
            case 'ETH':
            case 'BSC':
            case 'POLYGON':
                return 'EVM';
            case 'SOLANA':
                return 'SOLANA';
            case 'TRON':
                return 'TRON';
            default:
                return 'BTC';
        }
    }
    isEvmChain(chain) {
        return this.chainFamily(chain) === 'EVM';
    }
    networkForChain(chain) {
        const suffix = this.isTestnet ? 'testnet' : 'mainnet';
        switch (chain) {
            case 'ETH':
                return this.isTestnet ? 'eth-sepolia' : 'eth-mainnet';
            case 'BSC':
                return this.isTestnet ? 'bsc-sapolia' : 'bsc-mainnet';
            case 'POLYGON':
                return this.isTestnet ? 'polygon-amoy' : 'polygon-mainnet';
            case 'SOLANA':
                return suffix;
            case 'TRON':
                return this.isTestnet ? 'tron-shasta' : 'tron-mainnet';
        }
    }
    webhookNetworkForChain(chain) {
        switch (chain) {
            case 'ETH':
                return this.isTestnet ? 'ETH_SEPOLIA' : 'ETH_MAINNET';
            case 'BSC':
                return this.isTestnet ? 'BSC_TESTNET' : 'BSC_MAINNET';
            case 'POLYGON':
                return this.isTestnet ? 'MATIC_AMOY' : 'MATIC_MAINNET';
            case 'SOLANA':
                return this.isTestnet ? 'SOLANA_DEVNET' : 'SOLANA_MAINNET';
            case 'TRON':
                return this.isTestnet ? 'TRON_SHASTA' : 'TRON_MAINNET';
        }
    }
    chainFromWebhookNetwork(network) {
        const n = (network || '').toUpperCase();
        switch (n) {
            case 'ETH_MAINNET':
            case 'ETH_SEPOLIA':
            case 'ETH_SEPOLIA_AMOY':
                return 'ETH';
            case 'BSC_MAINNET':
            case 'BSC_TESTNET':
                return 'BSC';
            case 'MATIC_MAINNET':
            case 'MATIC_AMOY':
            case 'POLYGON_MAINNET':
            case 'POLYGON_AMOY':
                return 'POLYGON';
            case 'SOLANA_MAINNET':
            case 'SOLANA_DEVNET':
                return 'SOLANA';
            case 'TRON_MAINNET':
            case 'TRON_SHASTA':
                return 'TRON';
            default:
                return null;
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
    get solMasterMnemonic() {
        return this.configService.get('HD_SOL_MASTER_MNEMONIC') || null;
    }
    get solMasterXpub() {
        return this.configService.get('HD_SOL_MASTER_XPUB') || null;
    }
    get solDerivationPath() {
        return (this.configService.get('HD_SOL_DERIVATION_PATH', "m/44'/501'/0'/0'") ||
            "m/44'/501'/0'/0'");
    }
    get solAccountIndex() {
        return Number(this.configService.get('HD_SOL_ACCOUNT', '0'));
    }
    get tronMasterMnemonic() {
        return this.configService.get('HD_TRON_MASTER_MNEMONIC') || null;
    }
    get tronMasterXpub() {
        return this.configService.get('HD_TRON_MASTER_XPUB') || null;
    }
    get tronDerivationPath() {
        return (this.configService.get('HD_TRON_DERIVATION_PATH', "m/44'/195'/0'/0") ||
            "m/44'/195'/0'/0");
    }
    get tronAccountIndex() {
        return Number(this.configService.get('HD_TRON_ACCOUNT', '0'));
    }
    get alchemyEthHttpUrl() {
        return this.configService.get('ALCHEMY_ETH_HTTP_URL') || null;
    }
    get alchemySigningKey() {
        return this.configService.get('ALCHEMY_SIGNING_KEY') || null;
    }
    get alchemyAuthToken() {
        return this.configService.get('ALCHEMY_AUTH_TOKEN') || null;
    }
    get alchemyWebhookId() {
        return this.configService.get('ALCHEMY_WEBHOOK_ID') || null;
    }
    httpUrlForChain(chain) {
        const value = this.configService.get(`ALCHEMY_${chain}_HTTP_URL`);
        if (value)
            return value;
        if (chain === 'ETH')
            return this.alchemyEthHttpUrl;
        return null;
    }
    webhookIdForChain(chain) {
        const value = this.configService.get(`ALCHEMY_${chain}_WEBHOOK_ID`);
        if (value)
            return value;
        if (chain === 'ETH')
            return this.alchemyWebhookId;
        return null;
    }
    authTokenForChain(chain) {
        const value = this.configService.get(`ALCHEMY_${chain}_AUTH_TOKEN`);
        if (value)
            return value;
        if (chain === 'ETH')
            return this.alchemyAuthToken;
        return null;
    }
    signingKeyForChain(chain) {
        const key = this.configService.get(`ALCHEMY_${chain}_SIGNING_KEY`);
        if (key)
            return key;
        return this.alchemySigningKey;
    }
    allSigningKeys() {
        const keys = new Set();
        for (const chain of [...this.supportedChains, '']) {
            const key = chain === '' ? this.alchemySigningKey : this.signingKeyForChain(chain);
            if (key)
                keys.add(key);
        }
        return [...keys];
    }
    get alchemyBtcHttpUrl() {
        return this.configService.get('ALCHEMY_BTC_HTTP_URL') || null;
    }
    get alchemyBtcWsUrl() {
        return this.configService.get('ALCHEMY_BTC_WS_URL') || null;
    }
    get evmConfirmations() {
        return Number(this.configService.get('BLOCK_CONFIRMATIONS_ETH', '12'));
    }
    get btcConfirmations() {
        return Number(this.configService.get('BLOCK_CONFIRMATIONS_BTC', '2'));
    }
    confirmationsFor(chain) {
        const key = `BLOCK_CONFIRMATIONS_${chain}`;
        const configured = this.configService.get(key);
        if (configured)
            return Number(configured);
        switch (chain) {
            case 'ETH':
                return 12;
            case 'BSC':
                return 15;
            case 'POLYGON':
                return 128;
            case 'SOLANA':
                return 32;
            case 'TRON':
                return 19;
            default:
                return 2;
        }
    }
    get depositSweepThreshold() {
        return Number(this.configService.get('DEPOSIT_SWEEP_THRESHOLD', '0'));
    }
    get reconciliationCron() {
        return (this.configService.get('RECONCILIATION_CRON') || '0 */8 * * *');
    }
    get tronPollCronSchedule() {
        return (this.configService.get('TRON_POLL_CRON_SCHEDULE') || '0 */6 * * *');
    }
    getStablecoinContractFor(chain, currency) {
        const upper = (currency || '').toUpperCase();
        if (chain === 'SOLANA') {
            return exports.STABLECOIN_MINTS_SOLANA[upper] || null;
        }
        const overrideKey = `ALCHEMY_${chain}_${upper}_CONTRACT`;
        const override = this.configService.get(overrideKey);
        if (override)
            return override;
        const byChain = exports.STABLECOIN_CONTRACTS_BY_CHAIN[chain];
        if (byChain && byChain[upper])
            return byChain[upper];
        if (this.isEvmChain(chain)) {
            return this.getStablecoinContract(upper);
        }
        return null;
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