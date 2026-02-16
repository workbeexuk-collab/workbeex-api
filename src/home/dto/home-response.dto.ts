import { ApiProperty } from '@nestjs/swagger';

export class PlatformStatsDto {
  @ApiProperty({ example: 500 })
  totalProviders: number;

  @ApiProperty({ example: 350 })
  verifiedProviders: number;

  @ApiProperty({ example: 10000 })
  completedJobs: number;

  @ApiProperty({ example: 4.9 })
  averageRating: number;

  @ApiProperty({ example: 5000 })
  totalCustomers: number;

  @ApiProperty({ example: 8500 })
  totalReviews: number;
}

export class FeaturedServiceDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'cleaning' })
  key: string;

  @ApiProperty({ example: 'cleaning' })
  slug: string;

  @ApiProperty({ example: 'sparkles' })
  icon: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  image: string | null;

  @ApiProperty({ example: 'Cleaning' })
  name: string;

  @ApiProperty({ example: 'Professional cleaning services' })
  description: string | null;

  @ApiProperty({ example: 45 })
  providerCount: number;

  @ApiProperty({ example: 4.8 })
  averageRating: number;

  @ApiProperty({ example: 320 })
  completedJobs: number;
}

export class TopProviderDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar: string | null;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 48 })
  reviewCount: number;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ example: 'Cleaning' })
  primaryService: string | null;

  @ApiProperty({ example: 156 })
  completedJobs: number;

  @ApiProperty({ example: true })
  isOnline: boolean;
}

export class TestimonialDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'Maria K.' })
  authorName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  authorAvatar: string | null;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ example: 'Excellent service!' })
  comment: string;

  @ApiProperty({ example: 'Cleaning' })
  service: string | null;
}

export class BlogPostDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'how-to-prepare-for-cleaning' })
  slug: string;

  @ApiProperty({ example: 'How to Prepare for a Cleaning' })
  title: string;

  @ApiProperty({ example: 'Learn the best tips...' })
  excerpt: string | null;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  imageUrl: string;

  @ApiProperty({ example: 5 })
  readTime: number;

  @ApiProperty({ example: 'tips' })
  category: string;
}

export class PromotionDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'WELCOME20' })
  code: string;

  @ApiProperty({ example: 'PERCENTAGE' })
  type: string;

  @ApiProperty({ example: 20 })
  value: number;

  @ApiProperty({ example: 'Get 20% Off' })
  title: string;

  @ApiProperty({ example: 'On your first booking' })
  description: string | null;

  @ApiProperty({ example: 'LIMITED OFFER' })
  tag: string | null;

  @ApiProperty({ example: '2025-12-31T23:59:59Z' })
  endDate: Date;
}

export class HomeResponseDto {
  @ApiProperty({ type: PlatformStatsDto })
  stats: PlatformStatsDto;

  @ApiProperty({ type: [FeaturedServiceDto] })
  featuredServices: FeaturedServiceDto[];

  @ApiProperty({ type: [FeaturedServiceDto] })
  allServices: FeaturedServiceDto[];

  @ApiProperty({ type: [TopProviderDto] })
  topProviders: TopProviderDto[];

  @ApiProperty({ type: [TestimonialDto] })
  testimonials: TestimonialDto[];

  @ApiProperty({ type: [BlogPostDto] })
  blogPosts: BlogPostDto[];

  @ApiProperty({ type: PromotionDto, nullable: true })
  featuredPromotion: PromotionDto | null;
}
