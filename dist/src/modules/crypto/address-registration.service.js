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
    pendingEvmAddresses = [];
    evmFlushTimer = null;
    static EVM_BATCH_SIZE = 500;
    static EVM_FLUSH_DELAY_MS = 5_000;
    constructor(httpService, config) {
        this.httpService = httpService;
        this.config = config;
    }
    queueEvmAddress(address) {
        const lower = address.toLowerCase();
        if (!this.pendingEvmAddresses.includes(lower)) {
            this.pendingEvmAddresses.push(lower);
        }
        this.scheduleFlush();
    }
    scheduleFlush() {
        if (this.evmFlushTimer)
            return;
        this.evmFlushTimer = setTimeout(() => {
            this.evmFlushTimer = null;
            void this.flushEvmAddresses();
        }, AddressRegistrationService_1.EVM_FLUSH_DELAY_MS);
    }
    async flushEvmAddresses() {
        if (this.pendingEvmAddresses.length === 0)
            return;
        const batch = this.pendingEvmAddresses.splice(0, AddressRegistrationService_1.EVM_BATCH_SIZE);
        try {
            await this.registerEvmAddressesWithAlchemy(batch);
            this.logger.log(`Registered ${batch.length} EVM addresses with Alchemy webhook`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to register EVM addresses with Alchemy: ${err.message}`);
            this.pendingEvmAddresses.unshift(...batch);
        }
        if (this.pendingEvmAddresses.length > 0) {
            this.scheduleFlush();
        }
    }
    async registerEvmAddressesWithAlchemy(addresses) {
        const authToken = this.config.alchemyAuthToken;
        const webhookId = this.config.alchemyWebhookId;
        if (!authToken || !webhookId) {
            this.logger.warn('Alchemy AUTH_TOKEN or WEBHOOK_ID not configured; skipping address registration');
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
    async replaceAllEvmAddresses(addresses) {
        const authToken = this.config.alchemyAuthToken;
        const webhookId = this.config.alchemyWebhookId;
        if (!authToken || !webhookId) {
            this.logger.warn('Alchemy AUTH_TOKEN or WEBHOOK_ID not configured; skipping boot-sync');
            return;
        }
        if (addresses.length === 0) {
            this.logger.debug('No EVM addresses to sync to Alchemy webhook');
            return;
        }
        const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
        for (let i = 0; i < unique.length; i += AddressRegistrationService_1.EVM_BATCH_SIZE) {
            const batch = unique.slice(i, i + AddressRegistrationService_1.EVM_BATCH_SIZE);
            const batchNum = Math.floor(i / AddressRegistrationService_1.EVM_BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(unique.length / AddressRegistrationService_1.EVM_BATCH_SIZE);
            try {
                await (0, rxjs_1.lastValueFrom)(this.httpService.put('https://dashboard.alchemy.com/api/update-webhook-addresses', {
                    webhook_id: webhookId,
                    addresses: batch,
                }, {
                    headers: {
                        'X-Alchemy-Token': authToken,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30_000,
                }));
                this.logger.log(`Boot-synced EVM addresses to Alchemy webhook: batch ${batchNum}/${totalBatches} (${batch.length} addresses)`);
            }
            catch (error) {
                const err = error;
                this.logger.error(`Failed to boot-sync EVM addresses batch ${batchNum}/${totalBatches}: ${err.message}`);
            }
        }
        this.logger.log(`Boot-sync complete: ${unique.length} EVM addresses registered with Alchemy webhook`);
    }
    registerAddress(address, chain) {
        if (chain === 'EVM') {
            this.queueEvmAddress(address);
        }
    }
};
exports.AddressRegistrationService = AddressRegistrationService;
exports.AddressRegistrationService = AddressRegistrationService = AddressRegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        crypto_config_service_1.CryptoConfigService])
], AddressRegistrationService);
//# sourceMappingURL=address-registration.service.js.map