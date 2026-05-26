import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import {
  CreateProductDto,
  ProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('by-slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get('seller/:sellerId')
  @Public()
  findBySeller(
    @Param('sellerId', ParseIntPipe) sellerId: number,
    @Query() query: ProductsQueryDto,
  ) {
    return this.productsService.findBySeller(sellerId, query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles('seller', 'admin', 'root')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(dto, {
      id: user.userId || user.sub || user.id,
      role: user.role,
      legacyRole: user.legacyRole,
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('seller', 'admin', 'root')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(id, dto, {
      id: user.userId || user.sub || user.id,
      role: user.role,
      legacyRole: user.legacyRole,
    });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('seller', 'admin', 'root')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.productsService.remove(id, {
      id: user.userId || user.sub || user.id,
      role: user.role,
      legacyRole: user.legacyRole,
    });
  }
}
