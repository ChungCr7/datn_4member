import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache.service';
import { PaginationDto } from '@/common/pagination.dto';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(dto: CreateReviewDto, userId: number) {
    if (dto.targetType === 'shop') {
      return this.createShopReview(dto, userId);
    }

    if (dto.targetType === 'product' || dto.productId) {
      return this.createProductReview(dto, userId);
    }

    if (!dto.orderDetailId) {
      throw new BadRequestException('Bạn cần chọn lần mua để đánh giá');
    }

    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id: dto.orderDetailId },
      include: {
        order: true,
        review: true,
        menuItem: { select: { id: true, title: true } },
      },
    });

    if (!orderDetail || orderDetail.order.userId !== userId) {
      throw new BadRequestException('Bạn chưa mua sản phẩm này');
    }

    if (dto.menuItemId && dto.menuItemId !== orderDetail.menuItemId) {
      throw new BadRequestException('Sản phẩm không khớp với đơn hàng');
    }

    if (!this.isReviewableOrder(orderDetail.order)) {
      throw new BadRequestException('Đơn hàng chưa đủ điều kiện đánh giá');
    }

    if (orderDetail.review) {
      throw new BadRequestException('Bạn đã đánh giá cho lần mua này rồi');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          rating: dto.rating,
          comment: dto.comment || null,
          image: dto.image || null,
          menuItemId: orderDetail.menuItemId,
          shopId: orderDetail.shopId,
          orderDetailId: orderDetail.id,
          userId,
        },
        include: this.reviewInclude(),
      });

      await this.cacheService.del('reviews:all');
      return { message: 'Đánh giá thành công', review };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Bạn đã đánh giá cho lần mua này rồi');
      }
      throw error;
    }
  }

  private async createShopReview(dto: CreateReviewDto, userId: number) {
    if (!dto.shopId) {
      throw new BadRequestException('Shop is required for shop review');
    }

    const purchasedFromShop = await this.prisma.orderDetail.findFirst({
      where: {
        shopId: dto.shopId,
        order: {
          userId,
          OR: [{ status: 'delivered' }, { paymentStatus: 'paid' }],
        },
      },
    });

    if (!purchasedFromShop) {
      throw new BadRequestException(
        'You must purchase from this shop before reviewing it',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment || null,
        image: dto.image || null,
        shopId: dto.shopId,
        targetType: 'shop',
        userId,
      },
      include: this.reviewInclude(),
    });

    await this.cacheService.del('reviews:all');
    return { message: 'Shop review created successfully', review };
  }

  private async createProductReview(dto: CreateReviewDto, userId: number) {
    if (!dto.productId) {
      throw new BadRequestException('Product is required for product review');
    }

    const orderItem = dto.orderItemId
      ? await this.prisma.orderItem.findUnique({
          where: { id: dto.orderItemId },
          include: { order: true, review: true },
        })
      : await this.prisma.orderItem.findFirst({
          where: {
            productId: dto.productId,
            order: {
              userId,
              OR: [
                { orderStatus: 'DELIVERED' },
                { marketplacePaymentStatus: 'PAID' },
                { status: 'delivered' },
                { paymentStatus: 'paid' },
              ],
            },
            review: null,
          },
          include: { order: true, review: true },
          orderBy: { createdAt: 'desc' },
        });

    if (
      !orderItem ||
      orderItem.order.userId !== userId ||
      orderItem.productId !== dto.productId
    ) {
      throw new BadRequestException(
        'You must purchase this product before reviewing it',
      );
    }

    if (orderItem.review) {
      throw new BadRequestException('You already reviewed this purchase');
    }

    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment || null,
        image: dto.image || null,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        targetType: 'product',
        userId,
      },
      include: this.reviewInclude(),
    });

    await Promise.all([
      this.refreshProductRating(orderItem.productId),
      this.cacheService.del('reviews:all'),
    ]);

    return { message: 'Product review created successfully', review };
  }

  async findAll(pagination: PaginationDto) {
    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    const where = searchTerm
      ? {
          OR: [
            { comment: { contains: searchTerm, mode: 'insensitive' as const } },
            {
              user: {
                name: { contains: searchTerm, mode: 'insensitive' as const },
              },
            },
            {
              user: {
                email: { contains: searchTerm, mode: 'insensitive' as const },
              },
            },
            {
              menuItem: {
                title: { contains: searchTerm, mode: 'insensitive' as const },
              },
            },
          ],
        }
      : {};
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.reviewInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return this.withMeta(reviews, total, pagination);
  }

  async findOne(id: number) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: this.reviewInclude(),
    });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);
    return review;
  }

  async findByMenuItem(menuItemId: number, pagination: PaginationDto) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { menuItemId },
        skip: pagination.skip,
        take: pagination.take,
        include: this.reviewInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { menuItemId } }),
    ]);

    return this.withMeta(reviews, total, pagination);
  }

  async findByProduct(productId: number, pagination: PaginationDto) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isHidden: false },
        skip: pagination.skip,
        take: pagination.take,
        include: this.reviewInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { productId, isHidden: false } }),
    ]);

    return this.withMeta(reviews, total, pagination);
  }

  async findByUser(userId: number, pagination: PaginationDto) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.take,
        include: this.reviewInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return this.withMeta(reviews, total, pagination);
  }

  async getMenuItemEligibility(menuItemId: number, userId: number) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });
    if (!item)
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);

    const purchases = await this.prisma.orderDetail.findMany({
      where: {
        menuItemId,
        order: {
          userId,
          OR: [{ status: 'delivered' }, { paymentStatus: 'paid' }],
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            image: true,
            orderDetailId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      canReview: purchases.some((purchase) => !purchase.review),
      message: purchases.length
        ? undefined
        : 'Bạn cần mua sản phẩm để đánh giá',
      purchases: purchases.map((purchase) => ({
        orderDetailId: purchase.id,
        orderId: purchase.orderId,
        menuItemId: purchase.menuItemId,
        quantity: purchase.quantity,
        itemTitle: purchase.itemTitle,
        order: purchase.order,
        review: purchase.review,
      })),
    };
  }

  async update(
    id: number,
    dto: UpdateReviewDto,
    userId: number,
    userRole?: string,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);

    const role = String(userRole || '').toLowerCase();
    if (review.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Users can only update their own reviews');
    }

    if (
      (dto.isHidden !== undefined || dto.hiddenReason !== undefined) &&
      role !== 'admin' &&
      role !== 'root'
    ) {
      throw new ForbiddenException('Only ADMIN or ROOT can moderate reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.sellerReply !== undefined && { sellerReply: dto.sellerReply }),
        ...(dto.isHidden !== undefined && { isHidden: dto.isHidden }),
        ...(dto.hiddenReason !== undefined && {
          hiddenReason: dto.hiddenReason,
        }),
      },
      include: this.reviewInclude(),
    });
    await Promise.all([
      updated.productId ? this.refreshProductRating(updated.productId) : null,
      this.cacheService.del('reviews:all'),
    ]);
    return { message: 'Cập nhật đánh giá thành công', review: updated };
  }

  async remove(id: number, userId: number, userRole?: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException(`Review with ID ${id} not found`);

    const role = String(userRole || '').toLowerCase();
    if (role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Only ADMIN or ROOT can delete reviews');
    }

    await this.prisma.review.delete({ where: { id } });
    await Promise.all([
      review.productId ? this.refreshProductRating(review.productId) : null,
      this.cacheService.del('reviews:all'),
    ]);
    return { message: 'Review deleted successfully' };
  }

  async getMenuItemRating(menuItemId: number) {
    const result = await this.prisma.review.aggregate({
      where: { menuItemId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      rating: Math.round((result._avg.rating || 0) * 10) / 10,
      count: result._count.rating,
    };
  }

  async getProductRating(productId: number) {
    const result = await this.prisma.review.aggregate({
      where: { productId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      rating: Math.round((result._avg.rating || 0) * 10) / 10,
      count: result._count.rating,
    };
  }

  private async refreshProductRating(productId: number) {
    const summary = await this.getProductRating(productId);
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: summary.rating,
        ratingCount: summary.count,
      },
    });
  }

  private reviewInclude() {
    return {
      user: { select: { id: true, name: true, email: true, image: true } },
      menuItem: { select: { id: true, title: true, image: true } },
      product: { select: { id: true, name: true } },
      shop: { select: { id: true, shopName: true, logo: true } },
      orderDetail: {
        select: {
          id: true,
          orderId: true,
          menuItemId: true,
          itemTitle: true,
          quantity: true,
        },
      },
    };
  }

  private isReviewableOrder(order: {
    status: string;
    paymentStatus: string;
  }): boolean {
    return order.status === 'delivered' || order.paymentStatus === 'paid';
  }

  private withMeta(reviews: any[], total: number, pagination: PaginationDto) {
    return {
      reviews,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }
}
