import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { HomeService } from './home.service';
import { HomeResponseDto, PlatformStatsDto } from './dto/home-response.dto';
import { Public, Roles } from '../common/decorators';

@ApiTags('Home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get home page data' })
  @ApiQuery({ name: 'language', required: false, example: 'en' })
  @ApiResponse({ status: 200, type: HomeResponseDto })
  async getHomeData(
    @Query('language') language: string = 'en',
  ): Promise<HomeResponseDto> {
    return this.homeService.getHomeData(language);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, type: PlatformStatsDto })
  async getStats(): Promise<PlatformStatsDto> {
    return this.homeService.getPlatformStats();
  }

  @Roles('ADMIN')
  @Get('refresh-stats')
  @ApiOperation({ summary: 'Force refresh platform statistics (admin only)' })
  @ApiResponse({ status: 200, type: PlatformStatsDto })
  async refreshStats(): Promise<PlatformStatsDto> {
    return this.homeService.calculateAndCacheStats();
  }
}
