import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  AdminOrdersController,
  OrdersController,
  SellerOrdersController,
} from './orders.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CacheService } from '@/common/cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    OrdersController,
    SellerOrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService, CacheService],
  exports: [OrdersService],
})
export class OrdersModule {}
