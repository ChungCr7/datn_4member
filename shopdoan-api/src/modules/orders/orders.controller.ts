import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(
      dto,
      req.user.userId || req.user.sub || req.user.id,
    );
  }

  @Get('me')
  findMine(@Query() pagination: PaginationDto, @Req() req: any) {
    return this.ordersService.findByUser(
      req.user.userId || req.user.sub || req.user.id,
      pagination,
    );
  }

  @Get()
  @Roles('admin', 'root')
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @Get('/admin/orders')
  @Roles('admin', 'root')
  adminOrders(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @Get('seller/items')
  @Roles('seller', 'admin', 'root')
  findSellerItems(@Query() pagination: PaginationDto, @Req() req: any) {
    return this.ordersService.findBySeller(
      req.user.userId || req.user.sub || req.user.id,
      pagination,
    );
  }

  @Get('/seller/orders')
  @Roles('seller', 'admin', 'root')
  findSellerOrders(@Query() pagination: PaginationDto, @Req() req: any) {
    return this.ordersService.findBySeller(
      req.user.userId || req.user.sub || req.user.id,
      pagination,
    );
  }

  @Patch('/seller/orders/:id/status')
  @Roles('seller', 'admin', 'root')
  updateSellerOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.updateSellerOrderStatus(
      id,
      dto,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.legacyRole,
    );
  }

  @Get('seller/analytics')
  @Roles('seller', 'admin', 'root')
  sellerAnalytics(@Req() req: any) {
    return this.ordersService.getSellerAnalytics(req.user.id);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pagination: PaginationDto,
    @Req() req: any,
  ) {
    const role = String(req.user.role || '').toLowerCase();
    const requestUserId = req.user.userId || req.user.sub || req.user.id;
    if (requestUserId !== userId && role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Users can only view their own orders');
    }
    return this.ordersService.findByUser(userId, pagination);
  }

  @Get('revenue/today')
  @Roles('admin', 'root')
  getDailyRevenue() {
    return this.ordersService.getDailyRevenue();
  }

  @Get('status/:status')
  @Roles('admin', 'root')
  getOrdersByStatus(
    @Param('status') status: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.getOrdersByStatus(status, pagination);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const order = await this.ordersService.findOne(id);
    const role = String(req.user.role || '').toLowerCase();
    const requestUserId = req.user.userId || req.user.sub || req.user.id;
    if (
      order.user?.id !== requestUserId &&
      role !== 'admin' &&
      role !== 'root'
    ) {
      throw new ForbiddenException('Users can only view their own orders');
    }
    return order;
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.update(
      id,
      dto,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ordersService.cancel(
      id,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.legacyRole,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ordersService.remove(
      id,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
    );
  }
}

@ApiTags('Seller Orders')
@Controller('seller/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Roles('seller', 'admin', 'root')
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findSellerOrders(@Query() pagination: PaginationDto, @Req() req: any) {
    return this.ordersService.findBySeller(
      req.user.userId || req.user.sub || req.user.id,
      pagination,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.updateSellerOrderStatus(
      id,
      dto,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.legacyRole,
    );
  }
}

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Roles('admin', 'root')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }
}
