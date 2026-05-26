import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as streamifier from 'streamifier';

export type UploadedImage = {
  imageUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
};

@Injectable()
export class UploadService {
  private readonly maxImageSize = 5 * 1024 * 1024;

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'shopdoan',
  ): Promise<string> {
    const result = await this.uploadImageWithMeta(file, folder);
    return result.imageUrl;
  }

  async uploadImageWithMeta(
    file: Express.Multer.File,
    folder: string = 'shopdoan',
  ): Promise<UploadedImage> {
    this.validateImageFile(file);
    const normalizedFolder = this.normalizeFolder(folder);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `shopdoan/${normalizedFolder}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(
              new InternalServerErrorException('Cloudinary upload failed'),
            );
            return;
          }

          resolve({
            imageUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  extractPublicIdFromUrl(url: string): string {
    if (!url) return '';
    try {
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/shopdoan/{folder}/{publicId}.{ext}
      // We need to extract the path after '/upload/'
      const match = url.match(
        /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?(?:\?|$)/i,
      );
      if (match && match[1]) {
        return match[1];
      }
      return '';
    } catch (error) {
      console.error('Error extracting public ID from URL:', error);
      return '';
    }
  }

  async deleteImageIfExists(
    imageUrl: string | null | undefined,
  ): Promise<void> {
    if (!imageUrl) return;
    try {
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        await this.deleteImage(publicId);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw - continue operation even if delete fails
    }
  }

  private validateImageFile(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    if (file.size > this.maxImageSize) {
      throw new BadRequestException('Image size must be less than 5MB');
    }
  }

  private normalizeFolder(folder?: string): string {
    const value = String(folder || 'misc')
      .trim()
      .replace(/\\/g, '/')
      .replace(/[^a-zA-Z0-9/_-]/g, '')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '');

    return value || 'misc';
  }
}
