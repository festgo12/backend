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
var TatumRiskService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumRiskService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
let TatumRiskService = TatumRiskService_1 = class TatumRiskService {
    configService;
    httpService;
    logger = new common_1.Logger(TatumRiskService_1.name);
    apiKey;
    baseUrl = 'https://api.tatum.io/v3';
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    async screenAddress(address, chain) {
        try {
            this.logger.log(`Screening address: ${address} on ${chain}`);
            return { isSafe: true, riskScore: 0 };
        }
        catch (error) {
            this.logger.error(`Risk screening failed for ${address}: ${error.message}`);
            return { isSafe: false, riskScore: 100 };
        }
    }
    async screenTransaction(txData) {
        return true;
    }
};
exports.TatumRiskService = TatumRiskService;
exports.TatumRiskService = TatumRiskService = TatumRiskService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], TatumRiskService);
//# sourceMappingURL=tatum-risk.service.js.map