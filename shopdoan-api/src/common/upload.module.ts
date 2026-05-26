import { Module } from '@nestjs/common';
import { UploadController } from '@/common/upload.controller';
import { UploadService } from '@/common/upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
