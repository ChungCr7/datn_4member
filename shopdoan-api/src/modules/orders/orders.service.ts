import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache.service';
import { PaginationDto } from '@/common/pagination.dto';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { NotificationsService } from '@/modules/notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto, userId: number) {
    const marketplaceItems =
      dto.items || dto.details?.filter((item) => item.productId);
    if (marketplaceItems?.length) {
      return this.createMarketplaceOrder(dto, userId, marketplaceItems);
    }
    if (!dto.details?.length) {
      throw new BadRequestException('Order items are required');
    }

    const customerName = dto.customerName?.trim();
    const phone = dto.phone?.trim();
    const address = dto.address?.trim();

    if (!customerName || !phone || !address) {
      throw new BadRequestException(
        'Customer name, phone, and address are required',
      );
    }

    const legacyDetails = dto.details;
    const ids = legacyDetails
      .map((detail) => detail.menuItemId)
      .filter((id): id is number => Boolean(id));
    const optionIds = dto.details
      .map((detail) => detail.menuItemOptionId)
      .filter((id): id is number => Boolean(id));

    const [items, options] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: { id: { in: ids }, isAvailable: true },
        include: { menu: true },
      }),
      this.prisma.menuItemOption.findMany({
        where: { id: { in: optionIds }, isAvailable: true },
      }),
    ]);

    const orderDetails = legacyDetails.map((detail) => {
      const item = items.find((entry) => entry.id === detail.menuItemId);
      if (!item)
        throw new NotFoundException(`Menu item ${detail.menuItemId} not found`);

      const option = detail.menuItemOptionId
        ? options.find(
            (entry) =>
              entry.id === detail.menuItemOptionId &&
              entry.menuItemId === item.id,
          )
        : null;
      if (detail.menuItemOptionId && !option) {
        throw new NotFoundException(
          `Menu item option ${detail.menuItemOptionId} not found`,
        );
      }

      const optionPrice = option?.additionalPrice || 0;
      const unitPrice = item.basePrice + optionPrice;
      const quantity = Math.max(1, detail.quantity);
      if (item.stock < quantity) {
        throw new BadRequestException(`${item.title} is out of stock`);
      }

      return {
        menuItemId: item.id,
        shopId: item.shopId,
        menuItemOptionId: option?.id,
        quantity,
        itemTitle: item.title,
        optionTitle: option?.title,
        itemPrice: item.basePrice,
        optionPrice,
        unitPrice,
        totalPrice: unitPrice * quantity,
        note: detail.note || null,
      };
    });

    const totalPrice = orderDetails.reduce(
      (sum, detail) => sum + detail.totalPrice,
      0,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalPrice,
        customerName,
        phone,
        address,
        note: dto.note?.trim() || null,
        paymentProvider: dto.paymentProvider === 'stripe' ? 'stripe' : 'cash',
        details: { create: orderDetails },
      },
      include: this.orderInclude(),
    });

    await Promise.all(
      orderDetails.map((detail) =>
        this.prisma.menuItem.update({
          where: { id: detail.menuItemId },
          data: { stock: { decrement: detail.quantity } },
        }),
      ),
    );

    await this.cacheService.del('orders:all');
    await this.notificationsService.createForUser(userId, {
      title: 'Đặt hàng thành công',
      message: `Đơn hàng #${order.id} đã được tạo và đang chờ xác nhận.`,
      type: 'order',
      actionUrl: `/orders/${order.id}`,
      metadata: { orderId: order.id },
    });
    return order;
  }

  private async createMarketplaceOrder(
    dto: CreateOrderDto,
    userId: number,
    itemsDto: NonNullable<CreateOrderDto['items']>,
  ) {
    const receiverName = (dto.receiverName || dto.customerName)?.trim();
    const receiverPhone = (dto.receiverPhone || dto.phone)?.trim();
    const receiverAddress = (dto.receiverAddress || dto.address)?.trim();
    if (!receiverName || !receiverPhone || !receiverAddress) {
      throw new BadRequestException(
        'Receiver name, phone, and address are required',
      );
    }

    const productIds = itemsDto
      .map((item) => item.productId)
      .filter((id): id is number => Boolean(id));
    if (!productIds.length || productIds.length !== itemsDto.length) {
      throw new BadRequestException('All order items must include productId');
    }
    const variantIds = itemsDto
      .map((item) => item.variantId)
      .filter((id): id is number => Boolean(id));

    return this.prisma.$transaction(
      async (tx) => {
        const [products, variants] = await Promise.all([
          tx.product.findMany({
            where: { id: { in: productIds }, status: 'ACTIVE' },
            include: {
              seller: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          }),
          tx.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
          }),
        ]);

        const orderItems = itemsDto.map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found`);
          }
          if (product.seller.status !== 'APPROVED') {
            throw new BadRequestException(`${product.name} is not available`);
          }

          const variant = item.variantId
            ? variants.find(
                (entry) =>
                  entry.id === item.variantId && entry.productId === product.id,
              )
            : null;
          if (item.variantId && !variant) {
            throw new NotFoundException(`Variant ${item.variantId} not found`);
          }

          const quantity = Math.max(1, item.quantity);
          const stock = variant?.stock ?? product.stock;
          if (stock < quantity) {
            throw new BadRequestException(`${product.name} is out of stock`);
          }

          const price =
            Number(variant?.price ?? product.salePrice ?? product.price) +
            Number(variant?.priceDelta || 0);

          return {
            sellerId: product.sellerId,
            productId: product.id,
            variantId: variant?.id,
            productName: product.name,
            productImage: product.images[0]?.imageUrl || null,
            quantity,
            price,
            lineTotal: price * quantity,
          };
        });

        const totalAmount = orderItems.reduce(
          (sum, item) => sum + item.lineTotal,
          0,
        );
        const shippingFee = totalAmount > 0 ? 15000 : 0;
        const discountAmount = 0;
        const finalAmount = totalAmount + shippingFee - discountAmount;
        const orderCode = await this.generateOrderCode(tx);

        const order = await tx.order.create({
          data: {
            userId,
            orderCode,
            totalPrice: totalAmount,
            totalAmount,
            shippingFee,
            discountAmount,
            finalAmount,
            paymentMethod: dto.paymentMethod || 'COD',
            marketplacePaymentStatus: 'UNPAID',
            orderStatus: 'PENDING',
            paymentProvider: 'cash',
            paymentStatus: 'pending',
            status: 'ordered',
            customerName: receiverName,
            receiverName,
            phone: receiverPhone,
            receiverPhone,
            address: receiverAddress,
            receiverAddress,
            note: dto.note?.trim() || null,
            orderItems: {
              create: orderItems.map(
                ({ lineTotal: _lineTotal, ...item }) => item,
              ),
            },
            payments: {
              create: {
                method: dto.paymentMethod || 'COD',
                amount: finalAmount,
                status: 'UNPAID',
              },
            },
          },
          include: this.orderInclude(),
        });

        await Promise.all(
          orderItems.map((item) =>
            item.variantId
              ? tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: { decrement: item.quantity } },
                })
              : tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stock: { decrement: item.quantity },
                    soldCount: { increment: item.quantity },
                  },
                }),
          ),
        );

        await tx.cartItem.deleteMany({
          where: {
            userId,
            productId: { in: productIds },
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: 'Đặt hàng thành công',
            message: `Đơn hàng ${order.orderCode || `#${order.id}`} đã được tạo và đang chờ xác nhận.`,
            type: 'order',
            actionUrl: `/orders/${order.id}`,
            metadata: { orderId: order.id, orderCode: order.orderCode },
          },
        });

        return this.response('Order created successfully', order);
      },
      { timeout: 15000 },
    );
  }

  async findAll(pagination: PaginationDto) {
    const where = this.buildWhere(pagination);
    const orderBy = this.buildOrderBy(pagination);
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.orderInclude(),
        orderBy,
      }),
      this.prisma.order.count({ where }),
    ]);

    return this.response(
      'Orders retrieved successfully',
      this.withMeta(orders, total, pagination),
    );
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });

    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    return order;
  }

  async findByUser(userId: number, pagination: PaginationDto) {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.take,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return this.response(
      'Orders retrieved successfully',
      this.withMeta(orders, total, pagination),
    );
  }

  async findBySeller(userId: number, pagination: PaginationDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const role = actor?.role.name.toLowerCase();
    if (role === 'admin' || role === 'root') {
      const where = this.buildWhere(pagination);
      const [items, total] = await Promise.all([
        this.prisma.orderDetail.findMany({
          where: {
            order: where,
          },
          skip: pagination.skip,
          take: pagination.take,
          include: {
            order: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
            menuItem: { include: { shop: { include: { owner: true } } } },
            menuItemOption: true,
            shop: { include: { owner: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.orderDetail.count({ where: { order: where } }),
      ]);

      return {
        orderItems: items,
        meta: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    }

    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!sellerProfile) throw new NotFoundException('Seller profile not found');

    const where = { sellerId: sellerProfile.id };
    const [items, total] = await Promise.all([
      this.prisma.orderItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          order: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          product: {
            include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
          },
          variant: true,
          seller: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return this.response('Seller orders retrieved successfully', {
      orderItems: items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  }

  async getSellerAnalytics(userId: number) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const role = actor?.role.name.toLowerCase();
    if (role === 'admin' || role === 'root') {
      const [products, orderAggregate, orderItems, ratingAggregate] =
        await Promise.all([
          this.prisma.menuItem.count(),
          this.prisma.orderDetail.aggregate({
            where: {
              order: {
                OR: [{ status: 'delivered' }, { paymentStatus: 'paid' }],
              },
            },
            _sum: { totalPrice: true },
          }),
          this.prisma.orderDetail.count(),
          this.prisma.review.aggregate({ _avg: { rating: true } }),
        ]);

      return this.response('Seller analytics retrieved successfully', {
        products,
        orderItems,
        revenue: orderAggregate._sum.totalPrice || 0,
        averageRating: Math.round((ratingAggregate._avg.rating || 0) * 10) / 10,
      });
    }

    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!sellerProfile) throw new NotFoundException('Seller profile not found');

    const [products, revenueItems, orderItems, ratingAggregate, latestItems] =
      await Promise.all([
        this.prisma.product.count({ where: { sellerId: sellerProfile.id } }),
        this.prisma.orderItem.findMany({
          where: {
            sellerId: sellerProfile.id,
            order: {
              OR: [
                { orderStatus: 'DELIVERED' },
                { marketplacePaymentStatus: 'PAID' },
              ],
            },
          },
          select: { price: true, quantity: true },
        }),
        this.prisma.orderItem.count({ where: { sellerId: sellerProfile.id } }),
        this.prisma.review.aggregate({
          where: { product: { sellerId: sellerProfile.id } },
          _avg: { rating: true },
        }),
        this.prisma.orderItem.findMany({
          where: { sellerId: sellerProfile.id },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                orderCode: true,
                orderStatus: true,
                receiverName: true,
                createdAt: true,
              },
            },
          },
        }),
      ]);

    const revenue = revenueItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    return this.response('Seller analytics retrieved successfully', {
      products,
      orderItems,
      revenue,
      averageRating: Math.round((ratingAggregate._avg.rating || 0) * 10) / 10,
      latestItems,
    });
  }

  async update(
    id: number,
    dto: UpdateOrderDto,
    userId: number,
    userRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    const role = String(userRole || '').toLowerCase();
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Users can only update their own orders');
    }

    const mappedStatus = this.mapLegacyOrderStatus(dto.status);
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(mappedStatus && { orderStatus: mappedStatus }),
        ...(dto.orderStatus && { orderStatus: dto.orderStatus as any }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus as any }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...((dto.status === 'delivered' || dto.orderStatus === 'DELIVERED') && {
          deliveryTime: new Date(),
        }),
        ...(dto.paymentStatus === 'paid' && { paidAt: new Date() }),
      },
      include: this.orderInclude(),
    });

    await this.cacheService.del('orders:all');
    await this.notificationsService.createForUser(updated.userId, {
      title: 'Đơn hàng đã cập nhật',
      message: `Đơn hàng ${updated.orderCode || `#${updated.id}`} hiện ở trạng thái ${updated.orderStatus}.`,
      type: 'order',
      actionUrl: `/orders/${updated.id}`,
      metadata: { orderId: updated.id, orderStatus: updated.orderStatus },
    });
    return updated;
  }

  async cancel(
    id: number,
    userId: number,
    userRole?: string,
    legacyRole?: string,
  ) {
    const role = String(userRole || legacyRole || '').toLowerCase();
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Users can only cancel their own orders');
    }
    if (!['PENDING', 'CONFIRMED'].includes(order.orderStatus)) {
      throw new BadRequestException('Order can no longer be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        order.orderItems.map((item) =>
          item.variantId
            ? tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              })
            : tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              }),
        ),
      );
      return tx.order.update({
        where: { id },
        data: { orderStatus: 'CANCELLED', status: 'cancelled' },
        include: this.orderInclude(),
      });
    });

    await this.notificationsService.createForUser(updated.userId, {
      title: 'Đơn hàng đã hủy',
      message: `Đơn hàng ${updated.orderCode || `#${updated.id}`} đã được hủy.`,
      type: 'order',
      actionUrl: `/orders/${updated.id}`,
      metadata: { orderId: updated.id, orderStatus: updated.orderStatus },
    });

    return this.response('Order cancelled successfully', updated);
  }

  async updateSellerOrderStatus(
    orderId: number,
    dto: UpdateOrderDto,
    userId: number,
    userRole?: string,
    legacyRole?: string,
  ) {
    const role = String(userRole || legacyRole || '').toLowerCase();
    if (role !== 'admin' && role !== 'root') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!seller) throw new NotFoundException('Seller profile not found');
      const ownsOrder = await this.prisma.orderItem.findFirst({
        where: { orderId, sellerId: seller.id },
        select: { id: true },
      });
      if (!ownsOrder) {
        throw new ForbiddenException('Seller can only update own orders');
      }
    }

    const status = dto.orderStatus || this.mapLegacyOrderStatus(dto.status);
    if (!status) throw new BadRequestException('orderStatus is required');
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: status as any,
        ...(status === 'DELIVERED'
          ? { status: 'delivered' as any, deliveryTime: new Date() }
          : {}),
      },
      include: this.orderInclude(),
    });
    await this.notificationsService.createForUser(updated.userId, {
      title: 'Trạng thái đơn hàng thay đổi',
      message: `Đơn hàng ${updated.orderCode || `#${updated.id}`} hiện ở trạng thái ${updated.orderStatus}.`,
      type: 'order',
      actionUrl: `/orders/${updated.id}`,
      metadata: { orderId: updated.id, orderStatus: updated.orderStatus },
    });
    return this.response('Order status updated successfully', updated);
  }

  async remove(id: number, userId: number, userRole?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    const role = String(userRole || '').toLowerCase();
    if (order.userId !== userId && role !== 'admin' && role !== 'root') {
      throw new ForbiddenException('Users can only delete their own orders');
    }

    await this.prisma.order.delete({ where: { id } });
    await this.cacheService.del('orders:all');
    return { message: 'Order deleted successfully' };
  }

  async getDailyRevenue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.order.aggregate({
      where: {
        status: 'delivered',
        orderTime: { gte: today, lt: tomorrow },
      },
      _sum: { totalPrice: true },
    });

    return result._sum.totalPrice || 0;
  }

  async getOrdersByStatus(status: string, pagination: PaginationDto) {
    const where = {
      ...this.buildWhere(pagination),
      status: status as any,
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return this.withMeta(orders, total, pagination);
  }

  private orderInclude() {
    return {
      details: {
        include: {
          menuItem: true,
          shop: true,
          menuItemOption: true,
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
      },
      orderItems: {
        include: {
          seller: true,
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
            },
          },
          variant: true,
          review: true,
        },
      },
      payments: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      },
    };
  }

  private withMeta(orders: any[], total: number, pagination: PaginationDto) {
    return {
      orders,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  private async generateOrderCode(tx: any) {
    const prefix = `SDM-${new Date().getFullYear()}`;
    const count = await tx.order.count();
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  private mapLegacyOrderStatus(status?: string) {
    const map: Record<string, string> = {
      ordered: 'PENDING',
      confirmed: 'CONFIRMED',
      preparing: 'PACKING',
      on_the_way: 'SHIPPING',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
    };
    return status ? map[status] : undefined;
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  private buildWhere(pagination: PaginationDto) {
    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    return {
      ...(searchTerm
        ? {
            OR: [
              {
                customerName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              { phone: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                address: { contains: searchTerm, mode: 'insensitive' as const },
              },
              {
                user: {
                  email: { contains: searchTerm, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  name: { contains: searchTerm, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter && pagination.filter !== 'all'
        ? pagination.filter.startsWith('payment:')
          ? { paymentStatus: pagination.filter.replace('payment:', '') as any }
          : { status: pagination.filter as any }
        : {}),
    };
  }

  private buildOrderBy(pagination: PaginationDto) {
    const sortBy = [
      'createdAt',
      'totalPrice',
      'status',
      'paymentStatus',
    ].includes(pagination.sortBy || '')
      ? pagination.sortBy!
      : 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 'asc' : 'desc';
    return { [sortBy]: sortOrder };
  }
}
