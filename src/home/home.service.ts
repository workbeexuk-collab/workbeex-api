import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  HomeResponseDto,
  PlatformStatsDto,
  FeaturedServiceDto,
  TopProviderDto,
  TestimonialDto,
  BlogPostDto,
  PromotionDto,
} from './dto/home-response.dto';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(private prisma: PrismaService) {}

  async getHomeData(language: string = 'en'): Promise<HomeResponseDto> {
    const [
      stats,
      featuredServices,
      allServices,
      topProviders,
      testimonials,
      blogPosts,
      featuredPromotion,
    ] = await Promise.all([
      this.getPlatformStats(),
      this.getFeaturedServices(language, 4),
      this.getAllServices(language),
      this.getTopProviders(language, 6),
      this.getTestimonials(language, 4),
      this.getBlogPosts(language, 3),
      this.getFeaturedPromotion(language),
    ]);

    return {
      stats,
      featuredServices,
      allServices,
      topProviders,
      testimonials,
      blogPosts,
      featuredPromotion,
    };
  }

  async getPlatformStats(): Promise<PlatformStatsDto> {
    // Try to get cached stats first
    const cachedStats = await this.prisma.platformStats.findUnique({
      where: { key: 'main' },
    });

    if (cachedStats) {
      return {
        totalProviders: cachedStats.totalProviders,
        verifiedProviders: cachedStats.verifiedProviders,
        completedJobs: cachedStats.completedJobs,
        averageRating: Number(cachedStats.averageRating),
        totalCustomers: cachedStats.totalCustomers,
        totalReviews: cachedStats.totalReviews,
      };
    }

    // Calculate live if no cache
    return this.calculateAndCacheStats();
  }

  async calculateAndCacheStats(): Promise<PlatformStatsDto> {
    const [
      totalProviders,
      verifiedProviders,
      completedJobs,
      avgRatingResult,
      totalCustomers,
      totalReviews,
    ] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { verified: true } }),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.provider.aggregate({
        _avg: { rating: true },
        where: { reviewCount: { gt: 0 } },
      }),
      this.prisma.user.count({ where: { type: 'CUSTOMER' } }),
      this.prisma.review.count({ where: { visible: true } }),
    ]);

    const averageRating = avgRatingResult._avg.rating
      ? Number(avgRatingResult._avg.rating)
      : 0;

    const stats: PlatformStatsDto = {
      totalProviders,
      verifiedProviders,
      completedJobs,
      averageRating: Math.round(averageRating * 10) / 10,
      totalCustomers,
      totalReviews,
    };

    // Cache the stats
    await this.prisma.platformStats.upsert({
      where: { key: 'main' },
      create: {
        key: 'main',
        ...stats,
      },
      update: stats,
    });

    return stats;
  }

  async getFeaturedServices(language: string, limit: number): Promise<FeaturedServiceDto[]> {
    const services = await this.prisma.service.findMany({
      where: {
        active: true,
        popular: true,
      },
      include: {
        translations: {
          where: { language },
        },
        providers: {
          include: {
            provider: {
              select: {
                rating: true,
                completedJobs: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    return services.map((service) => {
      const translation = service.translations[0];
      const providerCount = service.providers.length;
      const ratings = service.providers
        .map((p) => Number(p.provider.rating))
        .filter((r) => r > 0);
      const averageRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;
      const completedJobs = service.providers.reduce(
        (sum, p) => sum + p.provider.completedJobs,
        0,
      );

      return {
        id: service.id,
        key: service.key,
        slug: service.slug,
        icon: service.icon,
        image: service.image,
        name: translation?.name || service.key,
        description: translation?.description || null,
        providerCount,
        averageRating,
        completedJobs,
      };
    });
  }

  async getAllServices(language: string): Promise<FeaturedServiceDto[]> {
    const services = await this.prisma.service.findMany({
      where: { active: true },
      include: {
        translations: {
          where: { language },
        },
        providers: {
          include: {
            provider: {
              select: {
                rating: true,
                completedJobs: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((service) => {
      const translation = service.translations[0];
      const providerCount = service.providers.length;
      const ratings = service.providers
        .map((p) => Number(p.provider.rating))
        .filter((r) => r > 0);
      const averageRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0;
      const completedJobs = service.providers.reduce(
        (sum, p) => sum + p.provider.completedJobs,
        0,
      );

      return {
        id: service.id,
        key: service.key,
        slug: service.slug,
        icon: service.icon,
        image: service.image,
        name: translation?.name || service.key,
        description: translation?.description || null,
        providerCount,
        averageRating,
        completedJobs,
      };
    });
  }

  async getTopProviders(language: string, limit: number): Promise<TopProviderDto[]> {
    const providers = await this.prisma.provider.findMany({
      where: {
        user: { status: 'ACTIVE' },
        reviewCount: { gt: 0 },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        services: {
          take: 1,
          include: {
            service: {
              include: {
                translations: {
                  where: { language },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });

    return providers.map((provider) => {
      const primaryServiceTranslation = provider.services[0]?.service?.translations[0];
      const primaryServiceName =
        primaryServiceTranslation?.name || provider.services[0]?.service?.key || null;

      return {
        id: provider.id,
        firstName: provider.user.firstName,
        lastName: provider.user.lastName,
        avatar: provider.user.avatar,
        rating: Number(provider.rating),
        reviewCount: provider.reviewCount,
        verified: provider.verified,
        primaryService: primaryServiceName,
        completedJobs: provider.completedJobs,
        isOnline: provider.isOnline,
      };
    });
  }

  async getTestimonials(language: string, limit: number): Promise<TestimonialDto[]> {
    const testimonials = await this.prisma.testimonial.findMany({
      where: {
        visible: true,
        featured: true,
      },
      include: {
        translations: {
          where: { language },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    return testimonials.map((testimonial) => {
      const translation = testimonial.translations[0];

      return {
        id: testimonial.id,
        authorName: testimonial.authorName,
        authorAvatar: testimonial.authorAvatar,
        rating: testimonial.rating,
        comment: translation?.comment || testimonial.comment,
        service: translation?.service || testimonial.service,
      };
    });
  }

  async getBlogPosts(language: string, limit: number): Promise<BlogPostDto[]> {
    const posts = await this.prisma.blogPost.findMany({
      where: {
        published: true,
        featured: true,
      },
      include: {
        translations: {
          where: { language },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    return posts.map((post) => {
      const translation = post.translations[0];

      return {
        id: post.id,
        slug: post.slug,
        title: translation?.title || post.slug,
        excerpt: translation?.excerpt || null,
        imageUrl: post.imageUrl,
        readTime: post.readTime,
        category: post.category,
      };
    });
  }

  async getFeaturedPromotion(language: string): Promise<PromotionDto | null> {
    const now = new Date();

    // Get all active featured promotions
    const promotions = await this.prisma.promotion.findMany({
      where: {
        active: true,
        featured: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        translations: {
          where: { language },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    // Filter for ones that haven't exceeded usage limit
    const promotion = promotions.find(
      (p) => p.usageLimit === null || p.usageCount < p.usageLimit,
    );

    if (!promotion) return null;

    const translation = promotion.translations[0];

    return {
      id: promotion.id,
      code: promotion.code,
      type: promotion.type,
      value: Number(promotion.value),
      title: translation?.title || `${promotion.value}% Off`,
      description: translation?.description || null,
      tag: translation?.tag || null,
      endDate: promotion.endDate,
    };
  }

  // Update stats - can be called manually or via a cron job
  async updatePlatformStats() {
    this.logger.log('Updating platform stats...');
    try {
      await this.calculateAndCacheStats();
      this.logger.log('Platform stats updated successfully');
    } catch (error) {
      this.logger.error('Failed to update platform stats', error);
    }
  }
}
