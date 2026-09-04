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
var DepositAddressRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositAddressRegistry = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("../../generated/client/index.js");
const prisma_service_1 = require("../../core/database/prisma.service");
const crypto_config_service_1 = require("./crypto-config.service");
const address_registration_service_1 = require("./address-registration.service");
let DepositAddressRegistry = DepositAddressRegistry_1 = class DepositAddressRegistry {
    prisma;
    addressRegistration;
    config;
    logger = new common_1.Logger(DepositAddressRegistry_1.name);
    addresses = new Map();
    constructor(prisma, addressRegistration, config) {
        this.prisma = prisma;
        this.addressRegistration = addressRegistration;
        this.config = config;
    }
    async onApplicationBootstrap() {
        await this.rebuild();
    }
    async rebuild() {
        const wallets = await this.prisma.wallet.findMany({
            where: {
                address: { not: null },
                currency: {
                    in: [client_1.Currency.BTC, client_1.Currency.ETH, client_1.Currency.USDT, client_1.Currency.USDC],
                },
            },
            select: { id: true, address: true, chain: true, currency: true },
        });
        this.addresses.clear();
        for (const wallet of wallets) {
            const family = this.familyForChainValue(wallet.chain);
            this.add(wallet.address, { chain: family, walletId: wallet.id }, false);
        }
        this.logger.log(`Deposit address registry loaded: ${this.addresses.size} unique addresses, ${wallets.length} wallets`);
        const synced = this.bootSyncAllChains();
        if (synced > 0) {
            this.logger.log(`Boot-synced addresses across ${synced} chains to webhooks`);
        }
    }
    bootSyncAllChains() {
        const chainsWithAddresses = [];
        for (const chain of this.config.supportedChains) {
            const family = this.config.chainFamily(chain);
            const addrs = this.addressesForFamily(family);
            if (addrs.length > 0) {
                chainsWithAddresses.push(chain);
                void this.pushChainSnapshot(chain, addrs).catch(() => {
                });
            }
        }
        return chainsWithAddresses.length;
    }
    async pushChainSnapshot(chain, addresses) {
        const webhookId = this.config.webhookIdForChain(chain);
        if (!webhookId)
            return;
        const authToken = this.config.authTokenForChain(chain);
        this.logger.log(`Boot-syncing ${addresses.length} addresses to ${chain} webhook...`);
        await this.addressRegistration.replaceAllChainAddresses(chain, addresses, authToken, webhookId);
    }
    register(address, chain, walletId) {
        const family = this.familyForChainValue(chain);
        const isNew = this.add(address, { chain: family, walletId }, true);
        if (isNew) {
            try {
                const canonicalChain = this.canonicalChainForFamily(family);
                this.addressRegistration.registerAddress(address, canonicalChain);
            }
            catch (error) {
                const err = error;
                this.logger.warn(`Failed to register ${family} address ${address} with provider: ${err.message}`);
            }
        }
    }
    add(address, registration, log) {
        const key = this.keyFor(address, registration.chain);
        const existing = this.addresses.get(key);
        if (existing) {
            if (!existing.some((r) => r.walletId === registration.walletId)) {
                existing.push(registration);
                return true;
            }
            return false;
        }
        this.addresses.set(key, [registration]);
        if (log) {
            this.logger.debug(`Registered deposit address ${address} for wallet ${registration.walletId}`);
        }
        return true;
    }
    unregister(address, chain, walletId) {
        const family = this.familyForChainValue(chain);
        const key = this.keyFor(address, family);
        const existing = this.addresses.get(key);
        if (!existing)
            return;
        const remaining = existing.filter((r) => r.walletId !== walletId);
        if (remaining.length > 0) {
            this.addresses.set(key, remaining);
        }
        else {
            this.addresses.delete(key);
        }
    }
    lookup(address, chain) {
        const family = this.familyForChainValue(chain);
        return this.addresses.get(this.keyFor(address, family)) || [];
    }
    has(address, chain) {
        const family = this.familyForChainValue(chain);
        return this.addresses.has(this.keyFor(address, family));
    }
    addressesForChain(chain) {
        return this.addressesForFamily(this.familyForChainValue(chain));
    }
    addressesForFamily(family) {
        const out = [];
        for (const [key, registrations] of this.addresses.entries()) {
            if (registrations[0]?.chain === family)
                out.push(key);
        }
        return out;
    }
    get size() {
        return this.addresses.size;
    }
    keyFor(address, chain) {
        return chain === 'EVM' ? address.toLowerCase() : address;
    }
    familyForChainValue(chain) {
        switch (chain) {
            case 'BTC':
                return 'BTC';
            case 'SOLANA':
                return 'SOLANA';
            case 'TRON':
                return 'TRON';
            case 'EVM':
            case 'ETH':
            case 'BSC':
            case 'POLYGON':
            default:
                return 'EVM';
        }
    }
    canonicalChainForFamily(family) {
        switch (family) {
            case 'SOLANA':
                return 'SOLANA';
            case 'TRON':
                return 'TRON';
            case 'BTC':
                return 'BTC';
            case 'EVM':
            default:
                return 'ETH';
        }
    }
};
exports.DepositAddressRegistry = DepositAddressRegistry;
exports.DepositAddressRegistry = DepositAddressRegistry = DepositAddressRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        address_registration_service_1.AddressRegistrationService,
        crypto_config_service_1.CryptoConfigService])
], DepositAddressRegistry);
//# sourceMappingURL=deposit-address-registry.service.js.map