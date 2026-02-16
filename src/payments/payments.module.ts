import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [StripeService, PrismaService],
  exports: [StripeService],
})
export class PaymentsModule {}
