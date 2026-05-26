import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMessageRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type AuthUser = {
  role?: string;
  accountRole?: string;
  legacyRole?: string;
};

@Injectable()
export class ShopChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getBuyerConversation(sellerId: number, userId: number) {
    const conversation = await this.getOrCreateConversation(sellerId, userId);
    return this.response('Shop conversation retrieved successfully', {
      conversation: await this.serializeConversation(conversation.id),
    });
  }

  async sendBuyerMessage(sellerId: number, userId: number, message: string) {
    const conversation = await this.getOrCreateConversation(sellerId, userId);
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        senderRole: ChatMessageRole.user,
        content: message.trim(),
      },
    });
    await this.touchConversation(conversation.id);

    return this.response('Message sent successfully', {
      conversation: await this.serializeConversation(conversation.id),
    });
  }

  async getSellerConversations(userId: number, user?: AuthUser) {
    const shopIds = await this.resolveManageableShopIds(userId, user);
    const conversations = await this.prisma.conversation.findMany({
      where: { shopId: { in: shopIds } },
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true, avatar: true, image: true } },
        shop: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return this.response('Shop conversations retrieved successfully', {
      conversations: conversations.map((item) => ({
        id: item.id,
        conversationId: item.id,
        user: item.user,
        shop: item.shop,
        lastMessage: item.messages[0]?.content || '',
        lastSenderRole: item.messages[0]?.senderRole || null,
        messageCount: item._count.messages,
        updatedAt: item.updatedAt,
      })),
    });
  }

  async getSellerConversation(
    conversationId: number,
    userId: number,
    user?: AuthUser,
  ) {
    await this.assertCanManageConversation(conversationId, userId, user);
    return this.response('Shop conversation retrieved successfully', {
      conversation: await this.serializeConversation(conversationId),
    });
  }

  async sendSellerMessage(
    conversationId: number,
    userId: number,
    user: AuthUser | undefined,
    message: string,
  ) {
    await this.assertCanManageConversation(conversationId, userId, user);
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        senderRole: this.isAdmin(user) ? ChatMessageRole.admin : ChatMessageRole.seller,
        content: message.trim(),
      },
    });
    await this.touchConversation(conversationId);

    return this.response('Message sent successfully', {
      conversation: await this.serializeConversation(conversationId),
    });
  }

  private async getOrCreateConversation(sellerId: number, userId: number) {
    const shop = await this.ensureLegacyShop(sellerId);
    return this.prisma.conversation.upsert({
      where: { userId_shopId: { userId, shopId: shop.id } },
      update: {},
      create: { userId, shopId: shop.id },
    });
  }

  private async ensureLegacyShop(sellerId: number) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
    });
    if (!seller || seller.status !== 'APPROVED') {
      throw new NotFoundException('Approved seller profile not found');
    }

    const existing = await this.prisma.shop.findUnique({
      where: { ownerId: seller.userId },
    });
    if (existing) return existing;

    return this.prisma.shop.create({
      data: {
        ownerId: seller.userId,
        shopName: seller.shopName,
        slug: seller.shopSlug,
        description: seller.description,
        logo: seller.logo,
        banner: seller.banner,
        phone: seller.phone,
        address: seller.address,
        status: 'active',
        approvedAt: new Date(),
      },
    });
  }

  private async resolveManageableShopIds(userId: number, user?: AuthUser) {
    if (this.isAdmin(user)) {
      const shops = await this.prisma.shop.findMany({ select: { id: true } });
      return shops.map((shop) => shop.id);
    }

    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (shop) return [shop.id];

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundException('Seller shop not found');
    const created = await this.ensureLegacyShop(seller.id);
    return [created.id];
  }

  private async assertCanManageConversation(
    conversationId: number,
    userId: number,
    user?: AuthUser,
  ) {
    if (this.isAdmin(user)) return;
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { shop: { select: { ownerId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.shop?.ownerId !== userId) {
      throw new ForbiddenException('Cannot access another shop conversation');
    }
  }

  private async serializeConversation(conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true, avatar: true, image: true } },
        shop: true,
        messages: {
          include: {
            sender: { select: { id: true, name: true, fullName: true, email: true, avatar: true, image: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return {
      id: conversation.id,
      conversationId: conversation.id,
      user: conversation.user,
      shop: conversation.shop,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        message: message.content,
        isRead: message.isRead,
        sender: message.sender,
        createdAt: message.createdAt,
      })),
    };
  }

  private async touchConversation(conversationId: number) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private isAdmin(user?: AuthUser) {
    const role = String(user?.accountRole || user?.role || user?.legacyRole || '').toUpperCase();
    return role === 'ADMIN' || role === 'ROOT';
  }

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }
}
