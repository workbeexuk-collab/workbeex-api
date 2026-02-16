import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

class CreateReviewDto {
  bookingId: string;
  rating: number;
  comment: string;
}

class RespondToReviewDto {
  response: string;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  // Create a review
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewsService.createReview(
      user.id,
      dto.bookingId,
      dto.rating,
      dto.comment,
    );
    return {
      success: true,
      data: review,
    };
  }

  // Get provider reviews (public)
  @Get('provider/:providerId')
  @Public()
  async getProviderReviews(
    @Param('providerId') providerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.reviewsService.getProviderReviews(
      providerId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
    return {
      success: true,
      data: result.reviews,
      pagination: result.pagination,
    };
  }

  // Respond to a review
  @Post(':reviewId/respond')
  @UseGuards(JwtAuthGuard)
  async respondToReview(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondToReviewDto,
  ) {
    const review = await this.reviewsService.respondToReview(
      user.id,
      reviewId,
      dto.response,
    );
    return {
      success: true,
      data: review,
    };
  }

  // Mark review as helpful
  @Post(':reviewId/helpful')
  @UseGuards(JwtAuthGuard)
  async markHelpful(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
  ) {
    const result = await this.reviewsService.markHelpful(user.id, reviewId);
    return {
      success: true,
      data: result,
    };
  }
}
