import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { SellerAnalyticsType } from '@/modules/graphql/marketplace.types';
import { OrdersService } from '@/modules/orders/orders.service';

@Resolver()
export class SellerResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles('seller', 'root')
  @Query(() => SellerAnalyticsType)
  sellerAnalytics(@CurrentUser() user: any) {
    return this.ordersService.getSellerAnalytics(user.id);
  }
}
