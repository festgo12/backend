import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Role } from '@src/generated/client';
import { GiftCardService } from './gift-card.service';
import { ModerateGiftCardListingDto } from './dto/moderate-listing.dto';
import { ListGiftCardListingsDto, ListGiftCardOrdersDto } from './dto/list-listings.dto';

@ApiTags('Admin Gift Cards')
@Controller('admin/gift-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminGiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  // ─── Stats ─────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get gift card marketplace stats' })
  getStats() {
    return this.giftCardService.getStats();
  }

  // ─── All Listings ──────────────────────────────────────────────────────
  @Get('listings')
  @ApiOperation({ summary: 'Get all gift card listings (admin)' })
  getAllListings(@Query() dto: ListGiftCardListingsDto) {
    return this.giftCardService.getAllListingsAdmin(dto);
  }

  // ─── Listing Detail ────────────────────────────────────────────────────
  @Get('listings/:id')
  @ApiOperation({ summary: 'Get gift card listing detail with decrypted codes (admin)' })
  getListingDetail(@Param('id') id: string) {
    return this.giftCardService.getListingAdmin(id);
  }

  // ─── Moderate Listing ──────────────────────────────────────────────────
  @Patch('listings/:id/moderate')
  @ApiOperation({ summary: 'Approve or reject a gift card listing' })
  moderateListing(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ModerateGiftCardListingDto,
  ) {
    return this.giftCardService.moderateListing(id, dto, req.user.id);
  }

  // ─── All Orders ────────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'Get all gift card orders (admin)' })
  getAllOrders(@Query() dto: ListGiftCardOrdersDto) {
    return this.giftCardService.getAllOrdersAdmin(dto);
  }

  // ─── Order Detail ──────────────────────────────────────────────────────
  @Get('orders/:id')
  @ApiOperation({ summary: 'Get gift card order detail (admin)' })
  getOrderDetail(@Param('id') id: string) {
    return this.giftCardService.getOrderDetailAdmin(id);
  }
}
