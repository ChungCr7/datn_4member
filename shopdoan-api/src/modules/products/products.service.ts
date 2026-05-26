import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateProductDto,
  ProductsQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

type Actor = { id: number; role?: string; legacyRole?: string };

@Injectable()
export class ProductsService {
  private readonly publicListCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<ProductsService['response']> }
  >();
  private readonly detailCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<ProductsService['response']> }
  >();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, actor: Actor) {
    const seller = await this.resolveWritableSeller(dto.sellerId, actor);
    await this.assertCategoryExists(dto.categoryId);
    const slug = await this.uniqueSlug(dto.slug || dto.name);
    const status = this.resolveWritableStatus(dto.status, actor);

    const product = await this.prisma.product.create({
      data: {
        sellerId: seller.id,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        price: dto.price,
        salePrice: dto.salePrice ?? null,
        stock: dto.stock ?? 0,
        status,
        images: dto.images?.length
          ? {
              create: dto.images.map((image, index) => ({
                imageUrl: image.imageUrl.trim(),
                sortOrder: image.sortOrder ?? index,
              })),
            }
          : undefined,
        variants: dto.variants?.length
          ? {
              create: dto.variants.map((variant) => ({
                name: variant.name.trim(),
                value: variant.value?.trim() || null,
                sku: variant.sku?.trim() || null,
                priceDelta: variant.priceDelta ?? 0,
                price: variant.price ?? null,
                stock: variant.stock ?? 0,
              })),
            }
          : undefined,
      },
      include: this.include(),
    });

    this.clearPublicListCache();
    return this.response('Product created successfully', product);
  }

  async findAll(query: ProductsQueryDto) {
    const cacheKey = this.cacheKey('all', query);
    const cached = this.getCachedList(cacheKey);
    if (cached) return cached;

    const keyword = query.keyword?.trim().slice(0, 100);
    const where = {
      status: 'ACTIVE' as const,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            OR: [
              {
                salePrice: {
                  ...(query.minPrice !== undefined
                    ? { gte: query.minPrice }
                    : {}),
                  ...(query.maxPrice !== undefined
                    ? { lte: query.maxPrice }
                    : {}),
                },
              },
              {
                salePrice: null,
                price: {
                  ...(query.minPrice !== undefined
                    ? { gte: query.minPrice }
                    : {}),
                  ...(query.maxPrice !== undefined
                    ? { lte: query.maxPrice }
                    : {}),
                },
              },
            ],
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              {
                description: {
                  contains: keyword,
                  mode: 'insensitive' as const,
                },
              },
              {
                category: {
                  name: { contains: keyword, mode: 'insensitive' as const },
                },
              },
              {
                seller: {
                  shopName: { contains: keyword, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: this.listInclude(),
        orderBy: this.orderBy(query.sortBy),
      }),
      this.prisma.product.count({ where }),
    ]);

    const response = this.response('Products retrieved successfully', {
      products,
      meta: this.meta(total, query.page, query.limit),
    });
    this.setCachedList(cacheKey, response);
    return response;
  }

  async findAllForAdmin(query: ProductsQueryDto) {
    const keyword = query.keyword?.trim().slice(0, 100);
    const status = this.resolveAdminStatusFilter(query.status || query.filter);
    const where = {
      ...(status ? { status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            OR: [
              {
                salePrice: {
                  ...(query.minPrice !== undefined
                    ? { gte: query.minPrice }
                    : {}),
                  ...(query.maxPrice !== undefined
                    ? { lte: query.maxPrice }
                    : {}),
                },
              },
              {
                salePrice: null,
                price: {
                  ...(query.minPrice !== undefined
                    ? { gte: query.minPrice }
                    : {}),
                  ...(query.maxPrice !== undefined
                    ? { lte: query.maxPrice }
                    : {}),
                },
              },
            ],
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              {
                description: {
                  contains: keyword,
                  mode: 'insensitive' as const,
                },
              },
              {
                category: {
                  name: { contains: keyword, mode: 'insensitive' as const },
                },
              },
              {
                seller: {
                  shopName: { contains: keyword, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: this.listInclude(),
        orderBy: this.orderBy(query.sortBy),
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.response('Admin products retrieved successfully', {
      products,
      meta: this.meta(total, query.page, query.limit),
    });
  }

  async findOne(id: number) {
    const cacheKey = `id:${id}`;
    const cached = this.getCachedDetail(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!product) throw new NotFoundException('Product not found');
    const response = this.response('Product retrieved successfully', product);
    this.setCachedDetail(cacheKey, response);
    return response;
  }

  async findBySlug(slug: string) {
    const cacheKey = `slug:${slug}`;
    const cached = this.getCachedDetail(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.include(),
    });
    if (!product) throw new NotFoundException('Product not found');
    const response = this.response('Product retrieved successfully', product);
    this.setCachedDetail(cacheKey, response);
    return response;
  }

  async findBySeller(sellerId: number, query: ProductsQueryDto) {
    const cacheKey = this.cacheKey(`seller:${sellerId}`, query);
    const cached = this.getCachedList(cacheKey);
    if (cached) return cached;

    const where = {
      sellerId,
      ...(query.keyword
        ? {
            name: {
              contains: query.keyword.trim().slice(0, 100),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: this.listInclude(),
        orderBy: this.orderBy(query.sortBy),
      }),
      this.prisma.product.count({ where }),
    ]);

    const response = this.response('Seller products retrieved successfully', {
      products,
      meta: this.meta(total, query.page, query.limit),
    });
    this.setCachedList(cacheKey, response);
    return response;
  }

  async update(id: number, dto: UpdateProductDto, actor: Actor) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: { select: { id: true, userId: true } } },
    });
    if (!current) throw new NotFoundException('Product not found');
    this.assertCanManageProduct(current.seller.userId, actor);
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    const slug =
      dto.slug || dto.name
        ? await this.uniqueSlug(dto.slug || dto.name!, id)
        : undefined;
    const status = dto.status
      ? this.resolveWritableStatus(dto.status, actor)
      : undefined;

    const product = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      if (dto.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(slug !== undefined && { slug }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim() || null,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(status !== undefined && { status }),
          ...(dto.images
            ? {
                images: {
                  create: dto.images.map((image, index) => ({
                    imageUrl: image.imageUrl.trim(),
                    sortOrder: image.sortOrder ?? index,
                  })),
                },
              }
            : {}),
          ...(dto.variants
            ? {
                variants: {
                  create: dto.variants.map((variant) => ({
                    name: variant.name.trim(),
                    value: variant.value?.trim() || null,
                    sku: variant.sku?.trim() || null,
                    priceDelta: variant.priceDelta ?? 0,
                    price: variant.price ?? null,
                    stock: variant.stock ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: this.include(),
      });
    });

    this.clearPublicListCache();
    return this.response('Product updated successfully', product);
  }

  async remove(id: number, actor: Actor) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: { select: { userId: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    this.assertCanManageProduct(product.seller.userId, actor);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: this.include(),
    });

    this.clearPublicListCache();
    return this.response('Product deactivated successfully', updated);
  }

  private cacheKey(scope: string, query: ProductsQueryDto) {
    return JSON.stringify({
      scope,
      keyword: query.keyword?.trim().slice(0, 100) || '',
      categoryId: query.categoryId || null,
      sellerId: query.sellerId || null,
      minPrice: query.minPrice ?? null,
      maxPrice: query.maxPrice ?? null,
      sortBy: query.sortBy || 'newest',
      page: query.page || 1,
      limit: query.limit || 12,
    });
  }

  private getCachedList(key: string) {
    const cached = this.publicListCache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.publicListCache.delete(key);
      return null;
    }
    return cached.value;
  }

  private setCachedList(
    key: string,
    value: ReturnType<ProductsService['response']>,
  ) {
    this.publicListCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private clearPublicListCache() {
    this.publicListCache.clear();
    this.detailCache.clear();
  }

  private getCachedDetail(key: string) {
    const cached = this.detailCache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.detailCache.delete(key);
      return null;
    }
    return cached.value;
  }

  private setCachedDetail(
    key: string,
    value: ReturnType<ProductsService['response']>,
  ) {
    this.detailCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private async resolveWritableSeller(
    requestedSellerId: number | undefined,
    actor: Actor,
  ) {
    const role = String(actor.role || actor.legacyRole || '').toUpperCase();
    if (role === 'ADMIN' || role === 'ROOT') {
      if (!requestedSellerId) {
        throw new BadRequestException(
          'sellerId is required for admin product creation',
        );
      }
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: requestedSellerId },
      });
      if (!seller) throw new NotFoundException('Seller profile not found');
      if (seller.status !== 'APPROVED') {
        throw new ForbiddenException('Seller profile is not approved');
      }
      return seller;
    }

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: actor.id },
    });
    if (!seller) throw new ForbiddenException('Seller profile not found');
    if (seller.status !== 'APPROVED') {
      throw new ForbiddenException('Seller profile is not approved');
    }
    if (requestedSellerId && requestedSellerId !== seller.id) {
      throw new ForbiddenException(
        'Seller can only create products for own shop',
      );
    }
    return seller;
  }

  private assertCanManageProduct(ownerUserId: number, actor: Actor) {
    const role = String(actor.role || actor.legacyRole || '').toUpperCase();
    if (role === 'ADMIN' || role === 'ROOT') return;
    if (ownerUserId !== actor.id) {
      throw new ForbiddenException('Seller can only manage own products');
    }
  }

  private resolveWritableStatus(
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'BANNED' | undefined,
    actor: Actor,
  ) {
    const role = String(actor.role || actor.legacyRole || '').toUpperCase();
    if (status === 'BANNED' && role !== 'ADMIN' && role !== 'ROOT') {
      throw new ForbiddenException('Only admin can ban products');
    }
    return status ?? 'ACTIVE';
  }

  private async assertCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!category || !category.isActive) {
      throw new NotFoundException('Active category not found');
    }
  }

  private include() {
    return {
      seller: {
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          logo: true,
          status: true,
          userId: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: 'asc' as const } },
      variants: { orderBy: { id: 'asc' as const } },
    };
  }

  private listInclude() {
    return {
      seller: {
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          logo: true,
          status: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      images: {
        orderBy: { sortOrder: 'asc' as const },
        take: 1,
        select: { id: true, imageUrl: true, sortOrder: true },
      },
    };
  }

  private orderBy(sortBy?: ProductsQueryDto['sortBy']) {
    if (sortBy === 'price_asc')
      return [{ salePrice: 'asc' as const }, { price: 'asc' as const }];
    if (sortBy === 'price_desc')
      return [{ salePrice: 'desc' as const }, { price: 'desc' as const }];
    if (sortBy === 'best_selling')
      return [{ soldCount: 'desc' as const }, { createdAt: 'desc' as const }];
    if (sortBy === 'rating')
      return [
        { ratingAverage: 'desc' as const },
        { ratingCount: 'desc' as const },
      ];
    return [{ createdAt: 'desc' as const }];
  }

  private resolveAdminStatusFilter(status?: string) {
    const normalized = String(status || '').toUpperCase();
    return ['DRAFT', 'ACTIVE', 'INACTIVE', 'BANNED'].includes(normalized)
      ? (normalized as 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'BANNED')
      : undefined;
  }

  private async uniqueSlug(value: string, currentId?: number) {
    const base = this.slugify(value);
    if (!base) throw new BadRequestException('Product slug is invalid');
    let slug = base;
    let index = 1;
    while (
      await this.prisma.product.findFirst({
        where: { slug, ...(currentId ? { id: { not: currentId } } : {}) },
        select: { id: true },
      })
    ) {
      slug = `${base}-${index++}`;
    }
    return slug;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private meta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
