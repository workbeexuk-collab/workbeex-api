import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  private stripe: Stripe;
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Get user's current balance
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return { balance: Number(user.balance) };
  }

  /**
   * Create a Stripe Checkout Session for deposit
   */
  async createDepositSession(
    userId: string,
    amount: number,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    if (amount < 5) {
      throw new BadRequestException('Minimum deposit amount is £5');
    }

    if (amount > 500) {
      throw new BadRequestException('Maximum deposit amount is £500');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Create pending transaction
    const transaction = await this.prisma.balanceTransaction.create({
      data: {
        userId,
        amount: new Decimal(amount),
        type: 'DEPOSIT',
        status: 'PENDING',
        description: `Balance deposit - £${amount}`,
      },
    });

    // Create Stripe Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Account Balance Top-up',
              description: `Add £${amount} to your WorkBee balance`,
            },
            unit_amount: Math.round(amount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        transactionId: transaction.id,
        type: 'balance_deposit',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Update transaction with session ID
    await this.prisma.balanceTransaction.update({
      where: { id: transaction.id },
      data: { stripeSessionId: session.id },
    });

    this.logger.log(`Created deposit session ${session.id} for user ${userId}, amount: £${amount}`);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, transactionId, type } = session.metadata || {};

    if (type !== 'balance_deposit' || !userId || !transactionId) {
      return; // Not a balance deposit
    }

    // Check if already processed
    const transaction = await this.prisma.balanceTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status === 'COMPLETED') {
      this.logger.log(`Transaction ${transactionId} already processed or not found`);
      return;
    }

    // Update balance and transaction in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      });

      // Mark transaction as completed
      await tx.balanceTransaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      });
    });

    this.logger.log(`Deposit completed for user ${userId}, amount: £${transaction.amount}`);
  }

  /**
   * Handle failed/cancelled payment
   */
  async handlePaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
    const { transactionId, type } = session.metadata || {};

    if (type !== 'balance_deposit' || !transactionId) {
      return;
    }

    await this.prisma.balanceTransaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED' },
    });

    this.logger.log(`Deposit failed for transaction ${transactionId}`);
  }

  /**
   * Get user's transaction history
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    transactions: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.balanceTransaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Construct and verify Stripe webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
