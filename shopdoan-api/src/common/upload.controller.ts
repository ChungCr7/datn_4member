import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UploadService } from '@/common/upload.service';

const allowedFolders = new Set([
  'avatars',
  'users',
  'sellers/logos',
  'sellers/banners',
  'products',
  'categories',
  'reviews',
  'misc',
]);

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Roles('buyer', 'seller', 'admin', 'root')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() image: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const safeFolder = allowedFolders.has(String(folder || 'misc'))
      ? String(folder || 'misc')
      : 'misc';
    const data = await this.uploadService.uploadImageWithMeta(image, safeFolder);

    return {
      success: true,
      message: 'Upload ảnh thành công',
      data,
    };
  }
}
