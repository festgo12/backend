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
exports.GiftCardStoreController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const gift_card_store_service_1 = require("./gift-card-store.service");
const list_store_products_dto_1 = require("./dto/list-store-products.dto");
const purchase_store_gift_card_dto_1 = require("./dto/purchase-store-gift-card.dto");
let GiftCardStoreController = class GiftCardStoreController {
    storeService;
    constructor(storeService) {
        this.storeService = storeService;
    }
    getBrands() {
        return this.storeService.getBrands();
    }
    async proxyBrandImage(url, res) {
        if (!url) {
            return res.status(400).json({ message: 'url query param is required' });
        }
        try {
            const image = await this.storeService.proxyBrandImage(url);
            res.setHeader('Content-Type', image.contentType);
            res.setHeader('Cache-Control', image.cacheControl);
            if (image.contentLength) {
                res.setHeader('Content-Length', image.contentLength);
            }
            image.stream.pipe(res);
        }
        catch (error) {
            const status = error instanceof Error && error.message.includes('not allowed') ? 400 : 502;
            return res.status(status).json({
                message: error instanceof Error ? error.message : 'Image proxy failed',
            });
        }
    }
    getProducts(dto) {
        return this.storeService.listProducts(dto);
    }
    getProduct(id) {
        return this.storeService.getProductById(id);
    }
    preview(req, dto) {
        return this.storeService.preview(req.user.id, dto);
    }
    purchase(req, dto) {
        return this.storeService.purchase(req.user.id, dto);
    }
    getMyOrders(req, page, limit) {
        return this.storeService.getMyOrders(req.user.id, page || 1, limit || 20);
    }
};
exports.GiftCardStoreController = GiftCardStoreController;
__decorate([
    (0, common_1.Get)('brands'),
    (0, swagger_1.ApiOperation)({ summary: 'List gift card store brands' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "getBrands", null);
__decorate([
    (0, common_1.Get)('brand-image'),
    (0, swagger_1.ApiOperation)({ summary: 'Proxy a whitelisted Giftbit brand image' }),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GiftCardStoreController.prototype, "proxyBrandImage", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Browse available gift card store products' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_store_products_dto_1.ListStoreProductsDto]),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card store product detail' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Preview the NGN price of a gift card order' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purchase_store_gift_card_dto_1.PurchaseStoreGiftCardDto]),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Purchase a gift card from the store (wallet debit)',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purchase_store_gift_card_dto_1.PurchaseStoreGiftCardDto]),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "purchase", null);
__decorate([
    (0, common_1.Get)('orders/my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my gift card store orders' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], GiftCardStoreController.prototype, "getMyOrders", null);
exports.GiftCardStoreController = GiftCardStoreController = __decorate([
    (0, swagger_1.ApiTags)('Gift Card Store'),
    (0, common_1.Controller)('gift-card-store'),
    __metadata("design:paramtypes", [gift_card_store_service_1.GiftCardStoreService])
], GiftCardStoreController);
//# sourceMappingURL=gift-card-store.controller.js.map