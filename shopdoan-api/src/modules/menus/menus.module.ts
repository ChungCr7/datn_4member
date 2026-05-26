import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CacheService } from '@/common/cache.service';
import { UploadService } from '@/common/upload.service';

@Module({
  imports: [PrismaModule],
  controllers: [MenusController],
  providers: [MenusService, CacheService, UploadService],
  exports: [MenusService],
})
export class MenusModule {}
