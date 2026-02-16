import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './dto';
import { User, UserStatus } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  type: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: Partial<User>;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Format postcode (uppercase, standard format)
    const postcode = dto.postcode
      ? dto.postcode.toUpperCase().replace(/\s+/g, ' ').trim()
      : undefined;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        postcode,
        type: dto.type,
        preferredLanguage: dto.preferredLanguage,
        status: UserStatus.ACTIVE,
        phoneVerified: dto.phoneVerified || false,
        phoneVerifiedAt: dto.phoneVerified ? new Date() : null,
        registrationStep: dto.phoneVerified ? 5 : 4, // Track progress
        onboardingComplete: dto.phoneVerified || false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        postcode: true,
        type: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        addressVerified: true,
        avatar: true,
        preferredLanguage: true,
        overallTrustScore: true,
        onboardingComplete: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: user.type,
    });

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Send welcome email (async, don't wait)
    const welcomeType = dto.type === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER';
    this.emailService.sendWelcome(user.email, user.firstName, welcomeType);

    return {
      ...tokens,
      user,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: user.type,
    });

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        type: user.type,
        status: user.status,
        emailVerified: user.emailVerified,
        avatar: user.avatar,
        preferredLanguage: user.preferredLanguage,
      },
    };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Invalidate old refresh token
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    // Generate new tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: user.type,
    });

    // Save new refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Delete specific token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link will be sent' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    // Build reset link
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    // Send password reset email
    this.emailService.sendPasswordReset(user.email, user.firstName, resetLink);

    return { message: 'If the email exists, a reset link will be sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash },
      });

      // Invalidate all refresh tokens
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    // Cleanup old tokens (keep only last 5)
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
    });

    if (tokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokens.map((t) => t.id) },
        },
      });
    }
  }
}
