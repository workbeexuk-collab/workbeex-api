import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { QuotesService, CreateQuoteRequestDto, CreateQuoteDto } from './quotes.service';
import { CurrentUser, Roles } from '../common/decorators';
import { QuoteRequestStatus, QuoteStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== CUSTOMER ENDPOINTS ====================

  // Create a quote request (customer)
  @Post('request')
  async createQuoteRequest(
    @CurrentUser() user: User,
    @Body() dto: CreateQuoteRequestDto,
  ) {
    const quoteRequest = await this.quotesService.createQuoteRequest(user.id, dto);
    return {
      success: true,
      data: quoteRequest,
    };
  }

  // Get my quote requests (customer)
  @Get('requests/my')
  async getMyQuoteRequests(
    @CurrentUser() user: User,
    @Query('status') status?: QuoteRequestStatus,
  ) {
    const quoteRequests = await this.quotesService.getCustomerQuoteRequests(
      user.id,
      status,
    );
    return {
      success: true,
      data: quoteRequests,
    };
  }

  // Get quotes received for my requests (customer)
  @Get('received')
  async getReceivedQuotes(
    @CurrentUser() user: User,
    @Query('status') status?: QuoteStatus,
  ) {
    const quotes = await this.quotesService.getCustomerQuotes(user.id, status);
    return {
      success: true,
      data: quotes,
    };
  }

  // Accept a quote (customer)
  @Put(':quoteId/accept')
  async acceptQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
  ) {
    const quote = await this.quotesService.acceptQuote(user.id, quoteId);
    return {
      success: true,
      data: quote,
    };
  }

  // Reject a quote (customer)
  @Put(':quoteId/reject')
  async rejectQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
  ) {
    const quote = await this.quotesService.rejectQuote(user.id, quoteId);
    return {
      success: true,
      data: quote,
    };
  }

  // Cancel a quote request (customer)
  @Delete('requests/:requestId')
  async cancelQuoteRequest(
    @CurrentUser() user: User,
    @Param('requestId') requestId: string,
  ) {
    const quoteRequest = await this.quotesService.cancelQuoteRequest(
      user.id,
      requestId,
    );
    return {
      success: true,
      data: quoteRequest,
    };
  }

  // ==================== PROVIDER ENDPOINTS ====================

  // Get incoming quote requests (provider)
  @Roles('PROVIDER')
  @Get('requests/incoming')
  async getIncomingQuoteRequests(
    @CurrentUser() user: User,
    @Query('status') status?: QuoteRequestStatus,
  ) {
    // Get provider ID from user
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return {
        success: true,
        data: [],
      };
    }

    const quoteRequests = await this.quotesService.getProviderQuoteRequests(
      provider.id,
      status,
    );
    return {
      success: true,
      data: quoteRequests,
    };
  }

  // Submit a quote (provider)
  @Roles('PROVIDER')
  @Post()
  async createQuote(
    @CurrentUser() user: User,
    @Body() dto: CreateQuoteDto,
  ) {
    // Get provider ID from user
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return {
        success: false,
        message: 'Provider profile not found',
      };
    }

    const quote = await this.quotesService.createQuote(provider.id, dto);
    return {
      success: true,
      data: quote,
    };
  }

  // Get my submitted quotes (provider)
  @Roles('PROVIDER')
  @Get('submitted')
  async getSubmittedQuotes(
    @CurrentUser() user: User,
    @Query('status') status?: QuoteStatus,
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return {
        success: true,
        data: [],
      };
    }

    const quotes = await this.quotesService.getProviderQuotes(provider.id, status);
    return {
      success: true,
      data: quotes,
    };
  }

  // Withdraw a quote (provider)
  @Roles('PROVIDER')
  @Put(':quoteId/withdraw')
  async withdrawQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return {
        success: false,
        message: 'Provider profile not found',
      };
    }

    const quote = await this.quotesService.withdrawQuote(provider.id, quoteId);
    return {
      success: true,
      data: quote,
    };
  }

  // ==================== SHARED ENDPOINTS ====================

  // Get single quote request details
  @Get('requests/:requestId')
  async getQuoteRequest(
    @CurrentUser() user: User,
    @Param('requestId') requestId: string,
  ) {
    const quoteRequest = await this.quotesService.getQuoteRequest(
      requestId,
      user.id,
    );
    return {
      success: true,
      data: quoteRequest,
    };
  }
}
