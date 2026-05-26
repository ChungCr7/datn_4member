import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ProductType } from '@/modules/graphql/marketplace.types';
import { RecommendationService } from './recommendation.service';

@Resolver(() => ProductType)
export class RecommendationResolver {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Query(() => [ProductType])
  recommendations(
    @CurrentUser() user: any,
    @Args('query', { nullable: true }) query?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit = 8,
  ) {
    return this.recommendationService.recommendForUser(user.id, query, limit);
  }
}
