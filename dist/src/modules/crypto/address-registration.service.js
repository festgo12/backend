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
var AddressRegistrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const crypto_config_service_1 = require("./crypto-config.service");
let AddressRegistrationService = class AddressRegistrationService {
    static { AddressRegistrationService_1 = this; }
    httpService;
    config;
    logger = new common_1.Logger(AddressRegistrationService_1.name);
    queues = new Map();
    static BATCH_SIZE = 500;
    static FLUSH_DELAY_MS = 5_000;
    constructor(httpService, config) {
        this.httpService = httpService;
        this.config = config;
    }
    queueFor(chain) {
        let q = this.queues.get(chain);
        if (!q) {
            q = { pending: [], flushTimer: null };
            this.queues.set(chain, q);
        }
        return q;
    }
    queueChainAddress(chain, address) {
        const normalized = this.config.isEvmChain(chain) || chain === 'TRON'
            ? address.toLowerCase()
            : address;
        const queue = this.queueFor(chain);
        if (!queue.pending.includes(normalized)) {
            queue.pending.push(normalized);
        }
        this.scheduleFlush(chain);
    }
    scheduleFlush(chain) {
        const queue = this.queueFor(chain);
        if (queue.flushTimer)
            return;
        queue.flushTimer = setTimeout(() => {
            queue.flushTimer = null;
            void this.flushChainAddresses(chain);
        }, AddressRegistrationService_1.FLUSH_DELAY_MS);
    }
    async flushChainAddresses(chain) {
        const queue = this.queueFor(chain);
        if (queue.pending.length === 0)
            return;
        const batch = queue.pending.splice(0, AddressRegistrationService_1.BATCH_SIZE);
        try {
            await this.registerChainAddressesWithAlchemy(chain, batch);
            this.logger.log(`Registered ${batch.length} ${chain} addresses with Alchemy webhook`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to register ${chain} addresses with Alchemy: ${err.message}`);
            queue.pending.unshift(...batch);
        }
        if (queue.pending.length > 0) {
            this.scheduleFlush(chain);
        }
    }
    async registerChainAddressesWithAlchemy(chain, addresses) {
        const authToken = this.config.authTokenForChain(chain);
        const webhookId = this.config.webhookIdForChain(chain);
        if (!authToken || !webhookId) {
            this.logger.warn(`Alchemy AUTH_TOKEN or WEBHOOK_ID not configured for ${chain}; skipping address registration`);
            return;
        }
        await (0, rxjs_1.lastValueFrom)(this.httpService.patch('https://dashboard.alchemy.com/api/update-webhook-addresses', {
            webhook_id: webhookId,
            addresses_to_add: addresses,
            addresses_to_remove: [],
        }, {
            headers: {
                'X-Alchemy-Token': authToken,
                'Content-Type': 'application/json',
            },
            timeout: 15_000,
        }));
    }
    async replaceAllChainAddresses(chain, addresses, authToken, webhookId) {
        const token = authToken ?? this.config.authTokenForChain(chain);
        const id = webhookId ?? this.config.webhookIdForChain(chain);
        if (!token || !id) {
            this.logger.warn(`Alchemy AUTH_TOKEN or WEBHOOK_ID not configured for ${chain}; skipping boot-sync`);
            return;
        }
        if (addresses.length === 0) {
            this.logger.debug(`No ${chain} addresses to sync to Alchemy webhook`);
            return;
        }
        const normalized = addresses.map((a) => this.config.isEvmChain(chain) || chain === 'TRON' ? a.toLowerCase() : a);
        const unique = [...new Set(normalized)];
        for (let i = 0; i < unique.length; i += AddressRegistrationService_1.BATCH_SIZE) {
            const batch = unique.slice(i, i + AddressRegistrationService_1.BATCH_SIZE);
            const batchNum = Math.floor(i / AddressRegistrationService_1.BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(unique.length / AddressRegistrationService_1.BATCH_SIZE);
            try {
                await (0, rxjs_1.lastValueFrom)(this.httpService.put('https://dashboard.alchemy.com/api/update-webhook-addresses', {
                    webhook_id: id,
                    addresses: batch,
                }, {
                    headers: {
                        'X-Alchemy-Token': token,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30_000,
                }));
                this.logger.log(`Boot-synced ${chain} addresses to Alchemy webhook: batch ${batchNum}/${totalBatches} (${batch.length} addresses)`);
            }
            catch (error) {
                const err = error;
                this.logger.error(`Failed to boot-sync ${chain} addresses batch ${batchNum}/${totalBatches}: ${err.message}`);
            }
        }
        this.logger.log(`Boot-sync complete: ${unique.length} ${chain} addresses registered with Alchemy webhook`);
    }
    registerAddress(address, chain) {
        if (chain === 'BTC')
            return;
        this.queueChainAddress(chain, address);
    }
    queueEvmAddress(address) {
        this.queueChainAddress('ETH', address);
    }
    replaceAllEvmAddresses(addresses) {
        return this.replaceAllChainAddresses('ETH', addresses);
    }
};
exports.AddressRegistrationService = AddressRegistrationService;
exports.AddressRegistrationService = AddressRegistrationService = AddressRegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        crypto_config_service_1.CryptoConfigService])
], AddressRegistrationService);
//# sourceMappingURL=address-registration.service.js.map