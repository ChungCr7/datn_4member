import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RecommendationService } from '@/modules/recommendation/recommendation.service';

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationService: RecommendationService,
  ) {}

  getOrder(userId: number, orderId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { details: { include: { menuItem: true, shop: true } } },
    });
  }

  searchProducts(query: string, limit = 6) {
    return this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        stock: { gt: 0 },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { shop: { shopName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: { shop: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getRecommendations(userId: number, query?: string) {
    return this.recommendationService.recommendForUser(userId, query, 6);
  }

  getUserHistory(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { details: { include: { menuItem: true, shop: true } } },
    });
  }
}
