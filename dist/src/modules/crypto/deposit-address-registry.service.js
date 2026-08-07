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
let DepositAddressRegistry = DepositAddressRegistry_1 = class DepositAddressRegistry {
    prisma;
    logger = new common_1.Logger(DepositAddressRegistry_1.name);
    addresses = new Map();
    constructor(prisma) {
        this.prisma = prisma;
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
            const chain = wallet.chain || this.guessChain(wallet.currency);
            this.add(wallet.address, { chain, walletId: wallet.id }, false);
        }
        this.logger.log(`Deposit address registry loaded: ${this.addresses.size} unique addresses, ${wallets.length} wallets`);
    }
    register(address, chain, walletId) {
        this.add(address, { chain, walletId }, true);
    }
    add(address, registration, log) {
        const key = this.keyFor(address, registration.chain);
        const existing = this.addresses.get(key);
        if (existing) {
            if (!existing.some((r) => r.walletId === registration.walletId)) {
                existing.push(registration);
            }
            return;
        }
        this.addresses.set(key, [registration]);
        if (log) {
            this.logger.debug(`Registered deposit address ${address} for wallet ${registration.walletId}`);
        }
    }
    unregister(address, chain, walletId) {
        const key = this.keyFor(address, chain);
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
        return this.addresses.get(this.keyFor(address, chain)) || [];
    }
    has(address, chain) {
        return this.addresses.has(this.keyFor(address, chain));
    }
    addressesForChain(chain) {
        const out = [];
        for (const [key, registrations] of this.addresses.entries()) {
            if (registrations[0]?.chain === chain)
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
    guessChain(currency) {
        return currency === client_1.Currency.BTC ? 'BTC' : 'EVM';
    }
};
exports.DepositAddressRegistry = DepositAddressRegistry;
exports.DepositAddressRegistry = DepositAddressRegistry = DepositAddressRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepositAddressRegistry);
//# sourceMappingURL=deposit-address-registry.service.js.map