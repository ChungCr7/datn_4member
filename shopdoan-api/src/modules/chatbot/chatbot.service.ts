import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatSender, MarketplaceOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type ChatIntent =
  | 'greeting'
  | 'product_search'
  | 'price_question'
  | 'compare_products'
  | 'order_tracking'
  | 'payment'
  | 'shipping'
  | 'seller_register'
  | 'return_policy'
  | 'add_to_cart'
  | 'recommendation'
  | 'thanks'
  | 'fallback';

type ChatLanguage = 'vi' | 'en';

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
  score: number;
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

type ChatMemory = {
  preferredLanguage?: ChatLanguage;
  interests?: string[];
  budgetMax?: number;
  lastKeywords?: string[];
  lastIntent?: ChatIntent;
  lastProductIds?: number[];
  userName?: string;
  updatedAt?: string;
};

type ParsedMessage = {
  intent: ChatIntent;
  language: ChatLanguage;
  keyword: string;
  tokens: string[];
  priceMax?: number;
  quantity: number;
  requestedOrdinal?: number;
};

type ConversationContext = {
  recentMessages: { sender: ChatSender; message: string }[];
  memory: ChatMemory;
};

@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(message: string, userId?: number, sessionId?: number) {
    const cleanMessage = message.trim();
    const session = await this.getOrCreateSession(userId, sessionId);

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: ChatSender.USER,
        message: cleanMessage,
      },
    });

    const context = await this.getConversationContext(session.id, userId);
    const parsed = this.parseMessage(cleanMessage, context);
    const payload = await this.buildBotPayload(
      parsed,
      cleanMessage,
      userId,
      context,
    );

    const botMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: ChatSender.BOT,
        message: payload.response,
      },
    });

    await this.learnFromConversation(userId, parsed, payload, context);

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
        ai: this.aiInfo(parsed.language),
        botMessage,
        conversation,
      },
      response: payload.response,
      conversationId: session.id,
      suggestions: payload.products,
      products: payload.products,
      cartAction: payload.cartAction,
      quickReplies: payload.quickReplies,
      ai: this.aiInfo(parsed.language),
      conversation,
    };
  }

  getAiStatus() {
    return {
      success: true,
      message: 'Adaptive ShopDoan assistant is active',
      data: {
        activeProvider: 'adaptive_internal',
        externalProviders: false,
        model: 'shopdoan-humanlike-memory-v2',
        capabilities: [
          'language_detection',
          'conversation_context',
          'preference_memory',
          'product_recommendation',
          'order_support',
        ],
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

  private async getConversationContext(
    sessionId: number,
    userId?: number,
  ): Promise<ConversationContext> {
    const [recentMessages, memory] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { sender: true, message: true },
      }),
      userId
        ? this.prisma.aiMemory.findUnique({
            where: { userId_key: { userId, key: 'chatbot_profile' } },
          })
        : Promise.resolve(null),
    ]);

    return {
      recentMessages: recentMessages.reverse(),
      memory: this.parseMemory(memory?.value),
    };
  }

  private parseMessage(
    message: string,
    context: ConversationContext,
  ): ParsedMessage {
    const normalized = this.normalize(message);
    const language = this.detectLanguage(message, context.memory);
    const priceMax = this.extractPriceMax(normalized);
    const quantity = this.extractQuantity(normalized);
    const requestedOrdinal = this.extractOrdinal(normalized);
    const intent = this.detectIntent(normalized, context, requestedOrdinal);
    const keyword = this.extractProductKeyword(normalized, intent, context);
    const tokens = this.extractKeywords(keyword || message);

    return {
      intent,
      language,
      keyword,
      tokens,
      priceMax,
      quantity,
      requestedOrdinal,
    };
  }

  private detectLanguage(message: string, memory: ChatMemory): ChatLanguage {
    const normalized = this.normalize(message);
    const vietnameseSignals =
      /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
        message,
      ) ||
      /\b(toi|minh|ban|can|muon|tim|mua|don hang|giao hang|gia|bao nhieu|cam on|xin chao)\b/.test(
        normalized,
      );
    const englishSignals =
      /\b(hello|hi|please|find|search|order|shipping|payment|price|cheap|recommend|thanks)\b/.test(
        normalized,
      );

    if (vietnameseSignals) return 'vi';
    if (englishSignals) return 'en';
    return memory.preferredLanguage || 'vi';
  }

  private detectIntent(
    text: string,
    context: ConversationContext,
    requestedOrdinal?: number,
  ): ChatIntent {
    if (/^(hi|hello|hey|xin chao|chao|alo)\b/.test(text)) return 'greeting';
    if (/\b(cam on|thank|thanks|ok cam on|tks)\b/.test(text)) return 'thanks';
    if (
      /\b(them vao gio|bo vao gio|add to cart|dat mua|mua ngay|lay cai|chon cai)\b/.test(
        text,
      ) ||
      requestedOrdinal
    ) {
      const hasRecentProducts = Boolean(context.memory.lastProductIds?.length);
      if (
        hasRecentProducts ||
        /them vao gio|add to cart|dat mua|mua ngay/.test(text)
      ) {
        return 'add_to_cart';
      }
    }
    if (
      /\b(so sanh|khac nhau|nen chon|compare|which one|better)\b/.test(text)
    ) {
      return 'compare_products';
    }
    if (
      /\b(don hang|ma don|trang thai don|hang cua toi|dang o dau|order|tracking)\b/.test(
        text,
      )
    ) {
      return 'order_tracking';
    }
    if (
      /\b(thanh toan|cod|momo|the tin dung|credit|bank|chuyen khoan|payment)\b/.test(
        text,
      )
    ) {
      return 'payment';
    }
    if (
      /\b(giao hang|van chuyen|ship|phi ship|bao lau|nhan hang|shipping|delivery)\b/.test(
        text,
      )
    ) {
      return 'shipping';
    }
    if (
      /\b(ban hang|dang ky ban|mo shop|nguoi ban|seller|shop|vendor)\b/.test(
        text,
      )
    ) {
      return 'seller_register';
    }
    if (
      /\b(doi tra|hoan hang|tra hang|bao hanh|refund|return|warranty|chinh sach)\b/.test(
        text,
      )
    ) {
      return 'return_policy';
    }
    if (
      /\b(goi y|de xuat|recommend|suggest|hop voi toi|phu hop voi toi)\b/.test(
        text,
      )
    ) {
      return 'recommendation';
    }
    if (
      /\b(gia|bao nhieu|duoi|re|khuyen mai|sale|price|cheap|budget)\b/.test(
        text,
      )
    ) {
      return 'price_question';
    }
    if (
      /\b(mua|tim|can|muon|san pham|ao|quan|giay|tui|balo|tai nghe|dien thoai|iphone|laptop|find|search|buy|product)\b/.test(
        text,
      )
    ) {
      return 'product_search';
    }
    if (context.memory.lastIntent === 'product_search' && text.length < 40) {
      return 'product_search';
    }
    return 'fallback';
  }

  private async buildBotPayload(
    parsed: ParsedMessage,
    rawMessage: string,
    userId: number | undefined,
    context: ConversationContext,
  ): Promise<BotPayload> {
    const quickReplies = this.buildQuickReplies(
      parsed.language,
      context.memory,
    );

    if (parsed.intent === 'greeting') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'Hi! I can help you find products, compare prices, remember your preferences, track orders, and guide checkout. What are you looking for today?'
            : 'Chào bạn! Mình có thể tìm sản phẩm, so sánh giá, nhớ sở thích mua sắm, kiểm tra đơn hàng và hướng dẫn thanh toán. Hôm nay bạn muốn tìm món gì?',
      };
    }

    if (parsed.intent === 'thanks') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'You are welcome. I will remember what you liked so the next suggestions get closer.'
            : 'Không có gì nha. Mình sẽ nhớ những gì bạn quan tâm để lần sau gợi ý sát hơn.',
      };
    }

    if (parsed.intent === 'order_tracking') {
      return this.buildOrderTrackingResponse(
        userId,
        quickReplies,
        parsed.language,
      );
    }

    if (parsed.intent === 'payment') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'ShopDoan currently supports COD. Momo, credit card, and bank transfer flows are available as demo/mock payment paths and can be connected to real provider keys through environment variables.'
            : 'ShopDoan hiện hỗ trợ COD ổn định. Momo, thẻ tín dụng và chuyển khoản đang có luồng demo/mock; khi có key thật thì cấu hình qua biến môi trường là dùng được.',
      };
    }

    if (parsed.intent === 'shipping') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'Shipping fee is calculated during checkout and saved clearly in the order. If you tell me your budget and product type, I can suggest items that leave room for shipping.'
            : 'Phí vận chuyển sẽ được tính ở bước thanh toán và lưu rõ trong đơn hàng. Nếu bạn nói ngân sách và loại sản phẩm, mình có thể gợi ý món vừa tiền hơn để còn dư phí ship.',
      };
    }

    if (parsed.intent === 'seller_register') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'To open a shop, register as a seller from your buyer account. The shop profile stays pending until an admin approves it, then you can publish products.'
            : 'Bạn có thể đăng ký người bán bằng tài khoản người mua. Hồ sơ shop sẽ ở trạng thái chờ duyệt; sau khi admin duyệt thì shop mới đăng sản phẩm được.',
      };
    }

    if (parsed.intent === 'return_policy') {
      return {
        intent: parsed.intent,
        products: [],
        quickReplies,
        response:
          parsed.language === 'en'
            ? 'Demo return policy: buyers can request support when an item is defective, wrong, or different from the description. Admin/seller reviews the order before refund handling.'
            : 'Chính sách đổi trả demo: người mua có thể yêu cầu hỗ trợ nếu sản phẩm lỗi, sai mô tả hoặc giao nhầm. Admin/seller sẽ kiểm tra đơn hàng trước khi xử lý hoàn tiền.',
      };
    }

    if (parsed.intent === 'add_to_cart') {
      const product = await this.resolveCartProduct(parsed, context);
      if (product) {
        return {
          intent: parsed.intent,
          products: [product],
          quickReplies,
          response:
            parsed.language === 'en'
              ? `Got it. I added ${parsed.quantity} x ${product.name} to your cart.`
              : `Được nha. Mình đã thêm ${parsed.quantity} x ${product.name} vào giỏ hàng cho bạn.`,
          cartAction: { type: 'add', quantity: parsed.quantity, product },
        };
      }
    }

    const products = await this.findProducts(parsed, context, rawMessage);

    if (products.length) {
      if (parsed.intent === 'compare_products') {
        return {
          intent: parsed.intent,
          products,
          quickReplies,
          response: this.buildComparisonResponse(products, parsed.language),
        };
      }

      return {
        intent: parsed.intent === 'fallback' ? 'product_search' : parsed.intent,
        products,
        quickReplies,
        response: this.buildProductResponse(products, parsed, context),
        cartAction:
          /them vao gio|bo vao gio|dat mua|mua ngay|add to cart|buy now/.test(
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
        parsed.language === 'en'
          ? 'I do not have a close match yet. Try telling me the product type, budget, brand, or use case, for example: "wireless earbuds under 500k" or "best-selling phone".'
          : 'Mình chưa tìm thấy kết quả đủ khớp. Bạn nói thêm loại sản phẩm, ngân sách, thương hiệu hoặc nhu cầu dùng nhé, ví dụ: "tai nghe bluetooth dưới 500k" hoặc "điện thoại bán chạy".',
    };
  }

  private async buildOrderTrackingResponse(
    userId: number | undefined,
    quickReplies: string[],
    language: ChatLanguage,
  ): Promise<BotPayload> {
    if (!userId) {
      return {
        intent: 'order_tracking',
        products: [],
        quickReplies,
        response:
          language === 'en'
            ? 'Please sign in so I can check your latest order. After signing in, ask me: "Where is my order?"'
            : 'Bạn cần đăng nhập để mình kiểm tra đơn hàng mới nhất. Sau khi đăng nhập, hãy hỏi lại "đơn hàng của tôi ở đâu".',
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
          language === 'en'
            ? 'I do not see any orders in your account yet. You can search for a product and create a COD order first.'
            : 'Mình chưa thấy đơn hàng nào trong tài khoản của bạn. Bạn có thể tìm sản phẩm và tạo đơn COD trước.',
      };
    }

    const statusText = this.humanizeOrderStatus(order.orderStatus, language);
    const itemNames = order.orderItems
      .map((item) => item.productName || item.product?.name)
      .filter(Boolean)
      .join(', ');

    const payableAmount = order.finalAmount ?? order.totalAmount ?? 0;

    return {
      intent: 'order_tracking',
      products: [],
      quickReplies,
      response:
        language === 'en'
          ? `Your latest order ${order.orderCode || `#${order.id}`} is ${statusText}. Items: ${itemNames || 'no item details yet'}. Total: ${payableAmount.toLocaleString('vi-VN')}đ.`
          : `Đơn mới nhất ${order.orderCode || `#${order.id}`} đang ở trạng thái ${statusText}. Sản phẩm: ${itemNames || 'chưa có chi tiết'}. Tổng thanh toán: ${payableAmount.toLocaleString('vi-VN')}đ.`,
    };
  }

  private async findProducts(
    parsed: ParsedMessage,
    context: ConversationContext,
    rawMessage: string,
  ) {
    const searchTokens = this.mergeUnique([
      ...parsed.tokens,
      ...(parsed.intent === 'recommendation'
        ? context.memory.interests || []
        : []),
    ]).slice(0, 8);
    const normalized = this.normalize(rawMessage);
    const saleOnly =
      /\b(giam|khuyen mai|sale|flash sale|uu dai|discount)\b/.test(normalized);
    const bestSelling = /\b(ban chay|hot|pho bien|best selling|popular)\b/.test(
      normalized,
    );
    const budgetMax = parsed.priceMax || context.memory.budgetMax;

    const baseWhere: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(saleOnly ? { salePrice: { not: null } } : {}),
      ...(budgetMax
        ? {
            OR: [
              { salePrice: { lte: budgetMax } },
              { price: { lte: budgetMax } },
            ],
          }
        : {}),
    };

    const tokenWhere: Prisma.ProductWhereInput[] = searchTokens.flatMap(
      (term) => [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
        { seller: { shopName: { contains: term, mode: 'insensitive' } } },
      ],
    );

    let products = await this.prisma.product.findMany({
      where: tokenWhere.length
        ? { AND: [baseWhere, { OR: tokenWhere }] }
        : baseWhere,
      include: this.productInclude(),
      orderBy: bestSelling
        ? [
            { soldCount: 'desc' },
            { ratingAverage: 'desc' },
            { createdAt: 'desc' },
          ]
        : [
            { ratingAverage: 'desc' },
            { soldCount: 'desc' },
            { createdAt: 'desc' },
          ],
      take: 24,
    });

    if (!products.length && (searchTokens.length || saleOnly || bestSelling)) {
      products = await this.prisma.product.findMany({
        where: baseWhere,
        include: this.productInclude(),
        orderBy: [
          ...(saleOnly ? [{ salePrice: 'asc' as const }] : []),
          { soldCount: 'desc' },
          { ratingAverage: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 24,
      });
    }

    return products
      .map((product) => {
        const suggestion = {
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
            parsed.language,
          ),
          score: this.scoreProduct(product, searchTokens, budgetMax, context),
        };
        return suggestion;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  private productInclude() {
    return {
      images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
      category: { select: { id: true, name: true, slug: true } },
      seller: { select: { id: true, shopName: true, shopSlug: true } },
    };
  }

  private scoreProduct(
    product: {
      name: string;
      description: string | null;
      price: number;
      salePrice: number | null;
      soldCount: number;
      ratingAverage: number;
      category: { name: string } | null;
      seller: { shopName: string } | null;
    },
    tokens: string[],
    budgetMax: number | undefined,
    context: ConversationContext,
  ) {
    const haystack = this.normalize(
      [
        product.name,
        product.description || '',
        product.category?.name || '',
        product.seller?.shopName || '',
      ].join(' '),
    );
    const tokenScore = tokens.reduce(
      (score, token) => score + (haystack.includes(token) ? 12 : 0),
      0,
    );
    const interestScore = (context.memory.interests || []).reduce(
      (score, interest) => score + (haystack.includes(interest) ? 5 : 0),
      0,
    );
    const price = product.salePrice ?? product.price;
    const budgetScore = budgetMax && price <= budgetMax ? 10 : 0;
    const saleScore = product.salePrice ? 8 : 0;
    const qualityScore =
      product.ratingAverage * 2 + Math.min(product.soldCount, 100) / 10;
    return tokenScore + interestScore + budgetScore + saleScore + qualityScore;
  }

  private async resolveCartProduct(
    parsed: ParsedMessage,
    context: ConversationContext,
  ) {
    const ids = context.memory.lastProductIds || [];
    const index = parsed.requestedOrdinal ? parsed.requestedOrdinal - 1 : 0;
    const productId = ids[index] || ids[0];
    if (!productId) return null;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: this.productInclude(),
    });
    if (!product) return null;

    return {
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
        parsed.language,
      ),
      score: 100,
    };
  }

  private buildProductResponse(
    products: ProductSuggestion[],
    parsed: ParsedMessage,
    context: ConversationContext,
  ) {
    const lines = products.slice(0, 4).map((product, index) => {
      const price = product.salePrice ?? product.price;
      const stockText =
        product.stock > 0
          ? parsed.language === 'en'
            ? `${product.stock} left`
            : `còn ${product.stock}`
          : parsed.language === 'en'
            ? 'out of stock'
            : 'hết hàng';
      return `${index + 1}. ${product.name} - ${price.toLocaleString('vi-VN')}đ (${product.reason}, ${stockText})`;
    });
    const memoryHint =
      context.memory.interests?.length && parsed.intent === 'recommendation'
        ? parsed.language === 'en'
          ? ` I used what I remember: ${context.memory.interests.slice(0, 3).join(', ')}.`
          : ` Mình có dùng sở thích đã nhớ: ${context.memory.interests.slice(0, 3).join(', ')}.`
        : '';

    if (parsed.language === 'en') {
      return `I found a few good matches:${memoryHint}\n${lines.join('\n')}\nYou can say "add the first one", ask me to compare them, or give me a tighter budget.`;
    }

    return `Mình tìm được vài lựa chọn hợp với yêu cầu:${memoryHint}\n${lines.join('\n')}\nBạn có thể nói "thêm cái đầu tiên", hỏi mình so sánh, hoặc đưa ngân sách cụ thể hơn.`;
  }

  private buildComparisonResponse(
    products: ProductSuggestion[],
    language: ChatLanguage,
  ) {
    const top = products.slice(0, 3);
    const lines = top.map((product) => {
      const price = product.salePrice ?? product.price;
      const valueNote =
        product.salePrice && product.salePrice < product.price
          ? language === 'en'
            ? 'best discount'
            : 'giá tốt vì đang giảm'
          : product.ratingAverage >= 4
            ? language === 'en'
              ? 'strong rating'
              : 'đánh giá tốt'
            : language === 'en'
              ? 'balanced option'
              : 'lựa chọn cân bằng';
      return `- ${product.name}: ${price.toLocaleString('vi-VN')}đ, ${valueNote}, ${product.reason}.`;
    });

    if (language === 'en') {
      return `Here is a quick comparison:\n${lines.join('\n')}\nMy pick is ${top[0]?.name} because it fits the request best overall.`;
    }
    return `Mình so sánh nhanh nhé:\n${lines.join('\n')}\nNếu chọn một món, mình nghiêng về ${top[0]?.name} vì khớp yêu cầu tổng thể nhất.`;
  }

  private buildProductReason(
    soldCount: number,
    ratingAverage: number,
    salePrice: number | null,
    language: ChatLanguage,
  ) {
    if (salePrice)
      return language === 'en' ? 'on sale' : 'đang có giá khuyến mãi';
    if (soldCount > 0) {
      return language === 'en' ? `${soldCount} sold` : `đã bán ${soldCount}`;
    }
    if (ratingAverage > 0) {
      return language === 'en'
        ? `${ratingAverage}/5 rating`
        : `đánh giá ${ratingAverage}/5`;
    }
    return language === 'en' ? 'new on ShopDoan' : 'sản phẩm mới trên sàn';
  }

  private buildQuickReplies(language: ChatLanguage, memory: ChatMemory) {
    const budget = memory.budgetMax
      ? ` dưới ${this.shortMoney(memory.budgetMax)}`
      : ' dưới 500k';
    if (language === 'en') {
      return [
        'Recommend products for me',
        'Best-selling products',
        'Sale products',
        'Where is my order?',
        'How to open a shop',
      ];
    }
    return [
      memory.interests?.[0]
        ? `Gợi ý ${memory.interests[0]}${budget}`
        : `Gợi ý sản phẩm${budget}`,
      'Sản phẩm bán chạy',
      'Sản phẩm đang giảm giá',
      'Đơn hàng của tôi ở đâu?',
      'Cách đăng ký bán hàng',
    ];
  }

  private async learnFromConversation(
    userId: number | undefined,
    parsed: ParsedMessage,
    payload: BotPayload,
    context: ConversationContext,
  ) {
    if (!userId) return;

    const nextMemory: ChatMemory = {
      ...context.memory,
      preferredLanguage: parsed.language,
      budgetMax: parsed.priceMax || context.memory.budgetMax,
      lastKeywords: parsed.tokens.length
        ? parsed.tokens
        : context.memory.lastKeywords,
      lastIntent: payload.intent,
      lastProductIds: payload.products.length
        ? payload.products.map((product) => product.id)
        : context.memory.lastProductIds,
      interests: this.mergeUnique([
        ...(context.memory.interests || []),
        ...parsed.tokens.filter((token) => token.length > 2),
      ]).slice(-20),
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.aiMemory.upsert({
      where: { userId_key: { userId, key: 'chatbot_profile' } },
      create: {
        userId,
        key: 'chatbot_profile',
        value: nextMemory as Prisma.JsonObject,
      },
      update: {
        value: nextMemory as Prisma.JsonObject,
      },
    });

    if (parsed.tokens.length) {
      await this.prisma.searchHistory.create({
        data: {
          userId,
          query: parsed.tokens.join(' '),
          keyword: parsed.tokens[0],
          targetType: 'product',
        },
      });
    }
  }

  private parseMemory(value?: Prisma.JsonValue | null): ChatMemory {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const data = value as Record<string, unknown>;
    return {
      preferredLanguage:
        data.preferredLanguage === 'en' || data.preferredLanguage === 'vi'
          ? data.preferredLanguage
          : undefined,
      interests: Array.isArray(data.interests)
        ? data.interests.filter(
            (item): item is string => typeof item === 'string',
          )
        : undefined,
      budgetMax:
        typeof data.budgetMax === 'number' ? data.budgetMax : undefined,
      lastKeywords: Array.isArray(data.lastKeywords)
        ? data.lastKeywords.filter(
            (item): item is string => typeof item === 'string',
          )
        : undefined,
      lastIntent:
        typeof data.lastIntent === 'string'
          ? (data.lastIntent as ChatIntent)
          : undefined,
      lastProductIds: Array.isArray(data.lastProductIds)
        ? data.lastProductIds
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item))
        : undefined,
      userName: typeof data.userName === 'string' ? data.userName : undefined,
      updatedAt:
        typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    };
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
      'khong',
      'nay',
      'kia',
      'the',
      'first',
      'second',
      'third',
      'find',
      'search',
      'buy',
      'cheap',
      'under',
      'product',
      'please',
      'recommend',
      'suggest',
    ]);

    return this.normalize(text)
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 1 && !stopWords.has(word));
  }

  private extractProductKeyword(
    text: string,
    intent: ChatIntent,
    context: ConversationContext,
  ) {
    if (
      ![
        'product_search',
        'price_question',
        'fallback',
        'recommendation',
        'compare_products',
      ].includes(intent)
    ) {
      return '';
    }

    const keyword = this.normalize(text)
      .replace(
        /\b(toi|minh|ban|muon|mua|tim|can|san pham|gia|bao nhieu|duoi|re|co|khong|cho|voi|them vao gio|dat mua|mua ngay|goi y|de xuat|so sanh|find|search|buy|recommend|suggest|compare|under)\b/g,
        ' ',
      )
      .replace(/\d+\s*(k|nghin|trieu|000|million)?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (keyword) return keyword;
    return (context.memory.lastKeywords || []).join(' ');
  }

  private extractPriceMax(text: string) {
    const match = text.match(
      /(?:duoi|toi da|khoang|tam|<|under|below|budget)\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|trieu|million|000)?/,
    );
    if (!match) return undefined;
    const value = Number(match[1].replace(',', '.'));
    if (match[2] === 'trieu' || match[2] === 'million')
      return value * 1_000_000;
    if (match[2] === 'k' || match[2] === 'nghin') return value * 1_000;
    if (match[2] === '000') return value * 1_000;
    return value;
  }

  private extractQuantity(text: string) {
    const quantityMatch = text.match(
      /(?:so luong|quantity|qty|lay|mua|them)\s*(\d+)/,
    );
    if (quantityMatch) return Math.max(1, Number(quantityMatch[1]));
    const match = text.match(/\b(\d+)\b/);
    return match ? Math.max(1, Number(match[1])) : 1;
  }

  private extractOrdinal(text: string) {
    const ordinalMap: Record<string, number> = {
      'dau tien': 1,
      'thu nhat': 1,
      nhat: 1,
      first: 1,
      'thu hai': 2,
      hai: 2,
      second: 2,
      'thu ba': 3,
      ba: 3,
      third: 3,
      'thu tu': 4,
      bon: 4,
      fourth: 4,
    };
    for (const [key, value] of Object.entries(ordinalMap)) {
      if (new RegExp(`\\b${key}\\b`).test(text)) return value;
    }
    const numeric = text.match(/\b(?:cai|so|#)?\s*([1-4])\b/);
    return numeric ? Number(numeric[1]) : undefined;
  }

  private humanizeOrderStatus(
    status: MarketplaceOrderStatus | null,
    language: ChatLanguage,
  ) {
    const viMap: Record<MarketplaceOrderStatus, string> = {
      PENDING: 'chờ xác nhận',
      CONFIRMED: 'đã xác nhận',
      PACKING: 'đang đóng gói',
      SHIPPING: 'đang giao hàng',
      DELIVERED: 'đã giao',
      CANCELLED: 'đã hủy',
    };
    const enMap: Record<MarketplaceOrderStatus, string> = {
      PENDING: 'pending confirmation',
      CONFIRMED: 'confirmed',
      PACKING: 'being packed',
      SHIPPING: 'being shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    if (!status) return language === 'en' ? 'pending' : 'chờ xử lý';
    return language === 'en' ? enMap[status] : viMap[status];
  }

  private aiInfo(language: ChatLanguage) {
    return {
      provider: 'adaptive_internal',
      model: 'shopdoan-humanlike-memory-v2',
      language,
    };
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

  private mergeUnique(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private shortMoney(value: number) {
    if (value >= 1_000_000) return `${value / 1_000_000} triệu`;
    if (value >= 1_000) return `${value / 1_000}k`;
    return `${value}đ`;
  }
}
