import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { PhoneService } from './phone.service';
import { EmailVerificationService } from './email.service';
import { TrustService } from './trust.service';

@Module({
  controllers: [VerificationController],
  providers: [PhoneService, EmailVerificationService, TrustService],
  exports: [PhoneService, EmailVerificationService, TrustService],
})
export class VerificationModule {}
