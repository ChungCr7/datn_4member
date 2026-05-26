import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@/auth/decorators/public.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import {
  ProductPageType,
  ProductType,
} from '@/modules/graphql/marketplace.types';
import { MenuItemsService } from './menu-items.service';

@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Public()
  @Query(() => ProductPageType)
  products(
    @Args('page', { type: () => Int, nullable: true }) page = 1,
    @Args('limit', { type: () => Int, nullable: true }) limit = 20,
    @Args('search', { nullable: true }) search?: string,
  ) {
    return this.menuItemsService.findAllMenuItems(
      new PaginationDto({ page, limit, search }),
    );
  }

  @Public()
  @Query(() => ProductType)
  product(@Args('id', { type: () => Int }) id: number) {
    return this.menuItemsService.findMenuItemById(id);
  }
}
