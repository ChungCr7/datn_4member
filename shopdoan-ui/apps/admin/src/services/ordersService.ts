import { AxiosRequestConfig } from 'axios';
import { del, get, patch } from '@/utils/httpRequest';

export interface ApiOrder {
  id: number;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  paymentProvider?: string;
  paymentUrl?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  user?: { id: number; name?: string; email?: string };
  details?: any[];
}

export const getOrders = (accessToken: string, page = 1, limit = 10, params: Record<string, any> = {}) =>
  get<{ orders: ApiOrder[]; meta: any }>('/orders', authConfig(accessToken, { page, limit, ...params }));

export const getSellerOrderItems = (accessToken: string, page = 1, limit = 10, params: Record<string, any> = {}) =>
  get<{ orderItems: any[]; meta: any }>('/orders/seller/items', authConfig(accessToken, { page, limit, ...params }));

export const getSellerAnalytics = (accessToken: string) =>
  get<{ products: number; orderItems: number; revenue: number; averageRating: number }>('/orders/seller/analytics', authConfig(accessToken));

export const updateOrderStatus = (accessToken: string, orderId: number, status: string) =>
  patch<ApiOrder>(`/orders/${orderId}`, { status }, authConfig(accessToken));

export const updateOrder = (accessToken: string, orderId: number, data: Partial<ApiOrder>) =>
  patch<ApiOrder>(`/orders/${orderId}`, data, authConfig(accessToken));

export const deleteOrder = (accessToken: string, orderId: number) =>
  del(`/orders/${orderId}`, authConfig(accessToken));

const authConfig = (accessToken: string, params?: Record<string, any>): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
  params,
});
