"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PlatformService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformService = exports.PLATFORM_EMAIL = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
const client_1 = require("../../generated/client/index.js");
const hd_wallet_service_1 = require("./hd-wallet.service");
const deposit_address_registry_service_1 = require("./deposit-address-registry.service");
const crypto_config_service_1 = require("./crypto-config.service");
const hd_wallet_service_2 = require("./hd-wallet.service");
const crypto = __importStar(require("crypto"));
exports.PLATFORM_EMAIL = 'platform@p2n.app';
function feeWalletChain(currency) {
    return currency === client_1.Currency.BTC ? 'BTC' : 'ETH';
}
function feeWalletPairs(cryptoCurrencies, supportedChains) {
    const pairs = [];
    const evmChains = supportedChains.filter((c) => crypto_config_service_1.EVM_CHAINS.includes(c));
    for (const currency of cryptoCurrencies) {
        if (currency === client_1.Currency.BTC) {
            pairs.push({ currency, chain: 'BTC' });
            continue;
        }
        if (currency === client_1.Currency.ETH) {
            if (evmChains.includes('ETH'))
                pairs.push({ currency, chain: 'ETH' });
            continue;
        }
        if (evmChains.includes('ETH'))
            pairs.push({ currency, chain: 'ETH' });
        if (supportedChains.includes('SOLANA')) {
            pairs.push({ currency, chain: 'SOLANA' });
        }
        if (supportedChains.includes('TRON')) {
            pairs.push({ currency, chain: 'TRON' });
        }
    }
    return pairs;
}
let PlatformService = PlatformService_1 = class PlatformService {
    prisma;
    hdWallet;
    depositRegistry;
    cryptoConfig;
    logger = new common_1.Logger(PlatformService_1.name);
    cryptoCurrencies = [
        client_1.Currency.BTC,
        client_1.Currency.ETH,
        client_1.Currency.USDT,
        client_1.Currency.USDC,
    ];
    pairs;
    constructor(prisma, hdWallet, depositRegistry, cryptoConfig) {
        this.prisma = prisma;
        this.hdWallet = hdWallet;
        this.depositRegistry = depositRegistry;
        this.cryptoConfig = cryptoConfig;
        this.pairs = feeWalletPairs(this.cryptoCurrencies, this.cryptoConfig.supportedChains);
    }
    async onApplicationBootstrap() {
        try {
            await this.ensurePlatformWallets();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to initialise platform wallets: ${message}`);
        }
    }
    async ensurePlatformWallets() {
        const platformUser = await this.prisma.user.upsert({
            where: { email: exports.PLATFORM_EMAIL },
            update: { isSystem: true },
            create: {
                email: exports.PLATFORM_EMAIL,
                passwordHash: crypto.randomBytes(32).toString('hex'),
                role: client_1.Role.SUPER_ADMIN,
                isSystem: true,
            },
        });
        await this.persistMasterXpubs();
        const wallets = [];
        for (const { currency, chain } of this.pairs) {
            let wallet = await this.prisma.wallet.findUnique({
                where: {
                    userId_currency_chain: {
                        userId: platformUser.id,
                        currency,
                        chain,
                    },
                },
            });
            if (!wallet) {
                wallet = await this.prisma.wallet.create({
                    data: { userId: platformUser.id, currency, chain, balance: 0 },
                });
            }
            if (!wallet.address) {
                try {
                    const info = this.feeAddressForChain(chain);
                    wallet = await this.prisma.wallet.update({
                        where: { id: wallet.id },
                        data: {
                            address: info.address,
                            derivationIndex: info.derivationIndex,
                            chain: info.chain,
                        },
                    });
                    this.depositRegistry.register(info.address, info.chain, wallet.id);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to assign fee address for ${currency}/${chain}: ${message}`);
                }
            }
            wallets.push({ currency, chain, id: wallet.id, address: wallet.address });
        }
        this.logger.log(`Platform wallets ready for user ${platformUser.id}`);
        return { userId: platformUser.id, wallets };
    }
    feeAddressForChain(chain) {
        if (chain === 'BTC') {
            return {
                chain: 'BTC',
                address: this.hdWallet.getMasterAddress('BTC'),
                derivationIndex: hd_wallet_service_2.MASTER_WALLET_INDEX,
            };
        }
        if (chain === 'SOLANA') {
            return {
                chain: 'SOLANA',
                address: this.hdWallet.getMasterAddressForChain('SOLANA'),
                derivationIndex: hd_wallet_service_2.MASTER_WALLET_INDEX,
            };
        }
        if (chain === 'TRON') {
            return {
                chain: 'TRON',
                address: this.hdWallet.getMasterAddressForChain('TRON'),
                derivationIndex: hd_wallet_service_2.MASTER_WALLET_INDEX,
            };
        }
        return {
            chain,
            address: this.hdWallet.getMasterAddress('EVM'),
            derivationIndex: hd_wallet_service_2.MASTER_WALLET_INDEX,
        };
    }
    async persistMasterXpubs() {
        const solPubkey = this.cryptoConfig.solMasterXpub ||
            this.hdWallet.getMasterAddressForChain('SOLANA');
        const tronPubkey = this.cryptoConfig.tronMasterXpub ||
            this.hdWallet.getMasterAddressForChain('TRON');
        const xpubs = [
            { key: 'master_xpub_evm', value: this.cryptoConfig.evmMasterXpub },
            { key: 'master_xpub_btc', value: this.cryptoConfig.btcMasterXpub },
            { key: 'master_xpub_sol', value: solPubkey },
            { key: 'master_xpub_tron', value: tronPubkey },
        ];
        for (const entry of xpubs) {
            if (!entry.value)
                continue;
            await this.prisma.platformSetting.upsert({
                where: { key: entry.key },
                update: { value: entry.value },
                create: { key: entry.key, value: entry.value },
            });
        }
    }
    async getPlatformFeeWallet(currency, chain) {
        await this.ensurePlatformWallets();
        const chainValue = chain ?? feeWalletChain(currency);
        return this.prisma.wallet.findUnique({
            where: {
                userId_currency_chain: {
                    userId: await this.getPlatformUserId(),
                    currency,
                    chain: chainValue,
                },
            },
        });
    }
    async getPlatformUserId() {
        const user = await this.prisma.user.findUnique({
            where: { email: exports.PLATFORM_EMAIL },
        });
        if (!user) {
            await this.ensurePlatformWallets();
            const created = await this.prisma.user.findUnique({
                where: { email: exports.PLATFORM_EMAIL },
            });
            return created.id;
        }
        return user.id;
    }
};
exports.PlatformService = PlatformService;
exports.PlatformService = PlatformService = PlatformService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hd_wallet_service_1.HdWalletService,
        deposit_address_registry_service_1.DepositAddressRegistry,
        crypto_config_service_1.CryptoConfigService])
], PlatformService);
//# sourceMappingURL=platform.service.js.map