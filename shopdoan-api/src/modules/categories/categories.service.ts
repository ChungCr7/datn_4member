import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginationDto } from '@/common/pagination.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  private readonly listCache = new Map<
    string,
    { expiresAt: number; value: ReturnType<CategoriesService['response']> }
  >();
  private readonly cacheTtlMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const slug = await this.uniqueSlug(dto.slug || name);

    if (dto.parentId) {
      await this.assertCategoryExists(dto.parentId);
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        slug,
        description: dto.description?.trim() || null,
        image: dto.image?.trim() || null,
        parentId: dto.parentId || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: this.include(),
    });

    this.clearListCache();
    return this.response('Category created successfully', category);
  }

  async findAll(pagination: PaginationDto) {
    const cacheKey = this.cacheKey(pagination);
    const cached = this.getCachedList(cacheKey);
    if (cached) return cached;

    const search = pagination.search?.trim().slice(0, 100);
    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(pagination.filter === 'active' ? { isActive: true } : {}),
      ...(pagination.filter === 'inactive' ? { isActive: false } : {}),
    };

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: this.include(),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.category.count({ where }),
    ]);

    const response = this.response('Categories retrieved successfully', {
      categories,
      meta: this.meta(total, pagination),
    });
    this.setCachedList(cacheKey, response);
    return response;
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!category) throw new NotFoundException('Category not found');
    return this.response('Category retrieved successfully', category);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.assertCategoryExists(id);
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    if (dto.parentId) {
      await this.assertCategoryExists(dto.parentId);
    }

    const slug =
      dto.slug || dto.name
        ? await this.uniqueSlug(dto.slug || dto.name!, id)
        : undefined;
    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.image !== undefined && { image: dto.image?.trim() || null }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: this.include(),
    });

    this.clearListCache();
    return this.response('Category updated successfully', updated);
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { marketplaceProducts: true, children: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (
      category._count.marketplaceProducts > 0 ||
      category._count.children > 0
    ) {
      const updated = await this.prisma.category.update({
        where: { id },
        data: { isActive: false },
        include: this.include(),
      });
      this.clearListCache();
      return this.response(
        'Category has relations, deactivated instead',
        updated,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.clearListCache();
    return this.response('Category deleted successfully', { id });
  }

  private cacheKey(pagination: PaginationDto) {
    return JSON.stringify({
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search?.trim().slice(0, 100) || '',
      filter: pagination.filter || '',
    });
  }

  private getCachedList(key: string) {
    const cached = this.listCache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.listCache.delete(key);
      return null;
    }
    return cached.value;
  }

  private setCachedList(
    key: string,
    value: ReturnType<CategoriesService['response']>,
  ) {
    this.listCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private clearListCache() {
    this.listCache.clear();
  }

  private include() {
    return {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
      _count: { select: { marketplaceProducts: true, children: true } },
    };
  }

  private async assertCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');
  }

  private async uniqueSlug(value: string, currentId?: number) {
    const base = this.slugify(value);
    if (!base) throw new BadRequestException('Category slug is invalid');
    let slug = base;
    let index = 1;
    while (
      await this.prisma.category.findFirst({
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

  private meta(total: number, pagination: PaginationDto) {
    return {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
