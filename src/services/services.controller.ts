import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServicesService, CreateServiceDto, UpdateServiceDto } from './services.service';
import { Public, Roles } from '../common/decorators';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTOs for validation
class TranslationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class CreateServiceRequestDto implements CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z_]+$/, { message: 'Key must be lowercase letters and underscores only' })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  icon: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations: TranslationDto[];
}

class UpdateServiceRequestDto implements UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z_]+$/, { message: 'Key must be lowercase letters and underscores only' })
  key?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  // Get all services (public)
  @Public()
  @Get()
  async findAll(
    @Query('language') language?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const services = await this.servicesService.findAll(
      language,
      includeInactive === 'true',
    );
    return {
      success: true,
      data: services,
    };
  }

  // Get popular services (public)
  @Public()
  @Get('popular')
  async findPopular(@Query('language') language?: string) {
    const services = await this.servicesService.findPopular(language);
    return {
      success: true,
      data: services,
    };
  }

  // Search services (public)
  @Public()
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('language') language?: string,
  ) {
    const services = await this.servicesService.search(query, language || 'en');
    return {
      success: true,
      data: services,
    };
  }

  // Get service by slug (public)
  @Public()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Query('language') language?: string,
  ) {
    const service = await this.servicesService.findBySlug(slug, language);
    return {
      success: true,
      data: service,
    };
  }

  // Create a new service (Admin only)
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateServiceRequestDto) {
    const service = await this.servicesService.create(dto);
    return {
      success: true,
      message: 'Service created successfully',
      data: service,
    };
  }

  // Update a service (Admin only)
  @Roles('ADMIN')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    const service = await this.servicesService.update(id, dto);
    return {
      success: true,
      message: 'Service updated successfully',
      data: service,
    };
  }

  // Delete a service (Admin only)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.servicesService.delete(id);
    return {
      success: true,
      message: 'Service deleted successfully',
    };
  }
}
