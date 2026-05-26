import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AiMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserContext(userId: number) {
    const [memories, recentChats, views, searches] = await Promise.all([
      this.prisma.aiMemory.findMany({ where: { userId } }),
      this.prisma.message.findMany({
        where: { conversation: { userId } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productView.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { menuItem: true },
      }),
      this.prisma.searchHistory.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { memories, recentChats: recentChats.reverse(), views, searches };
  }

  rememberPreference(userId: number, key: string, value: unknown) {
    return this.prisma.aiMemory.upsert({
      where: { userId_key: { userId, key } },
      update: { value: value as object },
      create: { userId, key, value: value as object },
    });
  }
}
