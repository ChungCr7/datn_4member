import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { RegisterSellerDto, UpdateSellerProfileDto } from './dto/seller.dto';
import { SellersService } from './sellers.service';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post('register')
  @ApiBearerAuth()
  register(@Body() dto: RegisterSellerDto, @CurrentUser() user: any) {
    return this.sellersService.register(
      user.userId || user.sub || user.id,
      dto,
    );
  }

  @Get('me')
  @ApiBearerAuth()
  getMine(@CurrentUser() user: any) {
    return this.sellersService.getMine(user.userId || user.sub || user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  updateMine(@Body() dto: UpdateSellerProfileDto, @CurrentUser() user: any) {
    return this.sellersService.updateMine(
      user.userId || user.sub || user.id,
      dto,
    );
  }

  @Get('public/:idOrSlug')
  @Public()
  getPublicProfile(@Param('idOrSlug') idOrSlug: string) {
    return this.sellersService.getPublicProfile(idOrSlug);
  }
}
