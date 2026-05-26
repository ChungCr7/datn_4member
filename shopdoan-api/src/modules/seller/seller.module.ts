import { Module } from '@nestjs/common';
import { OrdersModule } from '@/modules/orders/orders.module';
import { SellerResolver } from './seller.resolver';

@Module({
  imports: [OrdersModule],
  providers: [SellerResolver],
})
export class SellerModule {}
