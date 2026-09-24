import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GiftCardStoreService } from './gift-card-store.service';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { PurchaseStoreGiftCardDto } from './dto/purchase-store-gift-card.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: { id: string; [key: string]: unknown };
}

@ApiTags('Gift Card Store')
@Controller('gift-card-store')
export class GiftCardStoreController {
  constructor(private readonly storeService: GiftCardStoreService) {}

  // ─── PUBLIC: Store Brands ───────────────────────────────────────────────
  @Get('brands')
  @ApiOperation({ summary: 'List gift card store brands' })
  getBrands() {
    return this.storeService.getBrands();
  }

  // ─── PUBLIC: Brand Image Proxy ──────────────────────────────────────────
  // The Giftbit CDN sends no CORS headers, so Flutter web cannot load brand
  // images directly. Stream them same-origin instead (host-whitelisted).
  @Get('brand-image')
  @ApiOperation({ summary: 'Proxy a whitelisted Giftbit brand image' })
  async proxyBrandImage(@Query('url') url: string, @Res() res: Response) {
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
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not allowed') ? 400 : 502;
      return res.status(status).json({
        message: error instanceof Error ? error.message : 'Image proxy failed',
      });
    }
  }

  // ─── PUBLIC: Store Products ─────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'Browse available gift card store products' })
  getProducts(@Query() dto: ListStoreProductsDto) {
    return this.storeService.listProducts(dto);
  }

  // ─── PUBLIC: Product Detail ─────────────────────────────────────────────
  @Get('products/:id')
  @ApiOperation({ summary: 'Get gift card store product detail' })
  getProduct(@Param('id') id: string) {
    return this.storeService.getProductById(id);
  }

  // ─── USER: Price Preview ────────────────────────────────────────────────
  @Post('preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview the NGN price of a gift card order' })
  preview(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PurchaseStoreGiftCardDto,
  ) {
    return this.storeService.preview(req.user.id, dto);
  }

  // ─── USER: Purchase ─────────────────────────────────────────────────────
  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Purchase a gift card from the store (wallet debit)',
  })
  purchase(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PurchaseStoreGiftCardDto,
  ) {
    return this.storeService.purchase(req.user.id, dto);
  }

  // ─── USER: My Store Orders ──────────────────────────────────────────────
  @Get('orders/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my gift card store orders' })
  getMyOrders(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.storeService.getMyOrders(req.user.id, page || 1, limit || 20);
  }
}
