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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

type AuthenticatedRequest = {
  user: {
    id: number;
    role?: string;
  };
};

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateReviewDto, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.create(dto, req.user.id);
  }

  @Get()
  @Public()
  findAll(@Query() pagination: PaginationDto) {
    return this.reviewsService.findAll(pagination);
  }

  @Get('menu-items/:menuItemId')
  @Public()
  findByMenuItem(
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.findByMenuItem(menuItemId, pagination);
  }

  @Get('menu-items/:menuItemId/rating')
  @Public()
  getMenuItemRating(@Param('menuItemId', ParseIntPipe) menuItemId: number) {
    return this.reviewsService.getMenuItemRating(menuItemId);
  }

  @Get('menu-items/:menuItemId/eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMenuItemEligibility(
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.getMenuItemEligibility(menuItemId, req.user.id);
  }

  @Get('user/:userId')
  @Public()
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.findByUser(userId, pagination);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.remove(id, req.user.id, req.user.role);
  }
}
