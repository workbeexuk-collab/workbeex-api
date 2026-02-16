import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get('CLOUDINARY_URL');

    if (cloudinaryUrl) {
      this.logger.log('Configuring Cloudinary from CLOUDINARY_URL');
      // CLOUDINARY_URL is automatically parsed by cloudinary SDK
    } else {
      const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

      this.logger.log(`Cloudinary config: cloud_name=${cloudName}, api_key=${apiKey ? 'set' : 'missing'}`);

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'avatars',
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `nextbee/${folder}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          resource_type: 'image',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`, error);
            reject(new BadRequestException(`Failed to upload image: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'attachments',
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      // Determine resource type based on mimetype
      const isImage = file.mimetype.startsWith('image/');
      const isPdf = file.mimetype === 'application/pdf';

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `nextbee/${folder}`,
          resource_type: isImage ? 'image' : 'auto',
          ...(isImage && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          }),
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`, error);
            reject(new BadRequestException(`Failed to upload file: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width || 0,
              height: result.height || 0,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Ignore errors when deleting
    }
  }
}
