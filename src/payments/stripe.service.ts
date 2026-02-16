import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly platformFeePercent: number;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-02-24.acacia',
    });
    this.platformFeePercent = this.configService.get<number>('STRIPE_PLATFORM_FEE_PERCENT') || 15;
  }

  // ==================== PROVIDER ONBOARDING ====================

  /**
   * Create a Stripe Connect Express account for a provider
   */
  async createConnectedAccount(providerId: string, email: string): Promise<Stripe.Account> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new BadRequestException('Provider not found');
    }

    if (provider.stripeAccountId) {
      // Return existing account
      return this.stripe.accounts.retrieve(provider.stripeAccountId);
    }

    // Create new Express account
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'GB', // Change based on your market
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        providerId: providerId,
      },
    });

    // Save Stripe account ID to provider
    await this.prisma.provider.update({
      where: { id: providerId },
      data: { stripeAccountId: account.id },
    });

    this.logger.log(`Created Stripe account ${account.id} for provider ${providerId}`);

    return account;
  }

  /**
   * Create an account link for provider onboarding
   */
  async createAccountLink(providerId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider?.stripeAccountId) {
      throw new BadRequestException('Provider does not have a Stripe account');
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: provider.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Create a login link for provider to access their Stripe dashboard
   */
  async createLoginLink(providerId: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider?.stripeAccountId) {
      throw new BadRequestException('Provider does not have a Stripe account');
    }

    const loginLink = await this.stripe.accounts.createLoginLink(provider.stripeAccountId);
    return loginLink.url;
  }

  /**
   * Check if provider's Stripe account is fully onboarded
   */
  async getAccountStatus(providerId: string): Promise<{
    isOnboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: string[];
  }> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider?.stripeAccountId) {
      return {
        isOnboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: ['stripe_account'],
      };
    }

    const account = await this.stripe.accounts.retrieve(provider.stripeAccountId);

    return {
      isOnboarded: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      requirements: account.requirements?.currently_due || [],
    };
  }

  // ==================== PAYMENTS ====================

  /**
   * Create a payment intent for a booking (with escrow - manual capture)
   */
  async createPaymentIntent(
    bookingId: string,
    amount: number, // in smallest currency unit (pence/cents)
    currency: string = 'gbp',
    customerId?: string,
  ): Promise<Stripe.PaymentIntent> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.provider.stripeAccountId) {
      throw new BadRequestException('Provider is not set up to receive payments');
    }

    // Calculate platform fee
    const platformFee = Math.round(amount * (this.platformFeePercent / 100));

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: 'manual', // Escrow: authorize now, capture later
      application_fee_amount: platformFee,
      transfer_data: {
        destination: booking.provider.stripeAccountId,
      },
      metadata: {
        bookingId: bookingId,
        providerId: booking.providerId,
        customerId: booking.customerId,
      },
      ...(customerId && { customer: customerId }),
    });

    // Save payment intent to database
    await this.prisma.payment.create({
      data: {
        bookingId: bookingId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        status: 'PENDING',
      },
    });

    this.logger.log(`Created payment intent ${paymentIntent.id} for booking ${bookingId}`);

    return paymentIntent;
  }

  /**
   * Capture a payment after service is completed
   */
  async capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId);

    // Update payment status in database
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'CAPTURED' },
    });

    // Update booking payment status
    const bookingId = paymentIntent.metadata.bookingId;
    if (bookingId) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'CAPTURED' },
      });
    }

    this.logger.log(`Captured payment ${paymentIntentId}`);

    return paymentIntent;
  }

  /**
   * Cancel a payment (refund if already captured)
   */
  async cancelPayment(paymentIntentId: string, reason?: string): Promise<Stripe.PaymentIntent | Stripe.Refund> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'requires_capture') {
      // Payment was authorized but not captured - cancel it
      const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId);

      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'FAILED' },
      });

      this.logger.log(`Cancelled payment ${paymentIntentId}`);
      return canceled;
    } else if (paymentIntent.status === 'succeeded') {
      // Payment was captured - create refund
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: { reason: reason || 'Booking cancelled' },
      });

      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: 'REFUNDED' },
      });

      this.logger.log(`Refunded payment ${paymentIntentId}`);
      return refund;
    }

    throw new BadRequestException('Payment cannot be cancelled in its current state');
  }

  /**
   * Create a direct charge (no escrow, immediate transfer)
   */
  async createDirectPayment(
    bookingId: string,
    amount: number,
    currency: string = 'gbp',
    paymentMethodId: string,
  ): Promise<Stripe.PaymentIntent> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.provider.stripeAccountId) {
      throw new BadRequestException('Provider is not set up to receive payments');
    }

    const platformFee = Math.round(amount * (this.platformFeePercent / 100));

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: booking.provider.stripeAccountId,
      },
      metadata: {
        bookingId: bookingId,
        providerId: booking.providerId,
        customerId: booking.customerId,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    await this.prisma.payment.create({
      data: {
        bookingId: bookingId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        status: paymentIntent.status === 'succeeded' ? 'CAPTURED' : 'PENDING',
      },
    });

    return paymentIntent;
  }

  // ==================== WEBHOOKS ====================

  /**
   * Construct and verify webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    // Check for duplicate event (idempotency)
    const existingEvent = await this.prisma.stripeEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent) {
      this.logger.log(`Skipping duplicate event ${event.id}`);
      return;
    }

    // Save event for idempotency
    await this.prisma.stripeEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        data: JSON.stringify(event.data),
        processed: false,
      },
    });

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object as Stripe.Transfer);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // Mark as processed
      await this.prisma.stripeEvent.update({
        where: { eventId: event.id },
        data: { processed: true },
      });
    } catch (error) {
      this.logger.error(`Error processing event ${event.id}:`, error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata.bookingId;

    if (bookingId) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'CAPTURED' },
      });

      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: 'CAPTURED' },
      });

      this.logger.log(`Payment succeeded for booking ${bookingId}`);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata.bookingId;

    if (bookingId) {
      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: 'FAILED' },
      });

      this.logger.log(`Payment failed for booking ${bookingId}`);
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const providerId = account.metadata?.providerId;

    if (providerId) {
      // You could update provider verification status based on account status
      this.logger.log(`Account ${account.id} updated for provider ${providerId}`);
    }
  }

  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    this.logger.log(`Transfer ${transfer.id} created to ${transfer.destination}`);

    // Update payment with transfer ID if needed
    const paymentIntentId = transfer.source_transaction;
    if (paymentIntentId && typeof paymentIntentId === 'string') {
      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { stripeTransferId: transfer.id },
      });
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get provider's balance from Stripe
   */
  async getProviderBalance(providerId: string): Promise<Stripe.Balance> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider?.stripeAccountId) {
      throw new BadRequestException('Provider does not have a Stripe account');
    }

    return this.stripe.balance.retrieve({
      stripeAccount: provider.stripeAccountId,
    });
  }

  /**
   * Get provider's recent payouts
   */
  async getProviderPayouts(providerId: string, limit: number = 10): Promise<Stripe.Payout[]> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider?.stripeAccountId) {
      throw new BadRequestException('Provider does not have a Stripe account');
    }

    const payouts = await this.stripe.payouts.list(
      { limit },
      { stripeAccount: provider.stripeAccountId },
    );

    return payouts.data;
  }
}
