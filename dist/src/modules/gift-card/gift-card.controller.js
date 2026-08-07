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
exports.GiftCardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const gift_card_service_1 = require("./gift-card.service");
const create_listing_dto_1 = require("./dto/create-listing.dto");
const purchase_listing_dto_1 = require("./dto/purchase-listing.dto");
const list_listings_dto_1 = require("./dto/list-listings.dto");
let GiftCardController = class GiftCardController {
    giftCardService;
    constructor(giftCardService) {
        this.giftCardService = giftCardService;
    }
    getActiveListings(dto) {
        return this.giftCardService.getActiveListings(dto);
    }
    getListingById(id) {
        return this.giftCardService.getListingById(id);
    }
    createListing(req, dto) {
        return this.giftCardService.createListing(req.user.id, dto);
    }
    getMyListings(req, page, limit) {
        return this.giftCardService.getMyListings(req.user.id, page || 1, limit || 20);
    }
    deleteListing(req, id) {
        return this.giftCardService.deleteListing(req.user.id, id);
    }
    purchaseListing(req, dto) {
        return this.giftCardService.purchaseListing(req.user.id, dto);
    }
    getMyPurchases(req, page, limit) {
        return this.giftCardService.getMyPurchases(req.user.id, page || 1, limit || 20);
    }
    getMySales(req, page, limit) {
        return this.giftCardService.getMySales(req.user.id, page || 1, limit || 20);
    }
    confirmReceipt(req, id) {
        return this.giftCardService.confirmReceipt(req.user.id, id);
    }
    cancelOrder(req, id) {
        return this.giftCardService.cancelOrder(req.user.id, id);
    }
};
exports.GiftCardController = GiftCardController;
__decorate([
    (0, common_1.Get)('listings'),
    (0, swagger_1.ApiOperation)({ summary: 'Browse active gift card listings' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_listings_dto_1.ListGiftCardListingsDto]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "getActiveListings", null);
__decorate([
    (0, common_1.Get)('listings/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card listing detail' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "getListingById", null);
__decorate([
    (0, common_1.Post)('listings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a gift card listing (seller)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_listing_dto_1.CreateGiftCardListingDto]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "createListing", null);
__decorate([
    (0, common_1.Get)('listings/my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my gift card listings' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "getMyListings", null);
__decorate([
    (0, common_1.Delete)('listings/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete own pending review listing' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "deleteListing", null);
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Purchase a gift card listing' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purchase_listing_dto_1.PurchaseGiftCardDto]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "purchaseListing", null);
__decorate([
    (0, common_1.Get)('orders/my-purchases'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my gift card purchases' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "getMyPurchases", null);
__decorate([
    (0, common_1.Get)('orders/my-sales'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my gift card sales' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "getMySales", null);
__decorate([
    (0, common_1.Patch)('orders/:id/confirm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm receipt of gift card (reveals code)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "confirmReceipt", null);
__decorate([
    (0, common_1.Patch)('orders/:id/cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel gift card order' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GiftCardController.prototype, "cancelOrder", null);
exports.GiftCardController = GiftCardController = __decorate([
    (0, swagger_1.ApiTags)('Gift Cards'),
    (0, common_1.Controller)('gift-card'),
    __metadata("design:paramtypes", [gift_card_service_1.GiftCardService])
], GiftCardController);
//# sourceMappingURL=gift-card.controller.js.map