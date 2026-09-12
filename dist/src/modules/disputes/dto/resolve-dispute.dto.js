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
exports.ResolveDisputeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("../../../generated/client/index.js");
class ResolveDisputeDto {
    resolution;
    outcome = client_1.DisputeStatus.RESOLVED;
}
exports.ResolveDisputeDto = ResolveDisputeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Resolution details', minLength: 10, maxLength: 5000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], ResolveDisputeDto.prototype, "resolution", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: [client_1.DisputeStatus.RESOLVED, client_1.DisputeStatus.REJECTED],
        description: 'Outcome status (RESOLVED or REJECTED)',
        default: client_1.DisputeStatus.RESOLVED,
    }),
    (0, class_validator_1.IsEnum)([client_1.DisputeStatus.RESOLVED, client_1.DisputeStatus.REJECTED]),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ResolveDisputeDto.prototype, "outcome", void 0);
//# sourceMappingURL=resolve-dispute.dto.js.map