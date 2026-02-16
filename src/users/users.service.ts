import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, ChangePasswordDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        type: true,
        status: true,
        emailVerified: true,
        avatar: true,
        preferredLanguage: true,
        balance: true,
        createdAt: true,
        provider: {
          select: {
            id: true,
            bio: true,
            hourlyRate: true,
            location: true,
            verified: true,
            rating: true,
            reviewCount: true,
            completedJobs: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        preferredLanguage: dto.preferredLanguage,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        type: true,
        status: true,
        emailVerified: true,
        avatar: true,
        preferredLanguage: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return { message: 'Password changed successfully' };
  }

  async updateAvatar(id: string, avatarUrl: string | null) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        avatar: true,
      },
    });

    return user;
  }

  async deleteAccount(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Account deleted successfully' };
  }
}
