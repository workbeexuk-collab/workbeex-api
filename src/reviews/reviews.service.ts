import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Create a review for a completed booking
  async createReview(
    userId: string,
    bookingId: string,
    rating: number,
    comment: string,
  ) {
    // Check booking exists and is completed
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== userId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review completed bookings');
    }

    // Check if already reviewed
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId,
        authorId: userId,
        reviewedId: booking.provider.userId,
        rating,
        comment,
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update provider's rating
    await this.updateProviderRating(booking.providerId);

    return review;
  }

  // Get reviews for a provider
  async getProviderReviews(providerId: string, page = 1, limit = 10) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          reviewedId: provider.userId,
          visible: true,
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          reviewedId: provider.userId,
          visible: true,
        },
      }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Provider responds to a review
  async respondToReview(userId: string, reviewId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewedId !== userId) {
      throw new ForbiddenException('You can only respond to reviews about you');
    }

    if (review.response) {
      throw new BadRequestException('You have already responded to this review');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date(),
      },
    });
  }

  // Mark review as helpful
  async markHelpful(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if already marked
    const existing = await this.prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: { reviewId, userId },
      },
    });

    if (existing) {
      // Remove helpful mark
      await this.prisma.reviewHelpful.delete({
        where: { id: existing.id },
      });
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      });
      return { helpful: false };
    } else {
      // Add helpful mark
      await this.prisma.reviewHelpful.create({
        data: { reviewId, userId },
      });
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      });
      return { helpful: true };
    }
  }

  // Update provider's average rating
  private async updateProviderRating(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) return;

    const result = await this.prisma.review.aggregate({
      where: {
        reviewedId: provider.userId,
        visible: true,
      },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count,
      },
    });
  }
}
