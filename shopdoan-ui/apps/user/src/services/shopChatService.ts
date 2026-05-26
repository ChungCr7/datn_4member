import { get, post } from '@/utils/httpRequest';

type Wrapped<T> = { success?: boolean; data?: T; message?: string };

export type ShopMessage = {
  id: number;
  senderId?: number | null;
  senderRole: 'user' | 'seller' | 'admin' | 'root' | 'assistant' | 'system';
  content: string;
  message: string;
  createdAt: string;
  sender?: { id: number; name?: string | null; fullName?: string | null; email?: string | null; avatar?: string | null; image?: string | null };
};

export type ShopConversation = {
  id: number;
  conversationId: number;
  user?: { id: number; name?: string | null; fullName?: string | null; email?: string | null; avatar?: string | null; image?: string | null };
  shop?: { id: number; shopName: string; slug: string; logo?: string | null; banner?: string | null };
  lastMessage?: string;
  lastSenderRole?: string | null;
  messageCount?: number;
  updatedAt?: string;
  messages?: ShopMessage[];
};

const authConfig = (accessToken: string) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

export async function getShopConversation(accessToken: string, sellerId: number) {
  const response = await get<Wrapped<{ conversation: ShopConversation }>>(`/shop-chat/sellers/${sellerId}`, authConfig(accessToken));
  return response.data?.conversation || null;
}

export async function sendShopMessage(accessToken: string, sellerId: number, message: string) {
  const response = await post<Wrapped<{ conversation: ShopConversation }>>(`/shop-chat/sellers/${sellerId}/messages`, { message }, authConfig(accessToken));
  return response.data?.conversation || null;
}

export async function getSellerShopConversations(accessToken: string) {
  const response = await get<Wrapped<{ conversations: ShopConversation[] }>>('/shop-chat/seller/conversations', authConfig(accessToken));
  return response.data?.conversations || [];
}

export async function getSellerShopConversation(accessToken: string, conversationId: number) {
  const response = await get<Wrapped<{ conversation: ShopConversation }>>(`/shop-chat/seller/conversations/${conversationId}`, authConfig(accessToken));
  return response.data?.conversation || null;
}

export async function sendSellerShopMessage(accessToken: string, conversationId: number, message: string) {
  const response = await post<Wrapped<{ conversation: ShopConversation }>>(`/shop-chat/seller/conversations/${conversationId}/messages`, { message }, authConfig(accessToken));
  return response.data?.conversation || null;
}
