import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    return {
      success: true,
      data: user,
    };
  }

  @Put('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(userId, dto);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file, 'avatars');

    // Update user avatar in database
    const user = await this.usersService.updateAvatar(userId, uploadResult.url);

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: user.avatar,
      },
    };
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  async deleteAvatar(@CurrentUser('id') userId: string) {
    await this.usersService.updateAvatar(userId, null);
    return {
      success: true,
      message: 'Avatar removed successfully',
    };
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.usersService.changePassword(userId, dto);
    return {
      success: true,
      message: result.message,
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser('id') userId: string) {
    const result = await this.usersService.deleteAccount(userId);
    return {
      success: true,
      message: result.message,
    };
  }
}
