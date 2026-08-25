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
exports.UpdateFeeConfigDto = exports.CreditTestFundsDto = exports.SweepFeeWalletDto = exports.AdminUpdateAdDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("../../../generated/client/index.js");
const ALLOWED_AD_FIELDS = ['status', 'quantity', 'price', 'minLimit', 'maxLimit', 'paymentMethods', 'description'];
class AdminUpdateAdDto {
    status;
    quantity;
    price;
    minLimit;
    maxLimit;
    paymentMethods;
    description;
}
exports.AdminUpdateAdDto = AdminUpdateAdDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ALLOWED_AD_FIELDS, isArray: true, description: 'Only whitelisted fields are accepted' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(ALLOWED_AD_FIELDS, { each: true }),
    __metadata("design:type", String)
], AdminUpdateAdDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdminUpdateAdDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdminUpdateAdDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdminUpdateAdDto.prototype, "minLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdminUpdateAdDto.prototype, "maxLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], AdminUpdateAdDto.prototype, "paymentMethods", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminUpdateAdDto.prototype, "description", void 0);
class SweepFeeWalletDto {
    address;
    amount;
}
exports.SweepFeeWalletDto = SweepFeeWalletDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Treasury destination address' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SweepFeeWalletDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Amount to sweep (omit for full balance)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SweepFeeWalletDto.prototype, "amount", void 0);
class CreditTestFundsDto {
    email;
    currency;
    amount;
}
exports.CreditTestFundsDto = CreditTestFundsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User email to credit' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreditTestFundsDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.Currency }),
    (0, class_validator_1.IsEnum)(client_1.Currency),
    __metadata("design:type", String)
], CreditTestFundsDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount to credit' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreditTestFundsDto.prototype, "amount", void 0);
class UpdateFeeConfigDto {
    value;
}
exports.UpdateFeeConfigDto = UpdateFeeConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'New fee value' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateFeeConfigDto.prototype, "value", void 0);
//# sourceMappingURL=admin-operations.dto.js.map