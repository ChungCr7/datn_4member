import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import {
  CreateShopDto,
  RejectSellerRequestDto,
  UpdateShopDto,
} from './dto/shop.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post('seller-requests')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  applySeller(
    @Body() dto: CreateShopDto,
    @CurrentUser() user: any,
    @UploadedFiles()
    files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    return this.shopsService.applySellerRequest(user.id, dto, files);
  }

  @Roles('admin', 'root')
  @Get('seller-requests')
  sellerRequests(@Query() pagination: PaginationDto) {
    return this.shopsService.findSellerRequests(pagination);
  }

  @Get('seller-requests/me')
  mySellerRequests(@CurrentUser() user: any) {
    return this.shopsService.findMySellerRequests(user.id);
  }

  @Roles('admin', 'root')
  @Patch('seller-requests/:id/approve')
  approveSellerRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.shopsService.approveSellerRequest(id, user.id);
  }

  @Roles('admin', 'root')
  @Patch('seller-requests/:id/reject')
  rejectSellerRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectSellerRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.shopsService.rejectSellerRequest(id, user.id, dto.reason);
  }

  @Roles('seller', 'admin', 'root')
  @Post()
  create(@Body() dto: CreateShopDto, @CurrentUser() user: any) {
    return this.shopsService.createForSeller(user.id, dto);
  }

  @Public()
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.shopsService.findAll(pagination);
  }

  @Roles('seller', 'admin', 'root')
  @Get('me')
  mine(@CurrentUser() user: any) {
    return this.shopsService.findMine(user.id);
  }

  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.shopsService.findPublicShop(idOrSlug);
  }

  @Roles('seller', 'admin', 'root')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShopDto,
    @CurrentUser() user: any,
  ) {
    return this.shopsService.update(id, dto, user.id, user.role);
  }

  @Roles('admin', 'root')
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'pending' | 'active' | 'suspended',
  ) {
    return this.shopsService.setStatus(id, status);
  }
}
