import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

// DTOs
class CreatePaymentIntentDto {
  bookingId: string;
}

class CapturePaymentDto {
  paymentIntentId: string;
}

class CancelPaymentDto {
  paymentIntentId: string;
  reason?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  // ==================== PROVIDER ONBOARDING ====================

  /**
   * Start Stripe Connect onboarding for provider
   */
  @Post('connect/onboard')
  @UseGuards(JwtAuthGuard)
  async startOnboarding(
    @CurrentUser() user: AuthUser,
    @Body('refreshUrl') refreshUrl: string,
    @Body('returnUrl') returnUrl: string,
  ) {
    // Get provider for this user
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!provider) {
      throw new BadRequestException('You are not registered as a provider');
    }

    // Create connected account if not exists
    if (!provider.stripeAccountId) {
      await this.stripeService.createConnectedAccount(provider.id, provider.user.email);
    }

    // Create onboarding link
    const url = await this.stripeService.createAccountLink(
      provider.id,
      refreshUrl || `${process.env.FRONTEND_URL}/profile/provider/stripe?refresh=true`,
      returnUrl || `${process.env.FRONTEND_URL}/profile/provider/stripe?success=true`,
    );

    return {
      success: true,
      data: { url },
    };
  }

  /**
   * Get provider's Stripe account status
   */
  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  async getOnboardingStatus(@CurrentUser() user: AuthUser) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new BadRequestException('You are not registered as a provider');
    }

    const status = await this.stripeService.getAccountStatus(provider.id);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Get login link to Stripe Express dashboard
   */
  @Get('connect/dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardLink(@CurrentUser() user: AuthUser) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new BadRequestException('You are not registered as a provider');
    }

    const url = await this.stripeService.createLoginLink(provider.id);

    return {
      success: true,
      data: { url },
    };
  }

  /**
   * Get provider's balance
   */
  @Get('connect/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@CurrentUser() user: AuthUser) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new BadRequestException('You are not registered as a provider');
    }

    const balance = await this.stripeService.getProviderBalance(provider.id);

    return {
      success: true,
      data: {
        available: balance.available.map((b) => ({
          amount: b.amount / 100, // Convert from pence to pounds
          currency: b.currency,
        })),
        pending: balance.pending.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
      },
    };
  }

  /**
   * Get provider's recent payouts
   */
  @Get('connect/payouts')
  @UseGuards(JwtAuthGuard)
  async getPayouts(@CurrentUser() user: AuthUser) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new BadRequestException('You are not registered as a provider');
    }

    const payouts = await this.stripeService.getProviderPayouts(provider.id);

    return {
      success: true,
      data: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000),
        created: new Date(p.created * 1000),
      })),
    };
  }

  // ==================== CUSTOMER PAYMENTS ====================

  /**
   * Create a payment intent for a booking
   */
  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    // Verify booking belongs to user
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.customerId !== user.id) {
      throw new BadRequestException('This booking does not belong to you');
    }

    if (booking.paymentStatus === 'CAPTURED') {
      throw new BadRequestException('This booking has already been paid');
    }

    // Create payment intent (amount in pence)
    const paymentIntent = await this.stripeService.createPaymentIntent(
      dto.bookingId,
      Math.round(Number(booking.amount) * 100), // Convert to pence
      'gbp',
    );

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: booking.amount,
        currency: 'gbp',
      },
    };
  }

  /**
   * Capture payment after service completion (called by provider or system)
   */
  @Post('capture')
  @UseGuards(JwtAuthGuard)
  async capturePayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CapturePaymentDto,
  ) {
    // Verify user is the provider for this payment
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: dto.paymentIntentId },
      include: { booking: { include: { provider: true } } },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // Only provider or customer can capture
    const isProvider = payment.booking.provider.userId === user.id;
    const isCustomer = payment.booking.customerId === user.id;

    if (!isProvider && !isCustomer) {
      throw new BadRequestException('You are not authorized to capture this payment');
    }

    const captured = await this.stripeService.capturePayment(dto.paymentIntentId);

    return {
      success: true,
      data: {
        status: captured.status,
        amount: captured.amount / 100,
      },
    };
  }

  /**
   * Cancel/refund a payment
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelPaymentDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: dto.paymentIntentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // Only customer can cancel/refund
    if (payment.booking.customerId !== user.id) {
      throw new BadRequestException('You are not authorized to cancel this payment');
    }

    const result = await this.stripeService.cancelPayment(dto.paymentIntentId, dto.reason);

    return {
      success: true,
      data: {
        status: 'status' in result ? result.status : 'refunded',
      },
    };
  }

  /**
   * Get payment history for current user
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@CurrentUser() user: AuthUser) {
    const payments = await this.prisma.payment.findMany({
      where: {
        booking: {
          customerId: user.id,
        },
      },
      include: {
        booking: {
          include: {
            provider: {
              include: { user: true },
            },
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount) / 100,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        booking: {
          id: p.booking.id,
          scheduledDate: p.booking.scheduledDate,
          provider: {
            id: p.booking.provider.id,
            name: `${p.booking.provider.user.firstName} ${p.booking.provider.user.lastName}`,
          },
          service: p.booking.service?.key || 'Unknown',
        },
      })),
    };
  }

  // ==================== WEBHOOKS ====================

  /**
   * Stripe webhook endpoint
   */
  @Post('webhooks/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
      await this.stripeService.handleWebhookEvent(event);

      return { received: true };
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
