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
var HdWalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HdWalletService = exports.USER_INDEX_SPACE = exports.USER_INDEX_BASE = exports.MASTER_WALLET_INDEX = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const bip39 = __importStar(require("bip39"));
const bip32_1 = require("bip32");
const ecc = __importStar(require("tiny-secp256k1"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const client_1 = require("../../generated/client/index.js");
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
exports.MASTER_WALLET_INDEX = 0;
exports.USER_INDEX_BASE = 1000;
exports.USER_INDEX_SPACE = 2_000_000;
let HdWalletService = HdWalletService_1 = class HdWalletService {
    prisma;
    config;
    logger = new common_1.Logger(HdWalletService_1.name);
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    chainForCurrency(currency) {
        switch (currency) {
            case client_1.Currency.BTC:
                return 'BTC';
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                return 'EVM';
            default:
                return null;
        }
    }
    isCryptoCurrency(currency) {
        return this.chainForCurrency(currency) !== null;
    }
    indexForUser(userId) {
        let h = 0;
        for (let i = 0; i < userId.length; i++) {
            h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0;
        }
        return exports.USER_INDEX_BASE + (Math.abs(h) % exports.USER_INDEX_SPACE);
    }
    async getOrAssignDepositInfo(userId, currency) {
        const chain = this.chainForCurrency(currency);
        if (!chain) {
            throw new common_1.BadRequestException(`No on-chain deposit address for ${currency}`);
        }
        const existing = await this.prisma.wallet.findFirst({
            where: {
                userId,
                chain,
                address: { not: null },
                derivationIndex: { not: null },
            },
            select: { address: true, derivationIndex: true },
        });
        if (existing) {
            return {
                chain,
                address: existing.address,
                derivationIndex: existing.derivationIndex,
            };
        }
        const index = this.indexForUser(userId);
        const address = this.deriveAddress(currency, index);
        return { chain, address, derivationIndex: index };
    }
    deriveAddress(currency, index) {
        const chain = this.chainForCurrency(currency);
        switch (chain) {
            case 'EVM':
                return this.deriveEvmAddress(index);
            case 'BTC':
                return this.deriveBtcAddress(index);
            default:
                throw new common_1.BadRequestException(`Unsupported currency for address derivation: ${currency}`);
        }
    }
    getMasterAddress(chain) {
        return chain === 'EVM'
            ? this.deriveEvmAddress(exports.MASTER_WALLET_INDEX)
            : this.deriveBtcAddress(exports.MASTER_WALLET_INDEX);
    }
    derivePrivateKey(currency, index) {
        const chain = this.chainForCurrency(currency);
        if (chain === 'EVM') {
            const mnemonic = this.config.evmMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)');
            }
            return this.evmNode(index).privateKey;
        }
        if (chain === 'BTC') {
            const mnemonic = this.config.btcMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)');
            }
            return this.btcNode(index).toWIF();
        }
        throw new common_1.BadRequestException(`Private key derivation not supported for ${currency}`);
    }
    evmNode(index) {
        const mnemonic = this.config.evmMasterMnemonic;
        if (!mnemonic) {
            throw new common_1.InternalServerErrorException('Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)');
        }
        return ethers_1.HDNodeWallet.fromPhrase(mnemonic, '', this.config.evmDerivationPath).deriveChild(index);
    }
    btcNode(index) {
        const mnemonic = this.config.btcMasterMnemonic;
        if (!mnemonic) {
            throw new common_1.InternalServerErrorException('Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)');
        }
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bip32.fromSeed(seed);
        return root.derivePath(this.config.btcDerivationPath).derive(index);
    }
    deriveEvmAddress(index) {
        return this.evmNode(index).address;
    }
    deriveBtcAddress(index) {
        const node = this.btcNode(index);
        const payment = bitcoin.payments.p2wpkh({
            pubkey: node.publicKey,
            network: this.btcNetwork,
        });
        const address = payment.address;
        if (!address) {
            throw new common_1.InternalServerErrorException('Failed to derive BTC deposit address');
        }
        return address;
    }
    get btcNetwork() {
        return this.config.isTestnet
            ? bitcoin.networks.testnet
            : bitcoin.networks.bitcoin;
    }
};
exports.HdWalletService = HdWalletService;
exports.HdWalletService = HdWalletService = HdWalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crypto_config_service_1.CryptoConfigService])
], HdWalletService);
//# sourceMappingURL=hd-wallet.service.js.map