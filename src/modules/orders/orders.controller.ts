import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (buyer initiates common trade)' })
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders for the current user (as buyer or seller)' })
  findAll(@Request() req) {
    return this.ordersService.listUserOrders(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.getOrder(id, req.user.id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Seller approves the order' })
  approve(@Param('id') id: string, @Request() req) {
    return this.ordersService.approveOrder(id, req.user.id);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Seller declines or Buyer cancels the order' })
  decline(@Param('id') id: string, @Request() req) {
    return this.ordersService.declineOrder(id, req.user.id);
  }

  @Post(':id/flag-fraud')
  @ApiOperation({ summary: 'Flag order as fraud' })
  flagFraud(@Param('id') id: string, @Request() req) {
    return this.ordersService.flagFraud(id, req.user.id);
  }
}
