'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Bot,
  ChevronRight,
  Loader2,
  MessageCircle,
  PackageSearch,
  RotateCcw,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { get, post } from '@/utils/httpRequest';

type SuggestedProduct = {
  id: number;
  name: string;
  slug?: string;
  price: number;
  salePrice?: number | null;
  image?: string | null;
  stock?: number;
  soldCount?: number;
  ratingAverage?: number;
  reason?: string;
  seller?: {
    id: number;
    shopName: string;
    shopSlug?: string;
  } | null;
};

type Message = {
  id: string;
  text: string;
  role: 'user' | 'bot';
  timestamp: Date;
  intent?: string;
  products?: SuggestedProduct[];
  quickReplies?: string[];
};

type ChatResponse = {
  conversationId?: number;
  response?: string;
  suggestions?: SuggestedProduct[];
  products?: SuggestedProduct[];
  quickReplies?: string[];
  intent?: string;
  cartAction?: {
    type: 'add';
    quantity?: number;
    product?: SuggestedProduct;
    item?: SuggestedProduct;
  };
  ai?: {
    provider?: string;
    model?: string | null;
  };
  conversation?: {
    conversationId?: number;
    messages?: any[];
  };
};

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'bot',
  text: 'Xin chào! Mình là trợ lý mua sắm nội bộ của ShopDoan. Mình có thể tìm sản phẩm, so sánh giá, gợi ý theo ngân sách, kiểm tra đơn hàng và hướng dẫn thanh toán.',
  timestamp: new Date(),
  quickReplies: [
    'Tìm iPhone dưới 30 triệu',
    'Sản phẩm đang giảm giá',
    'Đơn hàng của tôi ở đâu?',
    'Cách đăng ký bán hàng',
  ],
};

const quickActions = [
  { label: 'Tìm sản phẩm', text: 'Tôi muốn tìm sản phẩm bán chạy hôm nay', icon: Search },
  { label: 'Gợi ý theo giá', text: 'Gợi ý sản phẩm dưới 500k', icon: Sparkles },
  { label: 'Đơn hàng', text: 'Đơn hàng của tôi ở đâu?', icon: Truck },
  { label: 'Mở shop', text: 'Cách đăng ký bán hàng trên ShopDoan', icon: Store },
];

export default function Chatbot({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const sessionError = (session as any)?.error as string | undefined;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [aiProvider, setAiProvider] = useState('rule_based');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const authenticated = status === 'authenticated' && Boolean(accessToken) && !sessionError;
  const lastBotQuickReplies = useMemo(() => {
    const latestBot = [...messages].reverse().find((message) => message.role === 'bot' && message.quickReplies?.length);
    return latestBot?.quickReplies || welcomeMessage.quickReplies || [];
  }, [messages]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!authenticated) {
      setConversationId(null);
      setIsRealtimeConnected(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    }
  }, [status, authenticated]);

  useEffect(() => {
    if (!authenticated || !accessToken) return;

    const socket = io(`${API_BASE_URL}/chatbot`, {
      transports: ['websocket'],
      withCredentials: true,
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
      socket.emit('join_conversation');
    });
    socket.on('disconnect', () => setIsRealtimeConnected(false));
    socket.on('chat_error', () => setIsRealtimeConnected(false));
    socket.on('conversation_joined', (conversation: any) => {
      if (conversation?.conversationId) setConversationId(conversation.conversationId);
      setMessages(conversation?.messages?.length ? mapMessages(conversation.messages) : [welcomeMessage]);
    });
    socket.on('new-message', (payload: ChatResponse) => {
      applyChatResponse(payload);
      setIsLoading(false);
    });
    socket.on('bot_message', (payload: ChatResponse) => {
      applyChatResponse(payload);
      setIsLoading(false);
    });

    void loadHistory(accessToken);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authenticated, accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async (token: string) => {
    try {
      const data = await get<any>('/chatbot/conversations/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.conversationId) setConversationId(data.conversationId);
      setMessages(data?.messages?.length ? mapMessages(data.messages) : [welcomeMessage]);
    } catch (error) {
      if ((error as any)?.response?.status !== 401) {
        console.error('Load chat history failed', error);
      }
    }
  };

  const applyChatResponse = (payload?: ChatResponse) => {
    if (!payload) return;
    if (payload.conversationId) setConversationId(payload.conversationId);
    if (payload.ai?.provider) setAiProvider(formatAiProvider(payload.ai));

    const products = payload.products || payload.suggestions || [];
    const quickReplies = payload.quickReplies || [];

    if (payload.cartAction?.type === 'add') {
      const product = payload.cartAction.product || payload.cartAction.item;
      if (product) void addSuggestedProduct(product, payload.cartAction.quantity || 1);
    }

    if (payload.conversation?.messages?.length) {
      setMessages(enrichLatestBotMessage(mapMessages(payload.conversation.messages), products, quickReplies, payload.intent));
      return;
    }

    if (payload.response) {
      setMessages((current) => appendUniqueMessage(current, {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: payload.response || 'Mình chưa xử lý được yêu cầu này.',
        timestamp: new Date(),
        intent: payload.intent,
        products,
        quickReplies,
      }));
    }
  };

  const requireLogin = () => setLoginPromptOpen(true);

  const sendMessage = async (text = input) => {
    const cleanText = text.trim();
    if (!cleanText || isLoading) return;
    if (!authenticated || !accessToken) {
      requireLogin();
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: cleanText,
        timestamp: new Date(),
      },
    ]);
    setInput('');
    setIsLoading(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('user_message', { message: cleanText });
      return;
    }

    try {
      const payload = await post<ChatResponse>('/chatbot/message', { message: cleanText, sessionId: conversationId || undefined }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      applyChatResponse(payload);
    } catch {
      setMessages((current) => appendUniqueMessage(current, {
        id: `error-${Date.now()}`,
        role: 'bot',
        text: 'Mình chưa kết nối được tới trợ lý. Bạn kiểm tra API rồi thử lại nhé.',
        timestamp: new Date(),
        quickReplies: welcomeMessage.quickReplies,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([welcomeMessage]);
    setConversationId(null);
  };

  const addSuggestedProduct = async (product: SuggestedProduct, quantity = 1) => {
    await addItem({
      id: String(product.id),
      productId: product.id,
      name: product.name,
      price: Number(product.salePrice ?? product.price),
      image: product.image || '',
      stock: product.stock,
      seller: product.seller
        ? { id: product.seller.id, shopName: product.seller.shopName, shopSlug: product.seller.shopSlug || '' }
        : undefined,
    }, quantity);
  };

  return (
    <>
      <button
        onClick={() => authenticated ? setIsOpen((value) => !value) : requireLogin()}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-2xl transition hover:scale-105 hover:bg-orange-600"
        aria-label="Mở trợ lý AI"
        suppressHydrationWarning
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-black text-white">AI</span>
      </button>

      {loginPromptOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">Đăng nhập để dùng trợ lý</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Trợ lý cần tài khoản để lưu lịch sử chat, kiểm tra đơn hàng và thêm sản phẩm vào giỏ.</p>
              </div>
              <button onClick={() => setLoginPromptOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setLoginPromptOpen(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Để sau</button>
              <button onClick={() => router.push('/auth/signin?callbackUrl=/chatbot')} className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Đăng nhập</button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed bottom-24 right-4 z-[80] flex h-[min(720px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[460px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:right-6">
          <div className="bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-orange-500">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">Trợ lý mua sắm ShopDoan</h3>
                    <p className="text-xs text-slate-300">AI nội bộ, rule-based, không dùng API model bên ngoài</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className={`rounded-full px-2 py-1 ${isRealtimeConnected ? 'bg-emerald-500/20 text-emerald-100' : 'bg-amber-500/20 text-amber-100'}`}>
                    {isRealtimeConnected ? 'Realtime đang bật' : 'HTTP dự phòng'}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-1">Engine: {aiProvider}</span>
                  {conversationId ? <span className="rounded-full bg-white/10 px-2 py-1">#{conversationId}</span> : null}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={resetChat} className="rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Làm mới chat">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Đóng chatbot">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.text)}
                    disabled={isLoading}
                    className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50 disabled:opacity-60"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-orange-500" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.id}-${index}`}
                message={message}
                onSend={sendMessage}
                onAddProduct={addSuggestedProduct}
                onViewProduct={(productId) => router.push(`/menu/${productId}`)}
                onViewShop={(sellerId) => router.push(`/shop/${sellerId}`)}
              />
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-3 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  Đang phân tích yêu cầu...
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }} className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {lastBotQuickReplies.slice(0, 5).map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {reply}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ví dụ: tìm tai nghe bluetooth dưới 500k"
                className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500"
                disabled={isLoading}
                suppressHydrationWarning
              />
              <button disabled={isLoading || !input.trim()} className="grid h-11 w-11 place-items-center rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Gửi tin nhắn">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function MessageBubble({
  message,
  onSend,
  onAddProduct,
  onViewProduct,
  onViewShop,
}: {
  message: Message;
  onSend: (text: string) => void;
  onAddProduct: (product: SuggestedProduct, quantity?: number) => void;
  onViewProduct: (productId: number) => void;
  onViewShop: (sellerId: number) => void;
}) {
  const isBot = message.role === 'bot';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[88%] ${isBot ? 'text-slate-800' : 'text-white'}`}>
        <div className={`rounded-lg px-3 py-2 text-sm shadow-sm ${isBot ? 'bg-white' : 'bg-orange-500'}`}>
          <p className="whitespace-pre-line leading-6">{message.text}</p>
          <p className={`mt-1 text-[10px] ${isBot ? 'text-slate-400' : 'text-orange-50'}`}>
            {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {isBot && message.products?.length ? (
          <div className="mt-3 grid gap-2">
            {message.products.slice(0, 4).map((product) => (
              <ProductSuggestionCard
                key={product.id}
                product={product}
                onAdd={() => onAddProduct(product, 1)}
                onView={() => onViewProduct(product.id)}
                onViewShop={() => product.seller?.id ? onViewShop(product.seller.id) : undefined}
              />
            ))}
          </div>
        ) : null}

        {isBot && message.quickReplies?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.quickReplies.slice(0, 4).map((reply) => (
              <button
                key={reply}
                onClick={() => onSend(reply)}
                className="rounded-full border border-orange-100 bg-white px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50"
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductSuggestionCard({
  product,
  onAdd,
  onView,
  onViewShop,
}: {
  product: SuggestedProduct;
  onAdd: () => void;
  onView: () => void;
  onViewShop: () => void | undefined;
}) {
  const displayPrice = Number(product.salePrice ?? product.price);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-3 p-3">
        <button onClick={onView} className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <PackageSearch className="m-6 h-8 w-8 text-slate-300" />}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={onView} className="line-clamp-2 text-left text-sm font-bold text-slate-950 hover:text-orange-600">
            {product.name}
          </button>
          <p className="mt-1 text-sm font-black text-orange-600">{formatCurrency(displayPrice)}</p>
          {product.reason ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">{product.reason}</p> : null}
          {product.seller ? (
            <button onClick={onViewShop} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-600">
              <Store className="h-3 w-3" />
              {product.seller.shopName}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-slate-100">
        <button onClick={onView} className="inline-flex h-9 items-center justify-center gap-1 text-xs font-bold text-slate-700 hover:bg-slate-50">
          Chi tiết
          <ChevronRight className="h-3 w-3" />
        </button>
        <button onClick={onAdd} className="inline-flex h-9 items-center justify-center gap-1 bg-orange-500 text-xs font-bold text-white hover:bg-orange-600">
          <ShoppingCart className="h-3 w-3" />
          Thêm giỏ
        </button>
      </div>
    </div>
  );
}

function mapMessages(messages: any[]): Message[] {
  return messages.map(mapMessage);
}

function mapMessage(message: any): Message {
  const role = message.role === 'user' || message.sender === 'USER' ? 'user' : 'bot';
  return {
    id: String(message.id || `${role}-${message.timestamp || message.createdAt}-${message.text || message.message}`),
    text: message.text || message.message || '',
    role,
    timestamp: new Date(message.timestamp || message.createdAt || Date.now()),
    products: message.metadata?.suggestions || message.metadata?.products || [],
    quickReplies: message.metadata?.quickReplies || [],
    intent: message.metadata?.intent,
  };
}

function enrichLatestBotMessage(messages: Message[], products: SuggestedProduct[], quickReplies: string[], intent?: string): Message[] {
  if (!messages.length) return messages;
  const index = [...messages].reverse().findIndex((message) => message.role === 'bot');
  if (index < 0) return messages;
  const targetIndex = messages.length - 1 - index;
  return messages.map((message, currentIndex) => currentIndex === targetIndex
    ? {
        ...message,
        products: products.length ? products : message.products,
        quickReplies: quickReplies.length ? quickReplies : message.quickReplies,
        intent: intent || message.intent,
      }
    : message);
}

function appendUniqueMessage(messages: Message[], message: Message) {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message];
}

function formatAiProvider(ai: { provider?: string; model?: string | null }) {
  if (!ai.provider) return 'unknown';
  return ai.model ? `${ai.provider}:${ai.model}` : ai.provider;
}
