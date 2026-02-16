import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ServiceWithTranslations {
  id: string;
  key: string;
  slug: string;
  icon: string;
  image: string | null;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  translations: {
    language: string;
    name: string;
    description: string | null;
  }[];
  providerCount?: number;
}

export interface CreateServiceDto {
  key: string;
  slug: string;
  icon: string;
  image?: string;
  popular?: boolean;
  active?: boolean;
  sortOrder?: number;
  translations: {
    language: string;
    name: string;
    description?: string;
  }[];
}

export interface UpdateServiceDto {
  key?: string;
  slug?: string;
  icon?: string;
  image?: string;
  popular?: boolean;
  active?: boolean;
  sortOrder?: number;
  translations?: {
    language: string;
    name: string;
    description?: string;
  }[];
}

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // Get all services with translations
  async findAll(language?: string, includeInactive = false): Promise<ServiceWithTranslations[]> {
    const services = await this.prisma.service.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        translations: language
          ? { where: { language } }
          : true,
        _count: {
          select: { providers: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return services.map((service) => ({
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    }));
  }

  // Get popular services
  async findPopular(language?: string): Promise<ServiceWithTranslations[]> {
    const services = await this.prisma.service.findMany({
      where: { popular: true, active: true },
      include: {
        translations: language
          ? { where: { language } }
          : true,
        _count: {
          select: { providers: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((service) => ({
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    }));
  }

  // Get service by slug
  async findBySlug(slug: string, language?: string): Promise<ServiceWithTranslations> {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: {
        translations: language
          ? { where: { language } }
          : true,
        _count: {
          select: { providers: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    };
  }

  // Get service by ID
  async findById(id: string, language?: string): Promise<ServiceWithTranslations> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        translations: language
          ? { where: { language } }
          : true,
        _count: {
          select: { providers: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    };
  }

  // Create a new service (Admin only)
  async create(data: CreateServiceDto): Promise<ServiceWithTranslations> {
    // Check for duplicate key or slug
    const existing = await this.prisma.service.findFirst({
      where: {
        OR: [{ key: data.key }, { slug: data.slug }],
      },
    });

    if (existing) {
      throw new ConflictException('Service with this key or slug already exists');
    }

    const service = await this.prisma.service.create({
      data: {
        key: data.key,
        slug: data.slug,
        icon: data.icon,
        image: data.image,
        popular: data.popular ?? false,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
        translations: {
          create: data.translations.map((t) => ({
            language: t.language,
            name: t.name,
            description: t.description,
          })),
        },
      },
      include: {
        translations: true,
        _count: {
          select: { providers: true },
        },
      },
    });

    return {
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    };
  }

  // Update a service (Admin only)
  async update(id: string, data: UpdateServiceDto): Promise<ServiceWithTranslations> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    // Check for duplicate key or slug if being changed
    if (data.key || data.slug) {
      const duplicate = await this.prisma.service.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                data.key ? { key: data.key } : {},
                data.slug ? { slug: data.slug } : {},
              ].filter((o) => Object.keys(o).length > 0),
            },
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException('Service with this key or slug already exists');
      }
    }

    // Build update data
    const updateData: Prisma.ServiceUpdateInput = {};
    if (data.key !== undefined) updateData.key = data.key;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.popular !== undefined) updateData.popular = data.popular;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    // Update service
    const service = await this.prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        translations: true,
        _count: {
          select: { providers: true },
        },
      },
    });

    // Update translations if provided
    if (data.translations && data.translations.length > 0) {
      for (const translation of data.translations) {
        await this.prisma.serviceTranslation.upsert({
          where: {
            serviceId_language: {
              serviceId: id,
              language: translation.language,
            },
          },
          update: {
            name: translation.name,
            description: translation.description,
          },
          create: {
            serviceId: id,
            language: translation.language,
            name: translation.name,
            description: translation.description,
          },
        });
      }

      // Refetch with updated translations
      const updated = await this.prisma.service.findUnique({
        where: { id },
        include: {
          translations: true,
          _count: {
            select: { providers: true },
          },
        },
      });

      return {
        id: updated!.id,
        key: updated!.key,
        slug: updated!.slug,
        icon: updated!.icon,
        image: updated!.image,
        popular: updated!.popular,
        active: updated!.active,
        sortOrder: updated!.sortOrder,
        translations: updated!.translations.map((t) => ({
          language: t.language,
          name: t.name,
          description: t.description,
        })),
        providerCount: updated!._count.providers,
      };
    }

    return {
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    };
  }

  // Delete a service (Admin only)
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { providers: true, bookings: true, quoteRequests: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    // Prevent deletion if service has providers, bookings, or quote requests
    if (
      existing._count.providers > 0 ||
      existing._count.bookings > 0 ||
      existing._count.quoteRequests > 0
    ) {
      throw new ConflictException(
        'Cannot delete service with existing providers, bookings, or quote requests. Consider deactivating it instead.',
      );
    }

    await this.prisma.service.delete({
      where: { id },
    });
  }

  // Search services by name
  async search(query: string, language = 'en'): Promise<ServiceWithTranslations[]> {
    const services = await this.prisma.service.findMany({
      where: {
        active: true,
        translations: {
          some: {
            language,
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
      },
      include: {
        translations: { where: { language } },
        _count: {
          select: { providers: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return services.map((service) => ({
      id: service.id,
      key: service.key,
      slug: service.slug,
      icon: service.icon,
      image: service.image,
      popular: service.popular,
      active: service.active,
      sortOrder: service.sortOrder,
      translations: service.translations.map((t) => ({
        language: t.language,
        name: t.name,
        description: t.description,
      })),
      providerCount: service._count.providers,
    }));
  }
}
