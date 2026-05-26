import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '@/common/pagination.dto';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RejectSellerDto } from './dto/seller.dto';
import { SellersService } from './sellers.service';

@ApiTags('Admin Sellers')
@Controller('admin/sellers')
@ApiBearerAuth()
@Roles('admin', 'root')
export class AdminSellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.sellersService.findAll(pagination);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.sellersService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectSellerDto) {
    return this.sellersService.reject(id, dto.reason);
  }
}
