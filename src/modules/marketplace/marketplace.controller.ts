import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateAdDto, UpdateAdDto, SearchAdsDto } from './dto/ad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Browse marketplace listings' })
  searchAds(@Query() dto: SearchAdsDto) {
    return this.marketplaceService.searchAds(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('ads')
  @ApiOperation({ summary: 'Create a new advertisement' })
  createAd(@Request() req, @Body() dto: CreateAdDto) {
    return this.marketplaceService.createAd(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('ads/my')
  @ApiOperation({ summary: 'List my advertisements' })
  listMyAds(@Request() req) {
    return this.marketplaceService.listUserAds(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('ads/:id')
  @ApiOperation({ summary: 'Update an advertisement' })
  updateAd(@Request() req, @Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.marketplaceService.updateAd(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('ads/:id')
  @ApiOperation({ summary: 'Delete an advertisement' })
  deleteAd(@Request() req, @Param('id') id: string) {
    return this.marketplaceService.deleteAd(req.user.id, id);
  }
}
