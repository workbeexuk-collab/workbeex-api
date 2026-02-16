import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PriceType } from '@prisma/client';

export interface ProviderListItem {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  bio: string | null;
  hourlyRate: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  isOnline: boolean;
  services: {
    id: string;
    name: string;
    slug: string;
    price: number | null;
    priceType: string;
  }[];
}

export interface ProviderDetail extends ProviderListItem {
  responseTime: number;
  serviceRadius: number | null;
  trustScore: number;
  lastActiveAt: Date | null;
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string;
    response: string | null;
    author: {
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
    createdAt: Date;
  }[];
}

export interface ProvidersFilter {
  serviceSlug?: string;
  serviceId?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  minRating?: number;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'rating' | 'reviews' | 'price_low' | 'price_high' | 'completed' | 'distance';
  page?: number;
  limit?: number;
  language?: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: ProvidersFilter): Promise<{
    providers: (ProviderListItem & { distance?: number })[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      serviceSlug,
      serviceId,
      location,
      latitude,
      longitude,
      radius = 50, // default 50km
      minRating,
      verified,
      minPrice,
      maxPrice,
      sortBy = 'rating',
      page = 1,
      limit = 12,
      language = 'en',
    } = filters;

    // Build where clause
    const where: Prisma.ProviderWhereInput = {
      user: { status: 'ACTIVE' },
    };

    // Filter by service
    if (serviceSlug || serviceId) {
      where.services = {
        some: serviceId
          ? { serviceId }
          : { service: { slug: serviceSlug } },
      };
    }

    // Filter by location
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Filter by rating
    if (minRating) {
      where.rating = { gte: minRating };
    }

    // Filter by verified
    if (verified !== undefined) {
      where.verified = verified;
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.services = {
        ...where.services,
        some: {
          ...(where.services as any)?.some,
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        },
      };
    }

    // Build orderBy
    let orderBy: Prisma.ProviderOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'reviews':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'completed':
        orderBy = { completedJobs: 'desc' };
        break;
      case 'price_low':
        orderBy = { hourlyRate: 'asc' };
        break;
      case 'price_high':
        orderBy = { hourlyRate: 'desc' };
        break;
      default:
        orderBy = { rating: 'desc' };
    }

    // For geo-search, we need to get all providers with coordinates first
    // then filter by distance
    const isGeoSearch = latitude !== undefined && longitude !== undefined;

    if (isGeoSearch) {
      // Add constraint for providers with coordinates
      where.latitude = { not: null };
      where.longitude = { not: null };
    }

    // Get all providers for geo-filtering (we'll paginate after filtering)
    const allProviders = await this.prisma.provider.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        services: {
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
      orderBy: isGeoSearch ? undefined : orderBy, // We'll sort manually for geo-search
    });

    // Map and calculate distances
    let mappedProviders = allProviders.map((p) => {
      const providerLat = p.latitude ? Number(p.latitude) : null;
      const providerLng = p.longitude ? Number(p.longitude) : null;

      let distance: number | undefined = undefined;
      if (isGeoSearch && providerLat && providerLng) {
        distance = calculateDistance(latitude!, longitude!, providerLat, providerLng);
      }

      return {
        id: p.id,
        userId: p.userId,
        user: p.user,
        bio: p.bio,
        hourlyRate: p.hourlyRate ? Number(p.hourlyRate) : null,
        location: p.location,
        latitude: providerLat,
        longitude: providerLng,
        verified: p.verified,
        rating: Number(p.rating),
        reviewCount: p.reviewCount,
        completedJobs: p.completedJobs,
        isOnline: p.isOnline,
        services: p.services.map((ps) => ({
          id: ps.service.id,
          name: ps.service.translations[0]?.name || ps.service.key,
          slug: ps.service.slug,
          price: ps.price ? Number(ps.price) : null,
          priceType: ps.priceType,
        })),
        distance,
      };
    });

    // Filter by radius if geo-search
    if (isGeoSearch) {
      mappedProviders = mappedProviders.filter(
        (p) => p.distance !== undefined && p.distance <= radius
      );

      // Sort by distance or other criteria
      if (sortBy === 'distance') {
        mappedProviders.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else {
        // Apply regular sorting
        switch (sortBy) {
          case 'rating':
            mappedProviders.sort((a, b) => b.rating - a.rating);
            break;
          case 'reviews':
            mappedProviders.sort((a, b) => b.reviewCount - a.reviewCount);
            break;
          case 'completed':
            mappedProviders.sort((a, b) => b.completedJobs - a.completedJobs);
            break;
          case 'price_low':
            mappedProviders.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
            break;
          case 'price_high':
            mappedProviders.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
            break;
        }
      }
    }

    const total = mappedProviders.length;

    // Paginate
    const paginatedProviders = mappedProviders.slice((page - 1) * limit, page * limit);

    return {
      providers: paginatedProviders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, language = 'en'): Promise<ProviderDetail> {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        services: {
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
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
        portfolio: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Get reviews separately
    const reviews = await this.prisma.review.findMany({
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
      take: 10,
    });

    return {
      id: provider.id,
      userId: provider.userId,
      user: provider.user,
      bio: provider.bio,
      hourlyRate: provider.hourlyRate ? Number(provider.hourlyRate) : null,
      location: provider.location,
      latitude: provider.latitude ? Number(provider.latitude) : null,
      longitude: provider.longitude ? Number(provider.longitude) : null,
      verified: provider.verified,
      rating: Number(provider.rating),
      reviewCount: provider.reviewCount,
      completedJobs: provider.completedJobs,
      isOnline: provider.isOnline,
      responseTime: provider.responseTime,
      serviceRadius: provider.serviceRadius,
      trustScore: provider.trustScore,
      lastActiveAt: provider.lastActiveAt,
      services: provider.services.map((ps) => ({
        id: ps.service.id,
        name: ps.service.translations[0]?.name || ps.service.key,
        slug: ps.service.slug,
        price: ps.price ? Number(ps.price) : null,
        priceType: ps.priceType,
      })),
      availability: provider.availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      })),
      portfolio: provider.portfolio.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        response: r.response,
        author: r.author,
        createdAt: r.createdAt,
      })),
    };
  }

  async findByUserId(userId: string, language = 'en'): Promise<ProviderDetail> {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return this.findById(provider.id, language);
  }

  async getProvidersByService(
    serviceSlug: string,
    language = 'en',
    page = 1,
    limit = 12,
  ) {
    return this.findAll({
      serviceSlug,
      language,
      page,
      limit,
      sortBy: 'rating',
    });
  }

  async searchProviders(
    query: string,
    language = 'en',
    page = 1,
    limit = 12,
  ): Promise<{
    providers: ProviderListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: Prisma.ProviderWhereInput = {
      user: { status: 'ACTIVE' },
      OR: [
        { bio: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { user: { firstName: { contains: query, mode: 'insensitive' } } },
        { user: { lastName: { contains: query, mode: 'insensitive' } } },
        {
          services: {
            some: {
              service: {
                translations: {
                  some: {
                    language,
                    name: { contains: query, mode: 'insensitive' },
                  },
                },
              },
            },
          },
        },
      ],
    };

    const total = await this.prisma.provider.count({ where });

    const providers = await this.prisma.provider.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        services: {
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
      orderBy: { rating: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      providers: providers.map((p) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        bio: p.bio,
        hourlyRate: p.hourlyRate ? Number(p.hourlyRate) : null,
        location: p.location,
        latitude: p.latitude ? Number(p.latitude) : null,
        longitude: p.longitude ? Number(p.longitude) : null,
        verified: p.verified,
        rating: Number(p.rating),
        reviewCount: p.reviewCount,
        completedJobs: p.completedJobs,
        isOnline: p.isOnline,
        services: p.services.map((ps) => ({
          id: ps.service.id,
          name: ps.service.translations[0]?.name || ps.service.key,
          slug: ps.service.slug,
          price: ps.price ? Number(ps.price) : null,
          priceType: ps.priceType,
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== PROVIDER MANAGEMENT ====================

  async updateProfile(
    userId: string,
    data: {
      bio?: string;
      hourlyRate?: number;
      location?: string;
      latitude?: number;
      longitude?: number;
      serviceRadius?: number;
      responseTime?: number;
    },
  ): Promise<ProviderDetail> {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        bio: data.bio,
        hourlyRate: data.hourlyRate,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        serviceRadius: data.serviceRadius,
        responseTime: data.responseTime,
      },
    });

    return this.findById(provider.id);
  }

  // ==================== SERVICES MANAGEMENT ====================

  async addService(
    userId: string,
    serviceId: string,
    price: number | null,
    priceType: PriceType = 'HOURLY',
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    // Check if service exists
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if already added
    const existing = await this.prisma.providerService.findUnique({
      where: {
        providerId_serviceId: {
          providerId: provider.id,
          serviceId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Service already added');
    }

    await this.prisma.providerService.create({
      data: {
        providerId: provider.id,
        serviceId,
        price,
        priceType,
      },
    });

    return this.findById(provider.id);
  }

  async updateService(
    userId: string,
    serviceId: string,
    price: number | null,
    priceType: PriceType,
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const providerService = await this.prisma.providerService.findUnique({
      where: {
        providerId_serviceId: {
          providerId: provider.id,
          serviceId,
        },
      },
    });

    if (!providerService) {
      throw new NotFoundException('Service not found in provider profile');
    }

    await this.prisma.providerService.update({
      where: { id: providerService.id },
      data: { price, priceType },
    });

    return this.findById(provider.id);
  }

  async removeService(userId: string, serviceId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const providerService = await this.prisma.providerService.findUnique({
      where: {
        providerId_serviceId: {
          providerId: provider.id,
          serviceId,
        },
      },
    });

    if (!providerService) {
      throw new NotFoundException('Service not found in provider profile');
    }

    await this.prisma.providerService.delete({
      where: { id: providerService.id },
    });

    return this.findById(provider.id);
  }

  // ==================== AVAILABILITY MANAGEMENT ====================

  async updateAvailability(
    userId: string,
    availability: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[],
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    // Validate availability data
    for (const slot of availability) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new BadRequestException('Invalid day of week');
      }
      // Validate time format (HH:mm)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        throw new BadRequestException('Invalid time format. Use HH:mm');
      }
    }

    // Delete existing availability and recreate
    await this.prisma.providerAvailability.deleteMany({
      where: { providerId: provider.id },
    });

    await this.prisma.providerAvailability.createMany({
      data: availability.map((slot) => ({
        providerId: provider.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      })),
    });

    return this.findById(provider.id);
  }

  // ==================== PORTFOLIO MANAGEMENT ====================

  async addPortfolioItem(
    userId: string,
    data: {
      title: string;
      description?: string;
      imageUrl: string;
      serviceId?: string;
    },
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    // Validate service if provided
    if (data.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
    }

    await this.prisma.portfolioItem.create({
      data: {
        providerId: provider.id,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        serviceId: data.serviceId,
      },
    });

    return this.findById(provider.id);
  }

  async updatePortfolioItem(
    userId: string,
    portfolioId: string,
    data: {
      title?: string;
      description?: string;
      serviceId?: string;
    },
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const portfolio = await this.prisma.portfolioItem.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.providerId !== provider.id) {
      throw new NotFoundException('Portfolio item not found');
    }

    await this.prisma.portfolioItem.update({
      where: { id: portfolioId },
      data: {
        title: data.title,
        description: data.description,
        serviceId: data.serviceId,
      },
    });

    return this.findById(provider.id);
  }

  async removePortfolioItem(userId: string, portfolioId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const portfolio = await this.prisma.portfolioItem.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.providerId !== provider.id) {
      throw new NotFoundException('Portfolio item not found');
    }

    await this.prisma.portfolioItem.delete({
      where: { id: portfolioId },
    });

    return this.findById(provider.id);
  }

  // ==================== ONLINE STATUS ====================

  async setOnlineStatus(userId: string, isOnline: boolean) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        isOnline,
        lastActiveAt: new Date(),
      },
    });

    return { success: true };
  }
}
