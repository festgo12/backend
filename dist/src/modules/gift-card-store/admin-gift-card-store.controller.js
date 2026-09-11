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
exports.AdminGiftCardStoreController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../core/security/guards/roles.guard");
const roles_decorator_1 = require("../../core/security/decorators/roles.decorator");
const client_1 = require("@src/generated/client");
const gift_card_store_service_1 = require("./gift-card-store.service");
const list_store_products_dto_1 = require("./dto/list-store-products.dto");
const list_store_orders_dto_1 = require("./dto/list-store-orders.dto");
const update_store_product_dto_1 = require("./dto/update-store-product.dto");
let AdminGiftCardStoreController = class AdminGiftCardStoreController {
    storeService;
    constructor(storeService) {
        this.storeService = storeService;
    }
    getStats() {
        return this.storeService.getStats();
    }
    getConfig() {
        return this.storeService.getStoreConfig();
    }
    syncCatalog() {
        return this.storeService.syncCatalog();
    }
    getAllProducts(dto) {
        return this.storeService.getAllProductsAdmin(dto);
    }
    updateProduct(id, dto) {
        return this.storeService.updateProduct(id, dto);
    }
    getAllOrders(dto) {
        return this.storeService.getAllOrdersAdmin(dto);
    }
    getOrderDetail(id) {
        return this.storeService.getOrderDetailAdmin(id);
    }
};
exports.AdminGiftCardStoreController = AdminGiftCardStoreController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get gift card store stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get gift card store provider config (environment + funds)',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync the gift card catalog from Giftbit' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "syncCatalog", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gift card store products (admin)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_store_products_dto_1.ListStoreProductsDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "getAllProducts", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Enable/disable a product or set its markup' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_store_product_dto_1.UpdateStoreProductDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all gift card store orders (admin)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_store_orders_dto_1.ListStoreOrdersDto]),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get gift card store order detail with claim link',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminGiftCardStoreController.prototype, "getOrderDetail", null);
exports.AdminGiftCardStoreController = AdminGiftCardStoreController = __decorate([
    (0, swagger_1.ApiTags)('Admin Gift Card Store'),
    (0, common_1.Controller)('admin/gift-card-store'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [gift_card_store_service_1.GiftCardStoreService])
], AdminGiftCardStoreController);
//# sourceMappingURL=admin-gift-card-store.controller.js.map