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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGiftCardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("../../generated/client/index.js");
const gift_card_service_1 = require("./gift-card.service");
const moderate_listing_dto_1 = require("./dto/moderate-listing.dto");
const list_listings_dto_1 = require("./dto/list-listings.dto");
let AdminGiftCardController = class AdminGiftCardController {
    giftCardService;
    constructor(giftCardService) {
        this.giftCardService = giftCardService;
    }
    getStats() {
        return this.giftCardService.getStats();
    }
    getAllListings(dto) {
        return this.giftCardService.getAllListingsAdmin(dto);
    }
    getListingDetail(id) {
        return this.giftCardService.getListingAdmin(id);
    }
    moderateListing(req, id, dto) {
        return this.giftCardService.moderateListing(id, dto, req.user.id);
    }
    getAllOrders(dto) {
        return this.giftCardService.getAllOrdersAdmin(dto);
    }
    getOrderDetail(id) {
        return this.giftCardService.getOrderDetailAdmin(id);
    }
};
exports.AdminGiftCardController = AdminGiftCardController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card marketplace stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('listings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gift card listings (admin)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_listings_dto_1.ListGiftCardListingsDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "getAllListings", null);
__decorate([
    (0, common_1.Get)('listings/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card listing detail with decrypted codes (admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "getListingDetail", null);
__decorate([
    (0, common_1.Patch)('listings/:id/moderate'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject a gift card listing' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, moderate_listing_dto_1.ModerateGiftCardListingDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "moderateListing", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gift card orders (admin)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_listings_dto_1.ListGiftCardOrdersDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card order detail (admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminGiftCardController.prototype, "getOrderDetail", null);
exports.AdminGiftCardController = AdminGiftCardController = __decorate([
    (0, swagger_1.ApiTags)('Admin Gift Cards'),
    (0, common_1.Controller)('admin/gift-cards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [gift_card_service_1.GiftCardService])
], AdminGiftCardController);
//# sourceMappingURL=admin-gift-card.controller.js.map