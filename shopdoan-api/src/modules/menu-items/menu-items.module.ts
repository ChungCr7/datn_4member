import { Module } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { MenuItemsController } from './menu-items.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CacheService } from '@/common/cache.service';
import { UploadService } from '@/common/upload.service';
import { ProductsResolver } from './products.resolver';

@Module({
  imports: [PrismaModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, ProductsResolver, CacheService, UploadService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
