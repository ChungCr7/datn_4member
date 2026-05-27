import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationDto } from '@/common/pagination.dto';
import { PrismaService } from '@/prisma/prisma.service';

type CreateNotificationInput = {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  metadata?: unknown;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: number, pagination: PaginationDto) {
    const where = {
      userId,
      ...(pagination.filter === 'unread' ? { readAt: null } : {}),
      ...(pagination.filter === 'read' ? { readAt: { not: null } } : {}),
    };
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return this.response('Notifications retrieved successfully', {
      notifications,
      unreadCount,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return this.response('Unread notification count retrieved successfully', {
      count,
    });
  }

  async markRead(id: number, userId: number) {
    await this.assertOwner(id, userId);
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.response('Notification marked as read', notification);
  }

  async markAllRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.response('Notifications marked as read', {
      updatedCount: result.count,
    });
  }

  async remove(id: number, userId: number) {
    await this.assertOwner(id, userId);
    await this.prisma.notification.delete({ where: { id } });
    return this.response('Notification deleted', { id });
  }

  async createForUser(userId: number, input: CreateNotificationInput) {
    const title = input.title?.trim();
    const message = input.message?.trim();
    if (!title || !message) {
      throw new BadRequestException('Title and message are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: input.type?.trim() || 'system',
        actionUrl: input.actionUrl?.trim() || null,
        metadata:
          input.metadata === undefined
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
      },
    });

    return this.response('Notification created successfully', notification);
  }

  private async assertOwner(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot access another user notification');
    }
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
