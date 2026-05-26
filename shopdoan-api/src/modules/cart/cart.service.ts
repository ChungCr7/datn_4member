import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ValidateCartItemDto } from './dto/validate-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number) {
    const cart = await this.ensureCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { userId, cartId: cart.id },
      include: this.cartInclude(),
      orderBy: { updatedAt: 'desc' },
    });

    return this.response('Cart retrieved successfully', {
      id: cart.id,
      items: items.map((item) => this.serializeCartItem(item)),
      totalAmount: items.reduce(
        (sum, item) => sum + this.getItemPrice(item) * item.quantity,
        0,
      ),
    });
  }

  async addItem(userId: number, dto: ValidateCartItemDto) {
    const cart = await this.ensureCart(userId);
    const validated = await this.validateItem(dto);
    const validatedItem = validated.item as any;
    const quantity = Math.max(1, dto.quantity || 1);

    await this.prisma.cartItem.upsert({
      where: {
        userId_cartKey: {
          userId,
          cartKey: validatedItem.id,
        },
      },
      update: {
        quantity: { increment: quantity },
        priceAtTime: validatedItem.price,
        note: dto.note?.trim() || null,
      },
      create: {
        userId,
        cartId: cart.id,
        menuItemId: validatedItem.menuItemId || null,
        productId: validatedItem.productId || null,
        menuItemOptionId: validatedItem.menuItemOptionId || null,
        variantId: validatedItem.variantId || null,
        cartKey: validatedItem.id,
        quantity,
        priceAtTime: validatedItem.price,
        note: dto.note?.trim() || null,
      },
    });

    return this.response('Cart item added successfully', {
      item: { ...validatedItem, quantity },
    });
  }

  async updateItem(userId: number, cartKey: string, quantity: number) {
    const current = await this.prisma.cartItem.findFirst({
      where: { userId, cartKey },
    });
    if (!current) throw new NotFoundException('Cart item not found');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: current.id } });
      return this.getCart(userId);
    }

    await this.prisma.cartItem.update({
      where: { id: current.id },
      data: { quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: number, cartKey: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId, cartKey } });
    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return this.response('Cart cleared successfully', {
      id: (await this.ensureCart(userId)).id,
      items: [],
      totalAmount: 0,
    });
  }

  async validateItem(dto: ValidateCartItemDto) {
    if (dto.productId) {
      return this.validateProductItem(dto);
    }

    if (!dto.menuItemId) {
      throw new BadRequestException('productId is required');
    }

    const item = await this.prisma.menuItem.findFirst({
      where: {
        id: dto.menuItemId,
        isAvailable: true,
        menu: { isActive: true },
      },
      include: {
        menu: { select: { id: true, title: true } },
        options: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Món này hiện không còn bán');
    }

    const option = dto.menuItemOptionId
      ? item.options.find(
          (entry) => entry.id === dto.menuItemOptionId && entry.isAvailable,
        )
      : null;

    if (dto.menuItemOptionId && !option) {
      throw new BadRequestException('Tùy chọn món không khả dụng');
    }

    const price = item.basePrice + (option?.additionalPrice || 0);

    return {
      valid: true,
      item: {
        id: this.buildCartKey(item.id, option?.id),
        menuItemId: item.id,
        menuItemOptionId: option?.id,
        optionTitle: option?.title,
        name: option ? `${item.title} (${option.title})` : item.title,
        price,
        image: item.image || '',
        quantity: Math.max(1, dto.quantity || 1),
        note: dto.note || null,
      },
    };
  }

  private serializeCartItem(item: any) {
    if (item.product) {
      const variant = item.variant;
      const basePrice = Number(item.product.salePrice || item.product.price);
      const price = Number(
        item.priceAtTime ?? basePrice + Number(variant?.priceDelta || 0),
      );
      const image = item.product.images?.[0]?.imageUrl || '';
      return {
        id: item.cartKey,
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        variantName: variant
          ? `${variant.name}${variant.value ? `: ${variant.value}` : ''}`
          : undefined,
        name: variant?.value
          ? `${item.product.name} (${variant.value})`
          : item.product.name,
        price,
        image,
        quantity: item.quantity,
        stock: variant?.stock ?? item.product.stock,
        seller: item.product.seller,
        note: item.note,
      };
    }

    const option = item.menuItemOption;
    const price =
      Number(item.menuItem.basePrice) + Number(option?.additionalPrice || 0);

    return {
      id: item.cartKey,
      menuItemId: item.menuItemId,
      menuItemOptionId: item.menuItemOptionId || undefined,
      optionTitle: option?.title,
      name: option
        ? `${item.menuItem.title} (${option.title})`
        : item.menuItem.title,
      price,
      image: item.menuItem.image || '',
      quantity: item.quantity,
      note: item.note,
    };
  }

  private cartInclude() {
    return {
      menuItem: true,
      menuItemOption: true,
      product: {
        include: {
          seller: { select: { id: true, shopName: true, shopSlug: true } },
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
        },
      },
      variant: true,
    };
  }

  private buildCartKey(menuItemId: number, optionId?: number) {
    return `${menuItemId}-${optionId || 'base'}`;
  }

  private async ensureCart(userId: number) {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true, userId: true, createdAt: true, updatedAt: true },
    });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { userId } });
  }

  private async validateProductItem(dto: ValidateCartItemDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        stock: true,
        seller: { select: { status: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { imageUrl: true },
        },
        variants: dto.variantId
          ? {
              where: { id: dto.variantId, isActive: true },
              take: 1,
              select: {
                id: true,
                name: true,
                value: true,
                price: true,
                priceDelta: true,
                stock: true,
              },
            }
          : false,
      },
    });
    if (!product) throw new NotFoundException('Product is not available');
    if (product.seller.status !== 'APPROVED') {
      throw new BadRequestException('Seller is not approved');
    }

    const variant = dto.variantId ? product.variants[0] : null;
    if (dto.variantId && !variant) {
      throw new BadRequestException('Product variant is not available');
    }

    const stock = variant?.stock ?? product.stock;
    const quantity = Math.max(1, dto.quantity || 1);
    if (stock < quantity) {
      throw new BadRequestException('Product is out of stock');
    }

    const price =
      Number(variant?.price ?? product.salePrice ?? product.price) +
      Number(variant?.priceDelta || 0);

    return {
      valid: true,
      item: {
        id: this.buildProductCartKey(product.id, variant?.id),
        productId: product.id,
        variantId: variant?.id,
        variantTitle: variant?.value,
        name: variant?.value
          ? `${product.name} (${variant.value})`
          : product.name,
        price,
        image: product.images[0]?.imageUrl || '',
        quantity,
        note: dto.note || null,
      },
    };
  }

  private getItemPrice(item: any) {
    if (item.product) {
      return Number(
        item.priceAtTime ?? item.product.salePrice ?? item.product.price,
      );
    }
    return (
      Number(item.menuItem?.basePrice || 0) +
      Number(item.menuItemOption?.additionalPrice || 0)
    );
  }

  private buildProductCartKey(productId: number, variantId?: number) {
    return `product:${productId}:${variantId || 'base'}`;
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
