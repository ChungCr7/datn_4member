import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatSender, MarketplaceOrderStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type ChatIntent =
  | 'product_search'
  | 'price_question'
  | 'order_tracking'
  | 'payment'
  | 'shipping'
  | 'seller_register'
  | 'return_policy'
  | 'fallback';

type ProductSuggestion = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  ratingAverage: number;
  soldCount: number;
  stock: number;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  seller: {
    id: number;
    shopName: string;
    shopSlug: string;
  } | null;
  reason: string;
};

type BotPayload = {
  response: string;
  products: ProductSuggestion[];
  quickReplies: string[];
  intent: ChatIntent;
  cartAction?: {
    type: 'add';
    quantity: number;
    product: ProductSuggestion;
  };
};

type AuthUser = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  role?: string;
  accountRole?: string;
  legacyRole?: string;
};

@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(message: string, userId?: number, sessionId?: number) {
    const session = await this.getOrCreateSession(userId, sessionId);

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: ChatSender.USER,
        message,
      },
    });

    const parsed = this.parseMessage(message);
    const payload = await this.buildBotPayload(parsed, message, userId);

    const botMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: ChatSender.BOT,
        message: payload.response,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    const conversation = await this.serializeSession(session.id);

    return {
      success: true,
      message: 'Chatbot replied successfully',
      data: {
        sessionId: session.id,
        conversationId: session.id,
        response: payload.response,
        intent: payload.intent,
        products: payload.products,
        suggestions: payload.products,
        quickReplies: payload.quickReplies,
        cartAction: payload.cartAction,
        ai: {
          provider: 'rule_based',
          model: 'shopdoan-marketplace-rules-v1',
        },
        botMessage,
        conversation,
      },
      response: payload.response,
      conversationId: session.id,
      suggestions: payload.products,
      products: payload.products,
      cartAction: payload.cartAction,
      quickReplies: payload.quickReplies,
      ai: {
        provider: 'rule_based',
        model: 'shopdoan-marketplace-rules-v1',
      },
      conversation,
    };
  }

  getAiStatus() {
    return {
      success: true,
      message: 'Internal chatbot is active',
      data: {
        activeProvider: 'rule_based',
        externalProviders: false,
        model: 'shopdoan-marketplace-rules-v1',
      },
    };
  }

  async getConversations(user?: AuthUser) {
    const userId = this.getUserId(user);
    const role = this.normalizeRole(user);
    const isAdminOrSeller =
      role === 'ADMIN' || role === 'SELLER' || role === 'ROOT';

    const sessions = await this.prisma.chatSession.findMany({
      where: isAdminOrSeller ? undefined : { userId },
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const data = sessions.map((session) => ({
      id: session.id,
      sessionId: session.id,
      conversationId: session.id,
      user: session.user,
      lastMessage: session.messages[0]?.message || '',
      messageCount: session._count.messages,
      updatedAt: session.updatedAt,
    }));

    return {
      success: true,
      message: 'Chat conversations retrieved successfully',
      data: { conversations: data },
    };
  }

  async getConversation(sessionId: number, user?: AuthUser) {
    await this.assertUserCanAccessConversation(
      this.getUserId(user),
      sessionId,
      user,
    );
    return this.serializeSession(sessionId);
  }

  async getAdminConversation(sessionId: number) {
    return this.serializeSession(sessionId);
  }

  async getUserConversation(userId: number) {
    const session = await this.getOrCreateSession(userId);
    return this.serializeSession(session.id);
  }

  async addSellerReply(sessionId: number, sellerId: number, text: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Chat session not found');

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        sender: ChatSender.BOT,
        message: text,
      },
    });
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    void sellerId;
    return this.serializeSession(sessionId);
  }

  async assertUserCanAccessConversation(
    userId: number | undefined,
    sessionId: number,
    user?: AuthUser,
  ) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    if (this.canManageConversations(user)) return;
    if (session.userId && session.userId !== userId) {
      throw new ForbiddenException('Cannot access another chat session');
    }
  }

  private async getOrCreateSession(userId?: number, sessionId?: number) {
    if (sessionId) {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw new NotFoundException('Chat session not found');
      if (session.userId && userId && session.userId !== userId) {
        throw new ForbiddenException('Cannot use another chat session');
      }
      if (!session.userId && userId) {
        return this.prisma.chatSession.update({
          where: { id: sessionId },
          data: { userId },
        });
      }
      return session;
    }

    if (userId) {
      const existing = await this.prisma.chatSession.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (existing) return existing;
    }

    return this.prisma.chatSession.create({
      data: userId ? { userId } : {},
    });
  }

  private async serializeSession(sessionId: number) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) throw new NotFoundException('Chat session not found');

    return {
      id: session.id,
      sessionId: session.id,
      conversationId: session.id,
      user: session.user,
      updatedAt: session.updatedAt,
      messages: session.messages.map((message) => ({
        id: message.id,
        role: message.sender === ChatSender.BOT ? 'bot' : 'user',
        sender: message.sender,
        text: message.message,
        message: message.message,
        timestamp: message.createdAt,
        createdAt: message.createdAt,
      })),
    };
  }

  private parseMessage(message: string) {
    const normalized = this.normalize(message);
    const priceMax = this.extractPriceMax(normalized);
    const quantity = this.extractQuantity(normalized);
    const intent = this.detectIntent(normalized);
    const keyword = this.extractProductKeyword(normalized, intent);

    return { intent, keyword, priceMax, quantity };
  }

  private detectIntent(text: string): ChatIntent {
    if (
      /don hang|ma don|trang thai don|hang cua toi|dang o dau|order/.test(text)
    ) {
      return 'order_tracking';
    }
    if (
      /thanh toan|cod|momo|the tin dung|credit|bank|chuyen khoan/.test(text)
    ) {
      return 'payment';
    }
    if (/giao hang|van chuyen|ship|phi ship|bao lau|nhan hang/.test(text)) {
      return 'shipping';
    }
    if (/ban hang|dang ky ban|mo shop|nguoi ban|seller|shop/.test(text)) {
      return 'seller_register';
    }
    if (/doi tra|hoan hang|tra hang|bao hanh|refund|chinh sach/.test(text)) {
      return 'return_policy';
    }
    if (/gia|bao nhieu|duoi|re|khuyen mai|sale/.test(text)) {
      return 'price_question';
    }
    if (
      /mua|tim|can|muon|san pham|ao|quan|giay|tui|balo|tai nghe|dien thoai/.test(
        text,
      )
    ) {
      return 'product_search';
    }
    return 'fallback';
  }

  private async buildBotPayload(
    parsed: ReturnType<ChatbotService['parseMessage']>,
    rawMessage: string,
    userId?: number,
  ): Promise<BotPayload> {
    const quickReplies = [
      'Tìm iPhone dưới 30 triệu',
      'Sản phẩm đang giảm giá',
      'Đơn hàng của tôi ở đâu?',
      'Cách đăng ký bán hàng',
      'Chính sách đổi trả',
    ];

    if (parsed.intent === 'order_tracking') {
      return this.buildOrderTrackingResponse(userId, quickReplies);
    }

    if (parsed.intent === 'payment') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          'ShopDoan hiện hỗ trợ COD trước. Momo, thẻ tín dụng và chuyển khoản đang có luồng mock để demo, khi có key thật sẽ cấu hình qua biến môi trường.',
      };
    }

    if (parsed.intent === 'shipping') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          'Phí vận chuyển sẽ được tính ở bước thanh toán. Với bản demo hiện tại, hệ thống dùng shipping fee mock và lưu rõ trong đơn hàng.',
      };
    }

    if (parsed.intent === 'seller_register') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          'Bạn có thể đăng ký người bán bằng tài khoản người mua. Hồ sơ shop sẽ ở trạng thái chờ duyệt, sau khi admin duyệt thì shop mới được đăng sản phẩm.',
      };
    }

    if (parsed.intent === 'return_policy') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          'Chính sách đổi trả demo: người mua có thể yêu cầu hỗ trợ nếu sản phẩm lỗi, sai mô tả hoặc giao nhầm. Admin/seller sẽ kiểm tra đơn hàng trước khi hoàn tiền.',
      };
    }

    const products = await this.findProducts(
      parsed.keyword || rawMessage,
      parsed.priceMax,
    );

    if (products.length) {
      const lines = products.slice(0, 4).map((product, index) => {
        const price = product.salePrice ?? product.price;
        return `${index + 1}. ${product.name} - ${price.toLocaleString('vi-VN')}đ (${product.reason})`;
      });

      return {
        intent: parsed.intent,
        products,
        quickReplies,
        response: `Mình tìm thấy vài sản phẩm phù hợp:\n${lines.join('\n')}\nBạn có thể mở chi tiết, thêm vào giỏ hoặc hỏi tiếp theo giá/danh mục/tên shop.`,
        cartAction: /them vao gio|bo vao gio|dat mua|mua ngay/.test(
          this.normalize(rawMessage),
        )
          ? { type: 'add', quantity: parsed.quantity, product: products[0] }
          : undefined,
      };
    }

    return {
      intent: 'fallback',
      products: [],
      quickReplies,
      response:
        'Mình chưa tìm thấy thông tin đủ khớp. Bạn có thể hỏi theo mẫu như "tìm iPhone dưới 30 triệu", "giá tai nghe bluetooth", "đơn hàng của tôi ở đâu" hoặc "cách đăng ký bán hàng".',
    };
  }

  private async buildOrderTrackingResponse(
    userId: number | undefined,
    quickReplies: string[],
  ): Promise<BotPayload> {
    if (!userId) {
      return {
        intent: 'order_tracking',
        products: [],
        quickReplies,
        response:
          'Bạn cần đăng nhập để mình kiểm tra đơn hàng mới nhất. Sau khi đăng nhập, hãy hỏi lại "đơn hàng của tôi ở đâu".',
      };
    }

    const order = await this.prisma.order.findFirst({
      where: { userId },
      include: {
        orderItems: {
          take: 3,
          include: { product: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) {
      return {
        intent: 'order_tracking',
        products: [],
        quickReplies,
        response:
          'Mình chưa thấy đơn hàng nào trong tài khoản của bạn. Bạn có thể tìm sản phẩm và tạo đơn COD trước.',
      };
    }

    const statusText = this.humanizeOrderStatus(order.orderStatus);
    const itemNames = order.orderItems
      .map((item) => item.productName || item.product?.name)
      .filter(Boolean)
      .join(', ');

    const payableAmount = order.finalAmount ?? order.totalAmount ?? 0;

    return {
      intent: 'order_tracking',
      products: [],
      quickReplies,
      response: `Đơn mới nhất ${order.orderCode || `#${order.id}`} đang ở trạng thái ${statusText}. Sản phẩm: ${itemNames || 'chưa có chi tiết'}. Tổng thanh toán: ${payableAmount.toLocaleString('vi-VN')}đ.`,
    };
  }

  private async findProducts(keyword: string, priceMax?: number) {
    const normalized = this.normalize(keyword);
    const saleOnly = /giam|khuyen mai|sale|flash sale|uu dai/.test(
      normalized,
    );
    const bestSelling = /ban chay|hot|pho bien/.test(normalized);
    const terms = this.extractKeywords(keyword);
    const where = {
      status: 'ACTIVE' as const,
      ...(saleOnly ? { salePrice: { not: null } } : {}),
      ...(priceMax
        ? {
            OR: [
              { salePrice: { lte: priceMax } },
              { price: { lte: priceMax } },
            ],
          }
        : {}),
      ...(!saleOnly && terms.length
        ? {
            AND: terms.slice(0, 5).map((term) => ({
              OR: [
                { name: { contains: term, mode: 'insensitive' as const } },
                {
                  description: { contains: term, mode: 'insensitive' as const },
                },
                {
                  category: {
                    name: { contains: term, mode: 'insensitive' as const },
                  },
                },
                {
                  seller: {
                    shopName: { contains: term, mode: 'insensitive' as const },
                  },
                },
              ],
            })),
          }
        : {}),
    };

    let products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, shopName: true, shopSlug: true } },
      },
      orderBy: bestSelling
        ? [
            { soldCount: 'desc' as const },
            { ratingAverage: 'desc' as const },
            { createdAt: 'desc' as const },
          ]
        : [
            { ratingAverage: 'desc' as const },
            { soldCount: 'desc' as const },
            { createdAt: 'desc' as const },
      ],
      take: 8,
    });

    if (!products.length && terms.length) {
      products = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          ...(priceMax
            ? {
                OR: [
                  { salePrice: { lte: priceMax } },
                  { price: { lte: priceMax } },
                ],
              }
            : {}),
          OR: terms.slice(0, 5).flatMap((term) => [
            { name: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
            {
              category: {
                name: { contains: term, mode: 'insensitive' as const },
              },
            },
            {
              seller: {
                shopName: { contains: term, mode: 'insensitive' as const },
              },
            },
          ]),
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, shopName: true, shopSlug: true } },
        },
        orderBy: [
          { soldCount: 'desc' as const },
          { ratingAverage: 'desc' as const },
          { createdAt: 'desc' as const },
        ],
        take: 8,
      });
    }

    if (!products.length && (saleOnly || bestSelling || terms.length)) {
      products = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          ...(priceMax
            ? {
                OR: [
                  { salePrice: { lte: priceMax } },
                  { price: { lte: priceMax } },
                ],
              }
            : {}),
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, shopName: true, shopSlug: true } },
        },
        orderBy: [
          ...(saleOnly ? [{ salePrice: 'asc' as const }] : []),
          { soldCount: 'desc' as const },
          { ratingAverage: 'desc' as const },
          { createdAt: 'desc' as const },
        ],
        take: 8,
      });
    }

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      salePrice: product.salePrice,
      image: product.images[0]?.imageUrl || null,
      ratingAverage: product.ratingAverage,
      soldCount: product.soldCount,
      stock: product.stock,
      category: product.category,
      seller: product.seller,
      reason: this.buildProductReason(
        product.soldCount,
        product.ratingAverage,
        product.salePrice,
      ),
    }));
  }

  private buildProductReason(
    soldCount: number,
    ratingAverage: number,
    salePrice: number | null,
  ) {
    if (salePrice) return 'đang có giá khuyến mãi';
    if (soldCount > 0) return `đã bán ${soldCount}`;
    if (ratingAverage > 0) return `đánh giá ${ratingAverage}/5`;
    return 'sản phẩm mới trên sàn';
  }

  private extractKeywords(text: string) {
    const stopWords = new Set([
      'toi',
      'minh',
      'ban',
      'muon',
      'mua',
      'tim',
      'can',
      'san',
      'pham',
      'gia',
      'bao',
      'nhieu',
      'duoi',
      're',
      'cho',
      'voi',
      'mot',
      'cai',
      'dang',
      'giam',
      'trieu',
      'nghin',
      'k',
    ]);

    return this.normalize(text)
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 1 && !stopWords.has(word));
  }

  private extractProductKeyword(text: string, intent: ChatIntent) {
    if (!['product_search', 'price_question', 'fallback'].includes(intent)) {
      return '';
    }

    return this.normalize(text)
      .replace(
        /\b(toi|minh|muon|mua|tim|can|san pham|gia|bao nhieu|duoi|re|co|khong|cho|voi|them vao gio|dat mua|mua ngay)\b/g,
        ' ',
      )
      .replace(/\d+\s*(k|nghin|trieu|000)?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractPriceMax(text: string) {
    const match = text.match(
      /(?:duoi|toi da|<|tam)\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|trieu|000)?/,
    );
    if (!match) return undefined;
    const value = Number(match[1].replace(',', '.'));
    if (match[2] === 'trieu') return value * 1_000_000;
    if (match[2] === 'k' || match[2] === 'nghin') return value * 1_000;
    if (match[2] === '000') return value * 1_000;
    return value;
  }

  private extractQuantity(text: string) {
    const match = text.match(/\b(\d+)\b/);
    return match ? Math.max(1, Number(match[1])) : 1;
  }

  private humanizeOrderStatus(status: MarketplaceOrderStatus | null) {
    const map: Record<MarketplaceOrderStatus, string> = {
      PENDING: 'chờ xác nhận',
      CONFIRMED: 'đã xác nhận',
      PACKING: 'đang đóng gói',
      SHIPPING: 'đang giao hàng',
      DELIVERED: 'đã giao',
      CANCELLED: 'đã hủy',
    };
    return status ? map[status] : 'chờ xử lý';
  }

  private canManageConversations(user?: AuthUser) {
    const role = this.normalizeRole(user);
    return role === 'ADMIN' || role === 'SELLER' || role === 'ROOT';
  }

  private normalizeRole(user?: AuthUser) {
    return String(
      user?.accountRole || user?.role || user?.legacyRole || '',
    ).toUpperCase();
  }

  private getUserId(user?: AuthUser) {
    const userId = user?.userId || user?.sub || user?.id;
    return userId ? Number(userId) : undefined;
  }

  private normalize(text: string) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
