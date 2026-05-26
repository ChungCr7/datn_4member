import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchQueryDto, SearchSuggestionDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto, userId?: number) {
    const keyword = query.keyword.trim().slice(0, 100);
    const where = this.buildProductWhere(keyword, query);

    const [products, total, categories] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: this.productInclude(),
        orderBy: [
          { soldCount: 'desc' },
          { ratingAverage: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.product.count({ where }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: keyword, mode: 'insensitive' },
        },
        take: 6,
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    await this.recordSearch(userId, keyword, products[0]?.id);

    return this.response('Search completed successfully', {
      keyword,
      products,
      categories,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  }

  async suggestions(query: SearchSuggestionDto) {
    const keyword = query.keyword.trim().slice(0, 100);
    const normalized = this.normalize(keyword);

    const [products, categories, history] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        take: query.limit,
        select: { name: true },
        orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: keyword, mode: 'insensitive' },
        },
        take: query.limit,
        select: { name: true },
      }),
      this.prisma.searchHistory.findMany({
        where: {
          keyword: { contains: keyword, mode: 'insensitive' },
        },
        take: query.limit,
        distinct: ['keyword'],
        orderBy: { createdAt: 'desc' },
        select: { keyword: true },
      }),
    ]);

    const direct = [
      ...products.map((product) => product.name),
      ...categories.map((category) => category.name),
      ...history.map((entry) => entry.keyword).filter(Boolean),
    ] as string[];

    const fuzzy =
      direct.length < query.limit
        ? await this.fuzzySuggestions(normalized, query.limit - direct.length)
        : [];

    return this.response('Search suggestions retrieved successfully', {
      suggestions: Array.from(new Set([...direct, ...fuzzy])).slice(
        0,
        query.limit,
      ),
    });
  }

  async history(userId: number) {
    const history = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        keyword: true,
        query: true,
        productId: true,
        createdAt: true,
      },
    });

    return this.response('Search history retrieved successfully', { history });
  }

  async clearHistory(userId: number) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return this.response('Search history cleared successfully', {
      deleted: true,
    });
  }

  async recordSearch(
    userId: number | undefined,
    keyword: string,
    productId?: number,
  ) {
    if (!keyword.trim()) return null;
    return this.prisma.searchHistory.create({
      data: {
        userId,
        keyword: keyword.trim(),
        query: keyword.trim(),
        targetType: 'product',
        productId,
      },
    });
  }

  private buildProductWhere(keyword: string, query: SearchQueryDto) {
    return {
      status: 'ACTIVE' as const,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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
      OR: [
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } },
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
    };
  }

  private async fuzzySuggestions(normalizedKeyword: string, limit: number) {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 50,
      select: { name: true },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    });

    return products
      .map((product) => ({
        name: product.name,
        score: this.similarity(normalizedKeyword, this.normalize(product.name)),
      }))
      .filter((entry) => entry.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.name);
  }

  private productInclude() {
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
      images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
      variants: { orderBy: { id: 'asc' as const } },
    };
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  private similarity(a: string, b: string) {
    const aTokens = new Set(a.split(/\s+/).filter(Boolean));
    const bTokens = new Set(b.split(/\s+/).filter(Boolean));
    const intersection = [...aTokens].filter((token) =>
      bTokens.has(token),
    ).length;
    const union = new Set([...aTokens, ...bTokens]).size || 1;
    return intersection / union;
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
