'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ShoppingCart, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { get, post } from '@/utils/httpRequest';
import { API_BASE_URL } from '@/lib/config';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  suggestions?: any[];
}

const welcomeMessage: Message = {
  id: 'welcome',
  text: 'Xin chào! Mình có thể gợi ý món hợp khẩu vị, tìm món theo ngân sách, hỗ trợ đơn hàng hoặc thêm món vào giỏ bằng chat.',
  isBot: true,
  timestamp: new Date(),
};

export default function Chatbot({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [aiProvider, setAiProvider] = useState('heuristic');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { addItem } = useCart();
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const sessionError = (session as any)?.error as string | undefined;
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setConversationId(null);
      setIsRealtimeConnected(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken || sessionError) return;

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

    socket.on('new-message', (payload: any) => {
      if (payload?.conversationId) setConversationId(payload.conversationId);
      if (payload?.ai?.provider) setAiProvider(formatAiProvider(payload.ai));
      if (payload?.cartAction?.type === 'add' && payload.cartAction.item) {
        void addItem(payload.cartAction.item, payload.cartAction.quantity || 1);
      }
      if (payload?.conversation?.messages) {
        setMessages(mapMessages(payload.conversation.messages));
      } else if (payload?.message) {
        setMessages((prev) => appendUniqueMessage(prev, mapMessage(payload.message)));
      }
      setIsLoading(false);
    });

    const loadHistory = async () => {
      try {
        const data = await get<any>('/chatbot/conversations/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (data?.conversationId) setConversationId(data.conversationId);
        setMessages(data?.messages?.length ? mapMessages(data.messages) : [welcomeMessage]);
      } catch (error) {
        if ((error as any)?.response?.status !== 401) {
          console.error('Load chat history failed', error);
        }
      }
    };

    void loadHistory();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, accessToken, sessionError, addItem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const requireLogin = () => {
    setLoginPromptOpen(true);
  };

  const sendMessage = async (text = input) => {
    if (!text.trim() || isLoading) return;
    if (status !== 'authenticated' || !accessToken || sessionError) {
      requireLogin();
      return;
    }

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      text,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('user_message', { message: text });
      return;
    }

    try {
      const data = await post<any>('/chatbot/message', { message: text }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (data?.conversationId) setConversationId(data.conversationId);
      if (data?.ai?.provider) setAiProvider(formatAiProvider(data.ai));
      if (data?.cartAction?.type === 'add' && data.cartAction.item) {
        void addItem(data.cartAction.item, data.cartAction.quantity || 1);
      }
      if (data?.conversation?.messages) {
        setMessages(mapMessages(data.conversation.messages));
      } else {
      setMessages((prev) => appendUniqueMessage(prev, {
        id: `bot-${Date.now()}`,
        text: data?.response || 'Xin lỗi, mình chưa xử lý được yêu cầu này.',
        isBot: true,
        timestamp: new Date(),
        suggestions: data?.suggestions || [],
        }));
      }
    } catch {
      setMessages((prev) => appendUniqueMessage(prev, {
        id: `error-${Date.now()}`,
        text: 'Xin lỗi, hiện tại chatbot đang gặp lỗi kết nối. Bạn thử lại sau nhé.',
        isBot: true,
        timestamp: new Date(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const quickReplies = [
    'Gợi ý món ngon hôm nay',
    'Món no bụng dưới 100k',
    'Ăn nhẹ buổi chiều nên chọn gì?',
    'Có món nào hợp cho 2 người?',
    'Mình cần hỗ trợ đơn hàng',
  ];

  return (
    <>
      <button
        onClick={() => {
          if (status !== 'authenticated') {
            requireLogin();
            return;
          }
          setIsOpen((value) => !value);
        }}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white shadow-2xl transition hover:scale-105 hover:bg-slate-800"
        aria-label="Mo chatbot"
        suppressHydrationWarning
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {loginPromptOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">Cần đăng nhập để chat</h3>
                <p className="mt-2 text-sm text-slate-600">Bạn cần đăng nhập trước khi nhắn tin với ShopDoan.</p>
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
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[620px] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:right-6">
          <div className="bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Trợ lý AI đặt món</h3>
                <p className="mt-1 text-xs text-slate-300">{isRealtimeConnected ? 'Đang kết nối realtime' : 'Đang kết nối lại...'}</p>
                <p className="mt-1 text-[11px] text-slate-400">AI: {aiProvider}{conversationId ? ` · #${conversationId}` : ''}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Đóng chatbot">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div key={`${message.id}-${index}`} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[82%] whitespace-pre-line rounded-lg px-3 py-2 text-sm shadow-sm ${message.isBot ? 'bg-white text-slate-800' : 'bg-emerald-600 text-white'}`}>
                  <p>{message.text}</p>
                  {message.suggestions?.length ? (
                    <div className="mt-3 grid gap-2">
                      {message.suggestions.slice(0, 3).map((item, itemIndex) => (
                        <div key={`${message.id}-suggestion-${item.id ?? itemIndex}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900">
                          {item.image ? <img src={item.image} alt={item.name} className="h-24 w-full object-cover" /> : null}
                          <div className="p-3">
                            <div className="font-semibold">{item.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.reason}</div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{Number(item.price).toLocaleString('vi-VN')}d</span>
                              <button
                                onClick={() => {
                                  void addItem({ id: String(item.id), menuItemId: item.id, name: item.name, price: item.price, image: item.image || '' });
                                  router.push('/cart');
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                              >
                                <ShoppingCart className="h-3 w-3" />
                                Thêm
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className={`mt-1 text-[10px] ${message.isBot ? 'text-slate-400' : 'text-emerald-50'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-white px-3 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickReplies.map((reply) => (
                <button key={reply} onClick={() => sendMessage(reply)} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100">
                  {reply}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Nhập: gợi ý món ngon..."
                className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                disabled={isLoading}
                suppressHydrationWarning
              />
              <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Gửi tin nhắn">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function mapMessages(messages: any[]): Message[] {
  return messages.map(mapMessage);
}

function mapMessage(message: any): Message {
  return {
    id: String(message.id || `${message.role}-${message.timestamp}-${message.text}`),
    text: message.text,
    isBot: message.role !== 'user',
    timestamp: new Date(message.timestamp),
    suggestions: message.metadata?.suggestions || [],
  };
}

function appendUniqueMessage(messages: Message[], message: Message) {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message];
}

function formatAiProvider(ai: { provider?: string; model?: string | null }) {
  if (!ai.provider) return 'unknown';
  return ai.model ? `${ai.provider}:${ai.model}` : ai.provider;
}
