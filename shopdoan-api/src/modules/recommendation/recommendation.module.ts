import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RecommendationResolver } from './recommendation.resolver';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationController],
  providers: [RecommendationService, RecommendationResolver],
  exports: [RecommendationService],
})
export class RecommendationModule {}
