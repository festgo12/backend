import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role } from '@src/generated/client';
import { GiftCardStoreService } from './gift-card-store.service';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ListStoreOrdersDto } from './dto/list-store-orders.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { CreateStoreBrandDto } from './dto/create-store-brand.dto';

@ApiTags('Admin Gift Card Store')
@Controller('admin/gift-card-store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminGiftCardStoreController {
  constructor(private readonly storeService: GiftCardStoreService) {}

  // ─── Stats ─────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get gift card store stats' })
  getStats() {
    return this.storeService.getStats();
  }

  // ─── Provider Config ───────────────────────────────────────────────────
  @Get('config')
  @ApiOperation({
    summary: 'Get gift card store provider config (environment + funds)',
  })
  getConfig() {
    return this.storeService.getStoreConfig();
  }

  // ─── Catalog Sync ──────────────────────────────────────────────────────
  @Post('sync')
  @ApiOperation({ summary: 'Sync the gift card catalog from Giftbit' })
  syncCatalog() {
    return this.storeService.syncCatalog();
  }

  // ─── Products ──────────────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'Get all gift card store products (admin)' })
  getAllProducts(@Query() dto: ListStoreProductsDto) {
    return this.storeService.getAllProductsAdmin(dto);
  }

  @Get('brands')
  @ApiOperation({ summary: 'List all store brands (admin)' })
  getBrands() {
    return this.storeService.getAllBrandsAdmin();
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create a custom store brand' })
  createBrand(@Body() dto: CreateStoreBrandDto) {
    return this.storeService.createBrand(dto);
  }

  @Post('products')
  @ApiOperation({
    summary: 'Create a store product (Giftbit brand code required)',
  })
  createProduct(@Body() dto: CreateStoreProductDto) {
    return this.storeService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiOperation({
    summary:
      'Update a product (enable/markup/name/denominations/fees) or set its markup',
  })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateStoreProductDto) {
    return this.storeService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({
    summary: 'Delete a product (blocked when orders exist — disable instead)',
  })
  deleteProduct(@Param('id') id: string) {
    return this.storeService.deleteProduct(id);
  }

  // ─── Orders ────────────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'Get all gift card store orders (admin)' })
  getAllOrders(@Query() dto: ListStoreOrdersDto) {
    return this.storeService.getAllOrdersAdmin(dto);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get gift card store order detail with claim link',
  })
  getOrderDetail(@Param('id') id: string) {
    return this.storeService.getOrderDetailAdmin(id);
  }
}
