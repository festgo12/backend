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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatumService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let TatumService = class TatumService {
    configService;
    httpService;
    apiKey;
    baseUrl = 'https://api.tatum.io/v3';
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.apiKey = this.configService.get('TATUM_API_KEY') || '';
    }
    async generateWallet(chain) {
        const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/${chain}/wallet`, {
            headers: { 'x-api-key': this.apiKey },
        }));
        return response.data;
    }
    async generateAddress(chain, xpub, index) {
        const response = await (0, rxjs_1.lastValueFrom)(this.httpService.get(`${this.baseUrl}/${chain}/address/${xpub}/${index}`, {
            headers: { 'x-api-key': this.apiKey },
        }));
        return response.data;
    }
};
exports.TatumService = TatumService;
exports.TatumService = TatumService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], TatumService);
//# sourceMappingURL=tatum.service.js.map