import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuItemsService } from './menu-items.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuItemOptionDto,
  UpdateMenuItemOptionDto,
} from './dto/menu-item.dto';
import { PaginationDto } from '@/common/pagination.dto';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@ApiTags('Menu Items')
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  createMenuItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile() file?: Express.Multer.File,
    @CurrentUser() user?: any,
  ) {
    return this.menuItemsService.createMenuItem(createMenuItemDto, file, user);
  }

  @Get()
  @Public()
  findAllMenuItems(@Query() pagination: PaginationDto) {
    return this.menuItemsService.findAllMenuItems(pagination);
  }

  @Get('search/marketplace')
  @Public()
  marketplaceSearch(@Query() pagination: PaginationDto) {
    return this.menuItemsService.marketplaceSearch(pagination);
  }

  @Get('menu/:menuId')
  @Public()
  findByMenu(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.menuItemsService.findByMenu(menuId, pagination);
  }

  @Get('shop/:shopId')
  @Public()
  findByShop(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.menuItemsService.findByShop(shopId, pagination);
  }

  @Get(':id')
  @Public()
  findMenuItemById(@Param('id', ParseIntPipe) id: number) {
    return this.menuItemsService.findMenuItemById(id);
  }

  @Patch(':id')
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  updateMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @UploadedFile() file?: Express.Multer.File,
    @CurrentUser() user?: any,
  ) {
    return this.menuItemsService.updateMenuItem(
      id,
      updateMenuItemDto,
      file,
      user,
    );
  }

  @Delete(':id')
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  removeMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: any,
  ) {
    return this.menuItemsService.removeMenuItem(id, user);
  }

  // Menu Item Options endpoints
  @Post('options')
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  createMenuItemOption(
    @Body() createMenuItemOptionDto: CreateMenuItemOptionDto,
  ) {
    return this.menuItemsService.createOptions(createMenuItemOptionDto);
  }

  @Get('options/:id')
  @Public()
  findOptionById(@Param('id', ParseIntPipe) id: number) {
    return this.menuItemsService.findOptionById(id);
  }

  @Patch('options/:id')
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  updateMenuItemOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuItemOptionDto: UpdateMenuItemOptionDto,
  ) {
    return this.menuItemsService.updateOptions(id, updateMenuItemOptionDto);
  }

  @Delete('options/:id')
  @Roles('seller', 'admin', 'root')
  @ApiBearerAuth()
  removeMenuItemOption(@Param('id', ParseIntPipe) id: number) {
    return this.menuItemsService.removeOptions(id);
  }
}
