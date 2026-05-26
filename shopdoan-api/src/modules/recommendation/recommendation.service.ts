import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendForUser(userId: number, query?: string, limit = 8) {
    const [products, views, purchases, searches] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          stock: { gt: 0 },
          seller: { status: 'APPROVED' },
        },
        include: this.productInclude(),
        take: 80,
      }),
      this.prisma.productViewHistory.findMany({
        where: { userId },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { userId } },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.searchHistory.findMany({
        where: { userId },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const queryTokens = this.tokens(
      [query, ...searches.map((entry) => entry.keyword || entry.query)].join(
        ' ',
      ),
    );
    const viewed = new Set(views.map((entry) => entry.productId));
    const bought = new Set(purchases.map((entry) => entry.productId));
    const preferredCategories = new Set(
      products
        .filter((product) => viewed.has(product.id) || bought.has(product.id))
        .map((product) => product.categoryId),
    );

    const recommendations = products
      .map((product) => {
        const textTokens = this.tokens(
          `${product.name} ${product.description || ''} ${product.category.name} ${product.seller.shopName}`,
        );
        const tokenScore = queryTokens.filter((token) =>
          textTokens.includes(token),
        ).length;
        const score =
          tokenScore * 3 +
          product.ratingAverage +
          (viewed.has(product.id) ? 1.5 : 0) +
          (bought.has(product.id) ? 2 : 0) +
          (preferredCategories.has(product.categoryId) ? 1 : 0) +
          Math.min(product.soldCount, 100) / 20 +
          Math.min(product.stock, 20) / 20;

        return {
          product,
          score,
          reason: this.reason({
            tokenScore,
            viewed: viewed.has(product.id),
            bought: bought.has(product.id),
            sameCategory: preferredCategories.has(product.categoryId),
          }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    await this.logRecommendations(
      userId,
      recommendations.map((entry) => ({
        productId: entry.product.id,
        reason: entry.reason,
      })),
    );

    return recommendations.map((entry) => entry.product);
  }

  async recommendHome(limit = 12, userId?: number) {
    if (userId) {
      const personalized = await this.recommendForUser(
        userId,
        undefined,
        limit,
      );
      if (personalized.length) {
        return this.response('Recommendations retrieved successfully', {
          products: personalized,
          strategy: 'personalized_rule_based',
        });
      }
    }

    const products = await this.fallbackProducts(limit);
    return this.response('Recommendations retrieved successfully', {
      products,
      strategy: 'best_selling_latest',
    });
  }

  async recommendMe(userId: number, limit = 12) {
    const products = await this.recommendForUser(userId, undefined, limit);
    return this.response('Recommendations retrieved successfully', {
      products: products.length ? products : await this.fallbackProducts(limit),
      strategy: products.length
        ? 'personalized_rule_based'
        : 'best_selling_latest',
    });
  }

  async recordView(userId: number | undefined, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!product) return null;
    return this.prisma.productViewHistory.create({
      data: { userId, productId },
    });
  }

  async recordSearch(
    userId: number | undefined,
    query: string,
    productId?: number,
  ) {
    return this.prisma.searchHistory.create({
      data: {
        userId,
        query: query.trim(),
        keyword: query.trim(),
        productId,
        targetType: 'product',
      },
    });
  }

  private async fallbackProducts(limit: number) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE', seller: { status: 'APPROVED' } },
      include: this.productInclude(),
      take: limit,
      orderBy: [
        { soldCount: 'desc' },
        { ratingAverage: 'desc' },
        { createdAt: 'desc' },
      ],
    });
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

  private async logRecommendations(
    userId: number,
    entries: Array<{ productId: number; reason: string }>,
  ) {
    if (!entries.length) return;
    await this.prisma.recommendationLog.createMany({
      data: entries.map((entry) => ({ userId, ...entry })),
    });
  }

  private reason(input: {
    tokenScore: number;
    viewed: boolean;
    bought: boolean;
    sameCategory: boolean;
  }) {
    if (input.bought) return 'Dựa trên sản phẩm bạn đã mua';
    if (input.viewed) return 'Dựa trên sản phẩm bạn đã xem';
    if (input.tokenScore > 0) return 'Dựa trên lịch sử tìm kiếm gần đây';
    if (input.sameCategory) return 'Dựa trên danh mục bạn quan tâm';
    return 'Sản phẩm bán chạy và mới nhất';
  }

  private tokens(text: string) {
    return text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 1);
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
