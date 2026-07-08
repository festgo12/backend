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
var PaystackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const crypto = __importStar(require("crypto"));
let PaystackService = PaystackService_1 = class PaystackService {
    configService;
    httpService;
    secretKey;
    baseUrl = 'https://api.paystack.co';
    logger = new common_1.Logger(PaystackService_1.name);
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY') || '';
    }
    async initializeTransaction(email, amount, reference, metadata) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/transaction/initialize`, {
                email,
                amount: Math.round(amount * 100),
                reference,
                callback_url: this.configService.get('PAYSTACK_CALLBACK_URL') || 'https://standard.paystack.co/close',
                metadata,
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            this.logger.error(`Paystack initializeTransaction error: ${errorMessage}`, error.stack);
            throw new Error(`Paystack initialization failed: ${errorMessage}`);
        }
    }
    async verifyTransaction(reference) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Paystack verifyTransaction error: ${error.message}`, error.stack);
            throw error;
        }
    }
    async listBanks() {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/bank`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Paystack listBanks error: ${error.message}`, error.stack);
            throw error;
        }
    }
    async verifyAccountNumber(accountNumber, bankCode) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            }));
            return response.data;
        }
        catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            this.logger.error(`Paystack verifyAccountNumber error: ${errorMessage}`, error.stack);
            throw new common_1.BadRequestException(`Account verification failed: ${errorMessage}`);
        }
    }
    async createTransferRecipient(name, accountNumber, bankCode) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/transferrecipient`, {
                type: 'nuban',
                name,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: 'NGN',
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Paystack createTransferRecipient error: ${error.message}`, error.stack);
            throw error;
        }
    }
    async initiateTransfer(amount, recipient, reason, reference) {
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.baseUrl}/transfer`, {
                source: 'balance',
                amount: Math.round(amount * 100),
                recipient,
                reason,
                reference,
            }, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            this.logger.error(`Paystack initiateTransfer error: ${error.message}`, error.stack);
            throw error;
        }
    }
    verifySignature(payload, signature) {
        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');
        return hash === signature;
    }
};
exports.PaystackService = PaystackService;
exports.PaystackService = PaystackService = PaystackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], PaystackService);
//# sourceMappingURL=paystack.service.js.map