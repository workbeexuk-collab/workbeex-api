import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Headers,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class CreateDepositDto {
  amount: number;
  successUrl?: string;
  cancelUrl?: string;
}

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * Get current user's balance
   */
  @Get('balance')
  async getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  /**
   * Create a deposit session (Stripe Checkout)
   */
  @Post('deposit')
  async createDeposit(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDepositDto,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const successUrl = dto.successUrl || `${frontendUrl}/profile/wallet?deposit=success`;
    const cancelUrl = dto.cancelUrl || `${frontendUrl}/profile/wallet?deposit=cancelled`;

    return this.walletService.createDepositSession(
      userId,
      dto.amount,
      successUrl,
      cancelUrl,
    );
  }

  /**
   * Get transaction history
   */
  @Get('transactions')
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Stripe webhook for wallet events
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.walletService.constructWebhookEvent(rawBody, signature);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.walletService.handlePaymentSuccess(
            event.data.object as any,
          );
          break;
        case 'checkout.session.expired':
        case 'checkout.session.async_payment_failed':
          await this.walletService.handlePaymentFailed(
            event.data.object as any,
          );
          break;
      }

      return { received: true };
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
