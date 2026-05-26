import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateMenuItemOptionDto,
  UpdateMenuItemOptionDto,
} from './dto/menu-item.dto';
import { PaginationDto } from '@/common/pagination.dto';
import { CacheService } from '@/common/cache.service';
import { UploadService } from '@/common/upload.service';

@Injectable()
export class MenuItemsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private uploadService: UploadService,
  ) {}

  async createMenuItem(
    dto: CreateMenuItemDto,
    imageFile?: Express.Multer.File,
    actor?: { id: number; role?: string },
  ) {
    const shopId = await this.resolveWritableShopId(dto.shopId, actor);
    let imageUrl = dto.image || null;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'menu-items');
    }

    const menuItem = await this.prisma.menuItem.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        basePrice: dto.basePrice,
        image: imageUrl,
        stock: dto.stock ?? 0,
        status: dto.status ?? 'active',
        isAvailable: dto.isAvailable ?? true,
        sortOrder: dto.sortOrder ?? 0,
        menuId: dto.menuId,
        shopId,
      },
      include: { options: true, shop: true },
    });
    await this.cacheService.del(`menu:${dto.menuId}`);
    await this.cacheService.delByPrefix(`menu:${dto.menuId}:items`);
    await this.cacheService.delByPrefix('menu-items:all');
    return menuItem;
  }

  async findAllMenuItems(pagination: PaginationDto) {
    const cacheKey = `menu-items:all:${pagination.page}:${pagination.limit}:${pagination.search || ''}:${pagination.filter || ''}:${pagination.sortBy || ''}:${pagination.sortOrder || ''}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    const shopId = Number((pagination as any).shopId || 0) || undefined;
    const categoryId = Number((pagination as any).categoryId || 0) || undefined;

    const where = {
      ...(shopId ? { shopId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                description: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                menu: {
                  title: { contains: searchTerm, mode: 'insensitive' as const },
                },
              },
              {
                shop: {
                  shopName: {
                    contains: searchTerm,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                category: {
                  name: { contains: searchTerm, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter === 'available'
        ? { status: 'active' as const, isAvailable: true }
        : {}),
      ...(pagination.filter === 'hidden'
        ? { OR: [{ status: 'hidden' as const }, { isAvailable: false }] }
        : {}),
      ...(pagination.filter === 'draft' ? { status: 'draft' as const } : {}),
      ...(pagination.filter === 'rejected'
        ? { status: 'rejected' as const }
        : {}),
    };
    const sortBy = ['title', 'basePrice', 'sortOrder', 'createdAt'].includes(
      pagination.sortBy || '',
    )
      ? pagination.sortBy!
      : 'sortOrder';
    const sortOrder = pagination.sortOrder === 'desc' ? 'desc' : 'asc';

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          menu: {
            select: {
              id: true,
              title: true,
            },
          },
          shop: { include: { owner: true } },
          category: true,
          variants: true,
          productAttributes: true,
          options: true,
        },
        orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'desc' }],
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    const result = {
      items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async findMenuItemById(id: number) {
    const cacheKey = `menu-item:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        menu: {
          select: {
            id: true,
            title: true,
          },
        },
        shop: { include: { owner: true } },
        category: true,
        variants: true,
        productAttributes: true,
        options: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Menu Item with ID ${id} not found`);
    }
    await this.cacheService.set(cacheKey, item, 5 * 60 * 1000);
    return item;
  }

  async findByMenu(menuId: number, pagination: PaginationDto) {
    const cacheKey = `menu:${menuId}:items:${pagination.page}:${pagination.limit}:${pagination.search || ''}:${pagination.filter || ''}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Sanitize search input
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';

    const where = {
      menuId,
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                description: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter === 'available'
        ? { status: 'active' as const, isAvailable: true }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: { options: true },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    const result = {
      items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async findByShop(shopId: number, pagination: PaginationDto) {
    const searchTerm = pagination.search
      ? String(pagination.search).trim().slice(0, 100)
      : '';
    const categoryId = Number((pagination as any).categoryId || 0) || undefined;

    const where = {
      shopId,
      status: 'active' as const,
      isAvailable: true,
      ...(categoryId ? { categoryId } : {}),
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                description: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          menu: { select: { id: true, title: true } },
          shop: { include: { owner: true } },
          category: true,
          options: true,
          variants: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async marketplaceSearch(pagination: PaginationDto) {
    const query = String(pagination.search || '')
      .trim()
      .slice(0, 100);
    const whereText = query
      ? { contains: query, mode: 'insensitive' as const }
      : undefined;

    const [products, shops, categories] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: {
          status: 'active',
          isAvailable: true,
          ...(whereText
            ? {
                OR: [
                  { title: whereText },
                  { description: whereText },
                  { shop: { shopName: whereText } },
                  { category: { name: whereText } },
                ],
              }
            : {}),
        },
        take: pagination.take,
        include: {
          shop: true,
          category: true,
          menu: { select: { id: true, title: true } },
          options: true,
        },
        orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.shop.findMany({
        where: {
          status: 'active',
          ...(whereText
            ? { OR: [{ shopName: whereText }, { description: whereText }] }
            : {}),
        },
        take: 8,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { products: true, reviews: true } },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          ...(whereText
            ? { OR: [{ name: whereText }, { description: whereText }] }
            : {}),
        },
        take: 8,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const suggestions = [
      ...products.slice(0, 5).map((item) => item.title),
      ...shops.slice(0, 3).map((shop) => shop.shopName),
      ...categories.slice(0, 3).map((category) => category.name),
    ];

    return {
      query,
      suggestions: Array.from(new Set(suggestions)),
      trending: ['cơm văn phòng', 'trà sữa', 'đồ ăn vặt', 'bún bò', 'gà rán'],
      products,
      shops,
      categories,
    };
  }

  async updateMenuItem(
    id: number,
    dto: UpdateMenuItemDto,
    imageFile?: Express.Multer.File,
    actor?: { id: number; role?: string },
  ) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu Item with ID ${id} not found`);
    }
    await this.assertProductOwnerOrRoot(menuItem.shopId, actor);
    const nextShopId =
      dto.shopId !== undefined
        ? await this.resolveWritableShopId(dto.shopId, actor)
        : undefined;

    let imageUrl = menuItem.image;

    if (imageFile) {
      // Delete old image if it exists
      if (menuItem.image) {
        await this.uploadService.deleteImageIfExists(menuItem.image);
      }
      imageUrl = await this.uploadService.uploadImage(imageFile, 'menu-items');
    } else if (dto.image !== undefined && dto.image !== menuItem.image) {
      // If image URL is explicitly set to something different, delete old one
      if (menuItem.image) {
        await this.uploadService.deleteImageIfExists(menuItem.image);
      }
      imageUrl = dto.image;
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(imageUrl !== undefined && { image: imageUrl }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.menuId !== undefined && { menuId: dto.menuId }),
        ...(nextShopId !== undefined && { shopId: nextShopId }),
      },
      include: { options: true, shop: true },
    });

    await this.cacheService.del(`menu-item:${id}`);
    await this.cacheService.del(`menu:${menuItem.menuId}`);
    await this.cacheService.delByPrefix(`menu:${menuItem.menuId}:items`);
    if (dto.menuId !== undefined && dto.menuId !== menuItem.menuId) {
      await this.cacheService.del(`menu:${dto.menuId}`);
      await this.cacheService.delByPrefix(`menu:${dto.menuId}:items`);
    }
    await this.cacheService.delByPrefix('menu-items:all');
    return updated;
  }

  async removeMenuItem(id: number, actor?: { id: number; role?: string }) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { menuId: true, shopId: true, image: true },
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu Item with ID ${id} not found`);
    }
    await this.assertProductOwnerOrRoot(menuItem.shopId, actor);

    // Delete image from Cloudinary
    if (menuItem.image) {
      await this.uploadService.deleteImageIfExists(menuItem.image);
    }

    await this.prisma.menuItem.delete({ where: { id } });
    await this.cacheService.del(`menu-item:${id}`);
    await this.cacheService.del(`menu:${menuItem.menuId}`);
    await this.cacheService.delByPrefix(`menu:${menuItem.menuId}:items`);
    await this.cacheService.delByPrefix('menu-items:all');
    return { message: 'Menu Item deleted successfully' };
  }

  async createOptions(dto: CreateMenuItemOptionDto) {
    const option = await this.prisma.menuItemOption.create({
      data: {
        title: dto.title,
        additionalPrice: dto.additionalPrice,
        optionalDescription: dto.optionalDescription || null,
        isAvailable: dto.isAvailable ?? true,
        menuItemId: dto.menuItemId,
      },
    });

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      select: { menuId: true },
    });

    if (menuItem) {
      await this.cacheService.del(`menu-item:${dto.menuItemId}`);
      await this.cacheService.del(`menu:${menuItem.menuId}`);
      await this.cacheService.delByPrefix(`menu:${menuItem.menuId}:items`);
    }
    return option;
  }

  async findOptionById(id: number) {
    const option = await this.prisma.menuItemOption.findUnique({
      where: { id },
      include: { menuItem: { select: { id: true, title: true } } },
    });

    if (!option) {
      throw new NotFoundException(`Menu Item Option with ID ${id} not found`);
    }
    return option;
  }

  async updateOptions(id: number, dto: UpdateMenuItemOptionDto) {
    const option = await this.prisma.menuItemOption.findUnique({
      where: { id },
      select: { menuItemId: true },
    });

    if (!option) {
      throw new NotFoundException(`Menu Item Option with ID ${id} not found`);
    }

    const updated = await this.prisma.menuItemOption.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.additionalPrice !== undefined && {
          additionalPrice: dto.additionalPrice,
        }),
        ...(dto.optionalDescription !== undefined && {
          optionalDescription: dto.optionalDescription,
        }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    await this.cacheService.del(`menu-item:${option.menuItemId}`);
    return updated;
  }

  async removeOptions(id: number) {
    const option = await this.prisma.menuItemOption.findUnique({
      where: { id },
      select: { menuItemId: true },
    });

    if (!option) {
      throw new NotFoundException(`Menu Item Option with ID ${id} not found`);
    }

    await this.prisma.menuItemOption.delete({ where: { id } });
    await this.cacheService.del(`menu-item:${option.menuItemId}`);
    return { message: 'Menu Item Option deleted successfully' };
  }

  private async resolveWritableShopId(
    requestedShopId?: number,
    actor?: { id: number; role?: string },
  ) {
    const role = String(actor?.role || '').toLowerCase();
    if (role === 'root' || role === 'admin') {
      return requestedShopId ?? null;
    }

    if (!actor) return requestedShopId ?? null;

    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: actor.id },
      select: { id: true },
    });
    if (!shop) throw new ForbiddenException('Seller must create a shop first');
    if (requestedShopId !== undefined && requestedShopId !== shop.id) {
      throw new ForbiddenException(
        'Seller can only write products for own shop',
      );
    }
    return shop.id;
  }

  private async assertProductOwnerOrRoot(
    shopId: number | null,
    actor?: { id: number; role?: string },
  ) {
    const role = String(actor?.role || '').toLowerCase();
    if (!actor || role === 'root' || role === 'admin') return;
    if (!shopId)
      throw new ForbiddenException('Product is not assigned to your shop');
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    if (shop?.ownerId !== actor.id) {
      throw new ForbiddenException('Seller can only manage own products');
    }
  }
}
