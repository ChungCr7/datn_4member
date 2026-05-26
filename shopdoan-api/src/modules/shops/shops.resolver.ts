import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/auth/decorators/public.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import { ShopPageType, ShopType } from '@/modules/graphql/marketplace.types';
import { ShopsService } from './shops.service';

@Resolver(() => ShopType)
export class ShopsResolver {
  constructor(private readonly shopsService: ShopsService) {}

  @Public()
  @Query(() => ShopPageType)
  shops(
    @Args('page', { type: () => Int, nullable: true }) page = 1,
    @Args('limit', { type: () => Int, nullable: true }) limit = 20,
    @Args('search', { nullable: true }) search?: string,
  ) {
    return this.shopsService.findAll(
      new PaginationDto({ page, limit, search }),
    );
  }

  @Public()
  @Query(() => ShopType)
  shop(@Args('id', { type: () => Int }) id: number) {
    return this.shopsService.findOne(id);
  }
}
