import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteRequestStatus, QuoteStatus } from '@prisma/client';

export interface CreateQuoteRequestDto {
  providerId: string;
  serviceId: string;
  description: string;
  location?: string;
  preferredDate?: string;
  budget?: number;
  images?: string[];
}

export interface CreateQuoteDto {
  quoteRequestId: string;
  amount: number;
  message: string;
  estimatedHours?: number;
  validDays?: number;
}

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  // Customer creates a quote request for a specific provider
  async createQuoteRequest(customerId: string, dto: CreateQuoteRequestDto) {
    // Verify provider exists
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Verify service exists
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Create quote request with 7 day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const quoteRequest = await this.prisma.quoteRequest.create({
      data: {
        customerId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        description: dto.description,
        location: dto.location,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        budget: dto.budget,
        images: dto.images || [],
        expiresAt,
        status: QuoteRequestStatus.OPEN,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        service: {
          include: {
            translations: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return quoteRequest;
  }

  // Customer gets their quote requests
  async getCustomerQuoteRequests(customerId: string, status?: QuoteRequestStatus) {
    const where: any = { customerId };
    if (status) {
      where.status = status;
    }

    const quoteRequests = await this.prisma.quoteRequest.findMany({
      where,
      include: {
        service: {
          include: {
            translations: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        quotes: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quoteRequests;
  }

  // Provider gets incoming quote requests
  async getProviderQuoteRequests(providerId: string, status?: QuoteRequestStatus) {
    const where: any = { providerId };
    if (status) {
      where.status = status;
    }

    const quoteRequests = await this.prisma.quoteRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        service: {
          include: {
            translations: true,
          },
        },
        quotes: {
          where: {
            providerId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quoteRequests;
  }

  // Provider submits a quote
  async createQuote(providerId: string, dto: CreateQuoteDto) {
    // Verify quote request exists and is for this provider
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id: dto.quoteRequestId },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found');
    }

    if (quoteRequest.providerId !== providerId) {
      throw new ForbiddenException('This quote request is not for you');
    }

    if (quoteRequest.status !== QuoteRequestStatus.OPEN) {
      throw new BadRequestException('This quote request is no longer open');
    }

    // Check if provider already submitted a quote
    const existingQuote = await this.prisma.quote.findFirst({
      where: {
        quoteRequestId: dto.quoteRequestId,
        providerId,
      },
    });

    if (existingQuote) {
      throw new BadRequestException('You have already submitted a quote for this request');
    }

    // Create quote with validity period
    const validDays = dto.validDays || 7;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const quote = await this.prisma.quote.create({
      data: {
        quoteRequestId: dto.quoteRequestId,
        providerId,
        amount: dto.amount,
        message: dto.message,
        estimatedHours: dto.estimatedHours,
        validUntil,
        status: QuoteStatus.PENDING,
      },
      include: {
        quoteRequest: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            service: {
              include: {
                translations: true,
              },
            },
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Update quote request status to QUOTED
    await this.prisma.quoteRequest.update({
      where: { id: dto.quoteRequestId },
      data: { status: QuoteRequestStatus.QUOTED },
    });

    return quote;
  }

  // Customer gets quotes for their requests
  async getCustomerQuotes(customerId: string, status?: QuoteStatus) {
    const quotes = await this.prisma.quote.findMany({
      where: {
        quoteRequest: {
          customerId,
        },
        ...(status && { status }),
      },
      include: {
        quoteRequest: {
          include: {
            service: {
              include: {
                translations: true,
              },
            },
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quotes;
  }

  // Provider gets their submitted quotes
  async getProviderQuotes(providerId: string, status?: QuoteStatus) {
    const where: any = { providerId };
    if (status) {
      where.status = status;
    }

    const quotes = await this.prisma.quote.findMany({
      where,
      include: {
        quoteRequest: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            service: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return quotes;
  }

  // Customer accepts a quote
  async acceptQuote(customerId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteRequest: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.quoteRequest.customerId !== customerId) {
      throw new ForbiddenException('This quote is not for you');
    }

    if (quote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException('This quote has already been processed');
    }

    // Accept this quote
    const updatedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.ACCEPTED },
      include: {
        quoteRequest: {
          include: {
            service: {
              include: {
                translations: true,
              },
            },
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Update quote request status
    await this.prisma.quoteRequest.update({
      where: { id: quote.quoteRequestId },
      data: { status: QuoteRequestStatus.ACCEPTED },
    });

    // Reject other quotes for this request
    await this.prisma.quote.updateMany({
      where: {
        quoteRequestId: quote.quoteRequestId,
        id: { not: quoteId },
        status: QuoteStatus.PENDING,
      },
      data: { status: QuoteStatus.REJECTED },
    });

    return updatedQuote;
  }

  // Customer rejects a quote
  async rejectQuote(customerId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteRequest: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.quoteRequest.customerId !== customerId) {
      throw new ForbiddenException('This quote is not for you');
    }

    if (quote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException('This quote has already been processed');
    }

    const updatedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.REJECTED },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updatedQuote;
  }

  // Get single quote request details
  async getQuoteRequest(quoteRequestId: string, userId: string) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id: quoteRequestId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        service: {
          include: {
            translations: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        quotes: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found');
    }

    // Check if user is the customer or the provider
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    const isCustomer = quoteRequest.customerId === userId;
    const isProvider = provider && quoteRequest.providerId === provider.id;

    if (!isCustomer && !isProvider) {
      throw new ForbiddenException('You do not have access to this quote request');
    }

    return quoteRequest;
  }

  // Provider withdraws their quote
  async withdrawQuote(providerId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.providerId !== providerId) {
      throw new ForbiddenException('This is not your quote');
    }

    if (quote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException('This quote has already been processed');
    }

    const updatedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.WITHDRAWN },
    });

    return updatedQuote;
  }

  // Cancel a quote request (customer only)
  async cancelQuoteRequest(customerId: string, quoteRequestId: string) {
    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id: quoteRequestId },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found');
    }

    if (quoteRequest.customerId !== customerId) {
      throw new ForbiddenException('This is not your quote request');
    }

    if (quoteRequest.status === QuoteRequestStatus.ACCEPTED) {
      throw new BadRequestException('Cannot cancel an accepted quote request');
    }

    // Cancel the quote request
    const updatedQuoteRequest = await this.prisma.quoteRequest.update({
      where: { id: quoteRequestId },
      data: { status: QuoteRequestStatus.CANCELLED },
    });

    // Reject all pending quotes
    await this.prisma.quote.updateMany({
      where: {
        quoteRequestId,
        status: QuoteStatus.PENDING,
      },
      data: { status: QuoteStatus.REJECTED },
    });

    return updatedQuoteRequest;
  }
}
