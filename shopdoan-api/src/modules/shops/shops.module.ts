import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { UploadService } from '@/common/upload.service';
import { ShopsController } from './shops.controller';
import { ShopsResolver } from './shops.resolver';
import { ShopsService } from './shops.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopsController],
  providers: [ShopsService, ShopsResolver, UploadService],
  exports: [ShopsService],
})
export class ShopsModule {}
