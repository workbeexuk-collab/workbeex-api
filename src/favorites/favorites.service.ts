import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, providerId: string) {
    // Check if provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Check if already favorited
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_providerId: { userId, providerId },
      },
    });

    if (existing) {
      throw new ConflictException('Already in favorites');
    }

    return this.prisma.favorite.create({
      data: { userId, providerId },
      include: {
        provider: {
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
                service: true,
              },
            },
          },
        },
      },
    });
  }

  async removeFavorite(userId: string, providerId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_providerId: { userId, providerId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { success: true };
  }

  async getFavorites(userId: string, language?: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        provider: {
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
                    translations: language
                      ? { where: { language } }
                      : true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((fav) => ({
      id: fav.id,
      createdAt: fav.createdAt,
      provider: {
        id: fav.provider.id,
        user: fav.provider.user,
        bio: fav.provider.bio,
        hourlyRate: fav.provider.hourlyRate ? Number(fav.provider.hourlyRate) : null,
        location: fav.provider.location,
        verified: fav.provider.verified,
        rating: Number(fav.provider.rating),
        reviewCount: fav.provider.reviewCount,
        completedJobs: fav.provider.completedJobs,
        isOnline: fav.provider.isOnline,
        services: fav.provider.services.map((ps) => ({
          id: ps.service.id,
          name: ps.service.translations?.[0]?.name || ps.service.key,
          slug: ps.service.slug,
        })),
      },
    }));
  }

  async isFavorite(userId: string, providerId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_providerId: { userId, providerId },
      },
    });

    return !!favorite;
  }

  async toggleFavorite(userId: string, providerId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_providerId: { userId, providerId },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    } else {
      // Check if provider exists
      const provider = await this.prisma.provider.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new NotFoundException('Provider not found');
      }

      await this.prisma.favorite.create({
        data: { userId, providerId },
      });
      return { isFavorite: true };
    }
  }
}
