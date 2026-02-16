import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { Public, Roles } from '../common/decorators';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== DTOs ====================

class UpdateProviderProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  serviceRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  responseTime?: number;
}

class AddServiceDto {
  @IsString()
  serviceId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['HOURLY', 'FIXED', 'QUOTE_BASED'])
  priceType?: 'HOURLY' | 'FIXED' | 'QUOTE_BASED';
}

class UpdateServiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['HOURLY', 'FIXED', 'QUOTE_BASED'])
  priceType?: 'HOURLY' | 'FIXED' | 'QUOTE_BASED';
}

class AvailabilitySlotDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  endTime: string;

  @IsBoolean()
  isAvailable: boolean;
}

class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}

class AddPortfolioItemDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}

class UpdatePortfolioItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}

class SetOnlineStatusDto {
  @IsBoolean()
  isOnline: boolean;
}

// ==================== CONTROLLER ====================

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  // Get all providers with filters (public)
  @Public()
  @Get()
  async findAll(
    @Query('serviceSlug') serviceSlug?: string,
    @Query('serviceId') serviceId?: string,
    @Query('location') location?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radius') radius?: string,
    @Query('minRating') minRating?: string,
    @Query('verified') verified?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: 'rating' | 'reviews' | 'price_low' | 'price_high' | 'completed' | 'distance',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('language') language?: string,
  ) {
    const result = await this.providersService.findAll({
      serviceSlug,
      serviceId,
      location,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      verified: verified ? verified === 'true' : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      language: language || 'en',
    });

    return {
      success: true,
      data: result.providers,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limit ? parseInt(limit, 10) : 12,
      },
    };
  }

  // Search providers (public)
  @Public()
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('language') language?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.providersService.searchProviders(
      query || '',
      language || 'en',
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 12,
    );

    return {
      success: true,
      data: result.providers,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limit ? parseInt(limit, 10) : 12,
      },
    };
  }

  // Get providers by service slug (public)
  @Public()
  @Get('by-service/:serviceSlug')
  async getByService(
    @Param('serviceSlug') serviceSlug: string,
    @Query('language') language?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radius') radius?: string,
    @Query('sortBy') sortBy?: 'rating' | 'reviews' | 'price_low' | 'price_high' | 'completed' | 'distance',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.providersService.findAll({
      serviceSlug,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      sortBy: sortBy || 'rating',
      language: language || 'en',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });

    return {
      success: true,
      data: result.providers,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limit ? parseInt(limit, 10) : 12,
      },
    };
  }

  // ==================== AUTHENTICATED PROVIDER ENDPOINTS ====================

  // Get current provider's profile
  @Roles('PROVIDER')
  @Get('me')
  async getMyProfile(
    @Request() req: any,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.findByUserId(req.user.id, language || 'en');
    return {
      success: true,
      data: provider,
    };
  }

  // Update current provider's profile
  @Roles('PROVIDER')
  @Put('me')
  async updateMyProfile(
    @Request() req: any,
    @Body() dto: UpdateProviderProfileDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.updateProfile(req.user.id, dto);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: provider,
    };
  }

  // Set online status
  @Roles('PROVIDER')
  @Put('me/online')
  async setOnlineStatus(
    @Request() req: any,
    @Body() dto: SetOnlineStatusDto,
  ) {
    await this.providersService.setOnlineStatus(req.user.id, dto.isOnline);
    return {
      success: true,
      message: dto.isOnline ? 'You are now online' : 'You are now offline',
    };
  }

  // ==================== SERVICES MANAGEMENT ====================

  // Add a service
  @Roles('PROVIDER')
  @Post('me/services')
  @HttpCode(HttpStatus.CREATED)
  async addService(
    @Request() req: any,
    @Body() dto: AddServiceDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.addService(
      req.user.id,
      dto.serviceId,
      dto.price ?? null,
      dto.priceType || 'HOURLY',
    );
    return {
      success: true,
      message: 'Service added successfully',
      data: provider,
    };
  }

  // Update a service
  @Roles('PROVIDER')
  @Put('me/services/:serviceId')
  async updateService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.updateService(
      req.user.id,
      serviceId,
      dto.price ?? null,
      dto.priceType || 'HOURLY',
    );
    return {
      success: true,
      message: 'Service updated successfully',
      data: provider,
    };
  }

  // Remove a service
  @Roles('PROVIDER')
  @Delete('me/services/:serviceId')
  async removeService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.removeService(req.user.id, serviceId);
    return {
      success: true,
      message: 'Service removed successfully',
      data: provider,
    };
  }

  // ==================== AVAILABILITY MANAGEMENT ====================

  // Update availability
  @Roles('PROVIDER')
  @Put('me/availability')
  async updateAvailability(
    @Request() req: any,
    @Body() dto: UpdateAvailabilityDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.updateAvailability(req.user.id, dto.availability);
    return {
      success: true,
      message: 'Availability updated successfully',
      data: provider,
    };
  }

  // ==================== PORTFOLIO MANAGEMENT ====================

  // Add portfolio item
  @Roles('PROVIDER')
  @Post('me/portfolio')
  @HttpCode(HttpStatus.CREATED)
  async addPortfolioItem(
    @Request() req: any,
    @Body() dto: AddPortfolioItemDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.addPortfolioItem(req.user.id, dto);
    return {
      success: true,
      message: 'Portfolio item added successfully',
      data: provider,
    };
  }

  // Update portfolio item
  @Roles('PROVIDER')
  @Put('me/portfolio/:portfolioId')
  async updatePortfolioItem(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: UpdatePortfolioItemDto,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.updatePortfolioItem(req.user.id, portfolioId, dto);
    return {
      success: true,
      message: 'Portfolio item updated successfully',
      data: provider,
    };
  }

  // Remove portfolio item
  @Roles('PROVIDER')
  @Delete('me/portfolio/:portfolioId')
  async removePortfolioItem(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.removePortfolioItem(req.user.id, portfolioId);
    return {
      success: true,
      message: 'Portfolio item removed successfully',
      data: provider,
    };
  }

  // ==================== PUBLIC BY ID (MUST BE LAST) ====================

  // Get provider by ID (public)
  @Public()
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Query('language') language?: string,
  ) {
    const provider = await this.providersService.findById(id, language || 'en');
    return {
      success: true,
      data: provider,
    };
  }
}
