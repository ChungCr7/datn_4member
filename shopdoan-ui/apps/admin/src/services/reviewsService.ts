import { AxiosRequestConfig } from 'axios';
import { del, get, patch } from '@/utils/httpRequest';

export type ApiReview = {
  id: number;
  menuItemId?: number | null;
  orderDetailId?: number | null;
  userId: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { id: number; name?: string; email?: string };
  menuItem?: { id: number; title: string };
};

export const getReviews = (accessToken: string, page = 1, limit = 10, params: Record<string, any> = {}) =>
  get<{ reviews: ApiReview[]; meta: any }>('/reviews', authConfig(accessToken, { page, limit, ...params }));

export const updateReview = (accessToken: string, id: number, data: Partial<ApiReview>) =>
  patch<{ message: string; review: ApiReview }>(`/reviews/${id}`, data, authConfig(accessToken));

export const deleteReview = (accessToken: string, id: number) =>
  del(`/reviews/${id}`, authConfig(accessToken));

const authConfig = (accessToken: string, params?: Record<string, any>): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
  params,
});
