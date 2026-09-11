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
exports.CreateDisputeDto = exports.DisputeSubjectType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const validate_at_least_one_validator_1 = require("../../../core/validators/validate-at-least-one.validator");
var DisputeSubjectType;
(function (DisputeSubjectType) {
    DisputeSubjectType["ORDER"] = "ORDER";
    DisputeSubjectType["DEPOSIT"] = "DEPOSIT";
    DisputeSubjectType["WITHDRAWAL"] = "WITHDRAWAL";
    DisputeSubjectType["OTHER"] = "OTHER";
    DisputeSubjectType["GIFT_CARD_STORE_ORDER"] = "GIFT_CARD_STORE_ORDER";
})(DisputeSubjectType || (exports.DisputeSubjectType = DisputeSubjectType = {}));
class CreateDisputeDto {
    orderId;
    storeOrderId;
    subjectType;
    reference;
    reason;
    description;
    _subjectLink;
}
exports.CreateDisputeDto = CreateDisputeDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Marketplace order ID to dispute. Required for ORDER disputes; omit for deposit/withdrawal/store order disputes.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Gift Card Store order ID to dispute. Required for GIFT_CARD_STORE_ORDER disputes.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "storeOrderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'What the dispute is about',
        enum: DisputeSubjectType,
        default: DisputeSubjectType.ORDER,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DisputeSubjectType),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "subjectType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference for deposit/withdrawal disputes (e.g. transaction reference or hash)',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reason for dispute', minLength: 10, maxLength: 1000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Detailed description of the issue', maxLength: 5000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.Validate)(validate_at_least_one_validator_1.ValidateAtLeastOne, ['orderId', 'storeOrderId', 'reference']),
    __metadata("design:type", String)
], CreateDisputeDto.prototype, "_subjectLink", void 0);
//# sourceMappingURL=create-dispute.dto.js.map