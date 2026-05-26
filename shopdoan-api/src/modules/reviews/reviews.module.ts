import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CacheService } from '@/common/cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, CacheService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
