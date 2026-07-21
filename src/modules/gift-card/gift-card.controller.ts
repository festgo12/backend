import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardListingDto } from './dto/create-listing.dto';
import { PurchaseGiftCardDto } from './dto/purchase-listing.dto';
import { ListGiftCardListingsDto } from './dto/list-listings.dto';

@ApiTags('Gift Cards')
@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  // ─── PUBLIC: Browse Active Listings ─────────────────────────────────────
  @Get('listings')
  @ApiOperation({ summary: 'Browse active gift card listings' })
  getActiveListings(@Query() dto: ListGiftCardListingsDto) {
    return this.giftCardService.getActiveListings(dto);
  }

  // ─── PUBLIC: Listing Detail ─────────────────────────────────────────────
  @Get('listings/:id')
  @ApiOperation({ summary: 'Get gift card listing detail' })
  getListingById(@Param('id') id: string) {
    return this.giftCardService.getListingById(id);
  }

  // ─── SELLER: Create Listing ────────────────────────────────────────────
  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a gift card listing (seller)' })
  createListing(@Request() req, @Body() dto: CreateGiftCardListingDto) {
    return this.giftCardService.createListing(req.user.id, dto);
  }

  // ─── SELLER: My Listings ───────────────────────────────────────────────
  @Get('listings/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my gift card listings' })
  getMyListings(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.giftCardService.getMyListings(req.user.id, page || 1, limit || 20);
  }

  // ─── SELLER: Delete Listing (PENDING_REVIEW only) ─────────────────────
  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own pending review listing' })
  deleteListing(@Request() req, @Param('id') id: string) {
    return this.giftCardService.deleteListing(req.user.id, id);
  }

  // ─── BUYER: Purchase Listing ───────────────────────────────────────────
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a gift card listing' })
  purchaseListing(@Request() req, @Body() dto: PurchaseGiftCardDto) {
    return this.giftCardService.purchaseListing(req.user.id, dto);
  }

  // ─── BUYER: My Purchases ───────────────────────────────────────────────
  @Get('orders/my-purchases')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my gift card purchases' })
  getMyPurchases(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.giftCardService.getMyPurchases(req.user.id, page || 1, limit || 20);
  }

  // ─── SELLER: My Sales ──────────────────────────────────────────────────
  @Get('orders/my-sales')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my gift card sales' })
  getMySales(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.giftCardService.getMySales(req.user.id, page || 1, limit || 20);
  }

  // ─── BUYER: Confirm Receipt ────────────────────────────────────────────
  @Patch('orders/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm receipt of gift card (reveals code)' })
  confirmReceipt(@Request() req, @Param('id') id: string) {
    return this.giftCardService.confirmReceipt(req.user.id, id);
  }

  // ─── Either Party: Cancel Order ────────────────────────────────────────
  @Patch('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel gift card order' })
  cancelOrder(@Request() req, @Param('id') id: string) {
    return this.giftCardService.cancelOrder(req.user.id, id);
  }
}
