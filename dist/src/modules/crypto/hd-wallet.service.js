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
exports.HdWalletService = exports.USER_INDEX_BASE = exports.MASTER_WALLET_INDEX = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const bip39 = __importStar(require("bip39"));
const bip32_1 = require("bip32");
const ecc = __importStar(require("tiny-secp256k1"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bs58_1 = require("bs58");
const web3_js_1 = require("@solana/web3.js");
const ed25519_hd_key_1 = require("ed25519-hd-key");
const client_1 = require("../../generated/client/index.js");
const crypto = __importStar(require("crypto"));
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const TRON_ADDRESS_PREFIX = 0x41;
const SOL_DERIVATION_PREFIX = "m/44'/501'";
exports.MASTER_WALLET_INDEX = 0;
exports.USER_INDEX_BASE = 1000;
let HdWalletService = HdWalletService_1 = class HdWalletService {
    prisma;
    config;
    logger = new common_1.Logger(HdWalletService_1.name);
    cachedBtcSeed = null;
    cachedEvmRoot = null;
    cachedTronRoot = null;
    cachedSolSeed = null;
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
    familyForCurrency(currency) {
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
    defaultChainForCurrency(currency) {
        switch (currency) {
            case client_1.Currency.ETH:
            case client_1.Currency.USDT:
            case client_1.Currency.USDC:
                return 'ETH';
            default:
                return null;
        }
    }
    ensureSeedCache() {
        if (!this.cachedBtcSeed) {
            const mnemonic = this.config.btcMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing BTC master mnemonic (HD_BTC_MASTER_MNEMONIC)');
            }
            this.cachedBtcSeed = bip39.mnemonicToSeedSync(mnemonic);
            this.logger.log('BTC HD seed cached');
        }
        if (!this.cachedEvmRoot) {
            const mnemonic = this.config.evmMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing EVM master mnemonic (HD_EVM_MASTER_MNEMONIC)');
            }
            this.cachedEvmRoot = ethers_1.HDNodeWallet.fromPhrase(mnemonic, '', this.config.evmDerivationPath);
            this.logger.log('EVM HD root cached');
        }
        if (!this.cachedTronRoot) {
            const mnemonic = this.config.tronMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing TRON master mnemonic (HD_TRON_MASTER_MNEMONIC)');
            }
            this.cachedTronRoot = ethers_1.HDNodeWallet.fromPhrase(mnemonic, '', this.config.tronDerivationPath);
            this.logger.log('TRON HD root cached');
        }
        if (!this.cachedSolSeed) {
            const mnemonic = this.config.solMasterMnemonic;
            if (!mnemonic) {
                throw new common_1.InternalServerErrorException('Missing Solana master mnemonic (HD_SOL_MASTER_MNEMONIC)');
            }
            this.cachedSolSeed = bip39.mnemonicToSeedSync(mnemonic);
            this.logger.log('Solana HD seed cached');
        }
    }
    async getNextIndexForUser() {
        const result = await this.prisma.$transaction(async (tx) => {
            const counter = await tx.platformSetting.findUnique({
                where: { key: 'hd_next_derivation_index' },
            });
            const nextIndex = counter ? Number(counter.value) + 1 : exports.USER_INDEX_BASE;
            await tx.platformSetting.upsert({
                where: { key: 'hd_next_derivation_index' },
                update: { value: String(nextIndex) },
                create: { key: 'hd_next_derivation_index', value: String(nextIndex) },
            });
            return nextIndex;
        });
        return result;
    }
    async indexForUser(userId, chain) {
        const existing = await this.prisma.wallet.findFirst({
            where: {
                userId,
                ...(chain ? { chain } : {}),
                derivationIndex: { not: null },
            },
            select: { derivationIndex: true },
        });
        if (existing && existing.derivationIndex !== null) {
            return existing.derivationIndex;
        }
        return this.getNextIndexForUser();
    }
    async getOrAssignDepositInfo(userId, currency, chain) {
        const family = this.familyForCurrency(currency);
        if (!family) {
            throw new common_1.BadRequestException(`No on-chain deposit address for ${currency}`);
        }
        if (family === 'BTC') {
            return this.getOrAssignBtcDepositInfo(userId);
        }
        const targetChain = chain ?? this.defaultChainForCurrency(currency);
        if (!targetChain) {
            throw new common_1.BadRequestException(`No on-chain deposit address for ${currency}`);
        }
        if (this.config.isEvmChain(targetChain)) {
            const existing = await this.prisma.wallet.findFirst({
                where: {
                    userId,
                    chain: { in: ['ETH', 'BSC', 'POLYGON', 'EVM'] },
                    address: { not: null },
                    derivationIndex: { not: null },
                },
                select: { address: true, derivationIndex: true },
            });
            if (existing) {
                return {
                    chain: targetChain,
                    address: existing.address,
                    derivationIndex: existing.derivationIndex,
                };
            }
            const index = await this.getNextIndexForUser();
            const address = this.deriveAddressForChain(targetChain, index);
            return { chain: targetChain, address, derivationIndex: index };
        }
        const existing = await this.prisma.wallet.findFirst({
            where: {
                userId,
                chain: targetChain,
                address: { not: null },
                derivationIndex: { not: null },
            },
            select: { address: true, derivationIndex: true },
        });
        if (existing) {
            return {
                chain: targetChain,
                address: existing.address,
                derivationIndex: existing.derivationIndex,
            };
        }
        const index = await this.indexForUser(userId, targetChain);
        const address = this.deriveAddressForChain(targetChain, index);
        return { chain: targetChain, address, derivationIndex: index };
    }
    async getOrAssignBtcDepositInfo(userId) {
        const existing = await this.prisma.wallet.findFirst({
            where: {
                userId,
                chain: 'BTC',
                address: { not: null },
                derivationIndex: { not: null },
            },
            select: { address: true, derivationIndex: true },
        });
        if (existing) {
            return {
                chain: 'BTC',
                address: existing.address,
                derivationIndex: existing.derivationIndex,
            };
        }
        const index = await this.indexForUser(userId, 'BTC');
        const address = this.deriveBtcAddress(index);
        return { chain: 'BTC', address, derivationIndex: index };
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
    deriveAddressForChain(chain, index) {
        switch (this.config.chainFamily(chain)) {
            case 'EVM':
                return this.deriveEvmAddress(index);
            case 'SOLANA':
                return this.deriveSolanaAddress(index);
            case 'TRON':
                return this.deriveTronAddress(index);
            case 'BTC':
                return this.deriveBtcAddress(index);
        }
    }
    getMasterAddress(chain) {
        switch (chain) {
            case 'EVM':
                return this.deriveEvmAddress(exports.MASTER_WALLET_INDEX);
            case 'BTC':
                return this.deriveBtcAddress(exports.MASTER_WALLET_INDEX);
            default:
                throw new common_1.BadRequestException('Unknown chain kind');
        }
    }
    getMasterAddressForChain(chain) {
        return this.deriveAddressForChain(chain, exports.MASTER_WALLET_INDEX);
    }
    derivePrivateKey(currency, index) {
        const chain = this.chainForCurrency(currency);
        if (chain === 'EVM') {
            this.ensureSeedCache();
            return this.evmNode(index).privateKey;
        }
        if (chain === 'BTC') {
            this.ensureSeedCache();
            return this.btcNode(index).toWIF();
        }
        throw new common_1.BadRequestException(`Private key derivation not supported for ${currency}`);
    }
    derivePrivateKeyForChain(chain, index) {
        switch (this.config.chainFamily(chain)) {
            case 'EVM':
                this.ensureSeedCache();
                return this.evmNode(index).privateKey;
            case 'TRON':
                this.ensureSeedCache();
                return this.tronNode(index).privateKey;
            case 'SOLANA':
                this.ensureSeedCache();
                return this.solSeedFor(index).toString('hex');
            case 'BTC':
                this.ensureSeedCache();
                return this.btcNode(index).toWIF();
        }
    }
    evmNode(index) {
        this.ensureSeedCache();
        return this.cachedEvmRoot.deriveChild(index);
    }
    tronNode(index) {
        this.ensureSeedCache();
        return this.cachedTronRoot.deriveChild(index);
    }
    btcNode(index) {
        this.ensureSeedCache();
        const root = bip32.fromSeed(this.cachedBtcSeed);
        return root.derivePath(this.config.btcDerivationPath).derive(index);
    }
    solSeedFor(index) {
        this.ensureSeedCache();
        const derivedPath = `${SOL_DERIVATION_PREFIX}/${this.config.solAccountIndex}'/0'/${index}'`;
        return Buffer.from((0, ed25519_hd_key_1.derivePath)(derivedPath, this.cachedSolSeed.toString('hex')).key);
    }
    solKeypair(index) {
        return web3_js_1.Keypair.fromSeed(this.solSeedFor(index));
    }
    deriveEvmAddress(index) {
        return this.evmNode(index).address;
    }
    deriveSolanaAddress(index) {
        return this.solKeypair(index).publicKey.toBase58();
    }
    deriveTronAddress(index) {
        const evmAddress = this.tronNode(index).address.toLowerCase();
        const body = Buffer.concat([
            Buffer.from([TRON_ADDRESS_PREFIX]),
            Buffer.from(evmAddress.replace(/^0x/, ''), 'hex'),
        ]);
        return this.base58Check(body);
    }
    base58Check(payload) {
        const hash1 = crypto.createHash('sha256').update(payload).digest();
        const hash2 = crypto.createHash('sha256').update(hash1).digest();
        const checksum = hash2.subarray(0, 4);
        return (0, bs58_1.encode)(Buffer.concat([payload, checksum]));
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