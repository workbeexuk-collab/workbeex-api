import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PhoneService } from './phone.service';
import { EmailVerificationService } from './email.service';
import { TrustService } from './trust.service';
import { CurrentUser, Public } from '../common/decorators';
import { IsString, IsEmail, Matches, MinLength, MaxLength } from 'class-validator';

class SendPhoneCodeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone: string;
}

class VerifyPhoneCodeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

class SendEmailCodeDto {
  @IsEmail()
  email: string;
}

class VerifyEmailCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

@Controller('verification')
export class VerificationController {
  constructor(
    private phoneService: PhoneService,
    private emailVerificationService: EmailVerificationService,
    private trustService: TrustService,
  ) {}

  // Validate UK phone number (public - for registration flow)
  @Public()
  @Post('phone/validate')
  @HttpCode(HttpStatus.OK)
  async validatePhone(@Body() dto: SendPhoneCodeDto) {
    const validation = this.phoneService.validateUKPhone(dto.phone);
    const isVoip = await this.phoneService.checkVoip(dto.phone);

    return {
      success: true,
      data: {
        valid: validation.valid,
        formatted: validation.formatted,
        isVoip,
        canVerify: validation.valid && !isVoip,
      },
    };
  }

  // Send phone verification code (public - for registration flow)
  @Public()
  @Post('phone/send')
  @HttpCode(HttpStatus.OK)
  async sendPhoneCode(@Body() dto: SendPhoneCodeDto) {
    const result = await this.phoneService.sendCode(dto.phone);
    return {
      success: true,
      message: result.message,
      data: {
        expiresAt: result.expiresAt,
      },
    };
  }

  // Verify phone code (public - for registration flow)
  @Public()
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneCode(@Body() dto: VerifyPhoneCodeDto) {
    const result = await this.phoneService.verifyCode(dto.phone, dto.code);
    return {
      success: true,
      message: result.message,
      data: {
        verified: true,
        isVoip: result.isVoip,
      },
    };
  }

  // Link phone to authenticated user
  @Post('phone/link')
  @HttpCode(HttpStatus.OK)
  async linkPhone(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPhoneCodeDto,
  ) {
    // First verify the code
    const result = await this.phoneService.verifyCode(dto.phone, dto.code);

    // Then link to user
    const validation = this.phoneService.validateUKPhone(dto.phone);
    await this.phoneService.markUserPhoneVerified(
      userId,
      validation.formatted,
      result.isVoip || false,
    );

    // Update trust score
    const trustScore = await this.trustService.updateUserTrustScore(userId);

    return {
      success: true,
      message: 'Phone linked successfully',
      data: {
        trustScore,
      },
    };
  }

  // ============ EMAIL VERIFICATION ============

  // Send email verification code (public - for registration flow)
  @Public()
  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  async sendEmailCode(@Body() dto: SendEmailCodeDto) {
    const result = await this.emailVerificationService.sendCode(dto.email);
    return {
      success: true,
      message: result.message,
      data: {
        expiresAt: result.expiresAt,
      },
    };
  }

  // Verify email code (public - for registration flow)
  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    const result = await this.emailVerificationService.verifyCode(dto.email, dto.code);
    return {
      success: true,
      message: result.message,
      data: {
        verified: true,
      },
    };
  }

  // Link email verification to authenticated user
  @Post('email/link')
  @HttpCode(HttpStatus.OK)
  async linkEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyEmailCodeDto,
  ) {
    // First verify the code
    await this.emailVerificationService.verifyCode(dto.email, dto.code);

    // Then mark user email as verified
    await this.emailVerificationService.markUserEmailVerified(userId);

    // Update trust score
    const trustScore = await this.trustService.updateUserTrustScore(userId);

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        trustScore,
      },
    };
  }

  // ============ TRUST SCORE ============

  // Get user's trust score
  @Get('trust-score')
  async getTrustScore(@CurrentUser('id') userId: string) {
    const breakdown = await this.trustService.calculateTrustScore(userId);
    return {
      success: true,
      data: breakdown,
    };
  }
}
