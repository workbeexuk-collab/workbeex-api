import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface SendCodeResult {
  success: boolean;
  message: string;
  expiresAt: Date;
}

interface VerifyCodeResult {
  success: boolean;
  message: string;
  isVoip?: boolean;
}

@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name);
  private readonly codeExpiry = 10 * 60 * 1000; // 10 minutes
  private readonly maxAttempts = 3;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // Validate UK phone number format
  validateUKPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '+44' + cleaned.substring(1);
    } else if (cleaned.startsWith('44')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+44')) {
      return { valid: false, formatted: '', error: 'Please enter a valid UK phone number' };
    }

    // UK mobile numbers: +44 7XXX XXX XXX (13 digits total with +44)
    // UK landlines: +44 1XXX XXX XXX or +44 2X XXXX XXXX
    if (!/^\+44[1-9]\d{9,10}$/.test(cleaned)) {
      return { valid: false, formatted: '', error: 'Invalid UK phone number format' };
    }

    // Check if it's a mobile number (starts with 7)
    const isMobile = cleaned.startsWith('+447');
    if (!isMobile) {
      return { valid: false, formatted: '', error: 'Please enter a UK mobile number' };
    }

    return { valid: true, formatted: cleaned };
  }

  // Check if phone is VOIP (simplified - in production use Twilio Lookup API)
  async checkVoip(phone: string): Promise<boolean> {
    // In production, use Twilio Lookup API:
    // const twilioClient = require('twilio')(accountSid, authToken);
    // const lookup = await twilioClient.lookups.v1.phoneNumbers(phone).fetch({ type: ['carrier'] });
    // return lookup.carrier.type === 'voip';

    // For now, return false (not VOIP)
    // Known VOIP prefixes in UK (simplified check)
    const voipPrefixes = ['+4470', '+4476']; // Some virtual number prefixes
    return voipPrefixes.some(prefix => phone.startsWith(prefix));
  }

  // Generate 6-digit code
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code
  async sendCode(phone: string): Promise<SendCodeResult> {
    const validation = this.validateUKPhone(phone);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const formattedPhone = validation.formatted;

    // Check VOIP
    const isVoip = await this.checkVoip(formattedPhone);
    if (isVoip) {
      throw new BadRequestException(
        'Virtual/VOIP phone numbers are not accepted. Please use a real UK mobile number.',
      );
    }

    // Check for existing pending verification
    const existing = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: formattedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Rate limiting: max 3 codes per phone per hour
    const recentCodes = await this.prisma.phoneVerification.count({
      where: {
        phone: formattedPhone,
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
    await this.prisma.phoneVerification.create({
      data: {
        phone: formattedPhone,
        code,
        expiresAt,
      },
    });

    // In production, send SMS via Twilio:
    // await this.sendSMS(formattedPhone, `Your NextBee verification code is: ${code}`);

    // For development, log the code
    this.logger.log(`[DEV] Verification code for ${formattedPhone}: ${code}`);

    return {
      success: true,
      message: 'Verification code sent',
      expiresAt,
    };
  }

  // Verify code
  async verifyCode(phone: string, code: string): Promise<VerifyCodeResult> {
    const validation = this.validateUKPhone(phone);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const formattedPhone = validation.formatted;

    // Find the verification record
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: formattedPhone,
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
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = this.maxAttempts - verification.attempts - 1;
      throw new BadRequestException(
        `Invalid code. ${remaining} attempts remaining.`,
      );
    }

    // Mark as verified
    await this.prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Check VOIP status for trust scoring
    const isVoip = await this.checkVoip(formattedPhone);

    return {
      success: true,
      message: 'Phone verified successfully',
      isVoip,
    };
  }

  // Update user phone verification status
  async markUserPhoneVerified(userId: string, phone: string, isVoip: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        phoneIsVoip: isVoip,
      },
    });
  }
}
