import {
  Controller,
  Get,
  Post,
  Patch,
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

  // ─── Catalog Sync ──────────────────────────────────────────────────────
  @Post('sync')
  @ApiOperation({ summary: 'Sync the gift card catalog from Reloadly' })
  syncCatalog(@Body() body?: { countries?: string[] }) {
    return this.storeService.syncCatalog({ countries: body?.countries });
  }

  // ─── Products ──────────────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'Get all gift card store products (admin)' })
  getAllProducts(@Query() dto: ListStoreProductsDto) {
    return this.storeService.getAllProductsAdmin(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Enable/disable a product or set its markup' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateStoreProductDto) {
    return this.storeService.updateProduct(id, dto);
  }

  // ─── Orders ────────────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'Get all gift card store orders (admin)' })
  getAllOrders(@Query() dto: ListStoreOrdersDto) {
    return this.storeService.getAllOrdersAdmin(dto);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get gift card store order detail with decrypted code',
  })
  getOrderDetail(@Param('id') id: string) {
    return this.storeService.getOrderDetailAdmin(id);
  }
}
