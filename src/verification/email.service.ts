import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

interface SendCodeResult {
  success: boolean;
  message: string;
  expiresAt: Date;
}

interface VerifyCodeResult {
  success: boolean;
  message: string;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly codeExpiry = 10 * 60 * 1000; // 10 minutes
  private readonly maxAttempts = 3;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Generate 6-digit code
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code
  async sendCode(email: string): Promise<SendCodeResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new BadRequestException('Invalid email format');
    }

    // Rate limiting: max 3 codes per email per hour
    const recentCodes = await this.prisma.emailVerification.count({
      where: {
        email: normalizedEmail,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentCodes >= 3) {
      throw new BadRequestException(
        'Too many verification attempts. Please try again later.',
      );
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.codeExpiry);

    // Create verification record
    await this.prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt,
      },
    });

    // Send email
    await this.emailService.sendEmailVerificationCode(normalizedEmail, code);

    // Log code in development
    const isDev = this.configService.get('NODE_ENV') === 'development';
    if (isDev) {
      this.logger.log(`[DEV] Email verification code for ${normalizedEmail.slice(0, 3)}***@${normalizedEmail.split('@')[1]}: ${code}`);
    }

    return {
      success: true,
      message: 'Verification code sent',
      expiresAt,
    };
  }

  // Verify code
  async verifyCode(email: string, code: string): Promise<VerifyCodeResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find the verification record
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException(
        'No pending verification found. Please request a new code.',
      );
    }

    // Check max attempts
    if (verification.attempts >= this.maxAttempts) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    // Check code (in dev mode, 123456 always works)
    const isDev = this.configService.get('NODE_ENV') === 'development';
    const isValidCode = verification.code === code || (isDev && code === '123456');

    if (!isValidCode) {
      // Increment attempts
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = this.maxAttempts - verification.attempts - 1;
      throw new BadRequestException(
        `Invalid code. ${remaining} attempts remaining.`,
      );
    }

    // Mark as verified
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // Update user email verification status
  async markUserEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }
}
