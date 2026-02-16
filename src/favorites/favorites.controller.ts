import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

interface AuthUser {
  id: string;
  email: string;
  type: string;
}

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @CurrentUser() user: AuthUser,
    @Query('language') language?: string,
  ) {
    const favorites = await this.favoritesService.getFavorites(user.id, language);
    return {
      success: true,
      data: favorites,
    };
  }

  @Post(':providerId')
  async addFavorite(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
  ) {
    await this.favoritesService.addFavorite(user.id, providerId);
    return {
      success: true,
      message: 'Added to favorites',
    };
  }

  @Delete(':providerId')
  async removeFavorite(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
  ) {
    await this.favoritesService.removeFavorite(user.id, providerId);
    return {
      success: true,
      message: 'Removed from favorites',
    };
  }

  @Post(':providerId/toggle')
  async toggleFavorite(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
  ) {
    const result = await this.favoritesService.toggleFavorite(user.id, providerId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':providerId/check')
  async checkFavorite(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(user.id, providerId);
    return {
      success: true,
      data: { isFavorite },
    };
  }
}
