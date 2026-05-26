import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  image?: string | null;
  menuItemId?: number | null;
  orderDetailId?: number | null;
  userId: number;
  createdAt: string;
  updatedAt?: string;
  user?: { id: number; name?: string | null; email?: string; image?: string | null };
  menuItem?: { id: number; title: string; image?: string | null };
  orderDetail?: { id: number; orderId: number; menuItemId: number; itemTitle: string; quantity: number };
};

export type ReviewsResponse = {
  reviews: Review[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const getMenuItemReviews = (menuItemId: number, page = 1, limit = 10) =>
  get<ReviewsResponse>(`/reviews/menu-items/${menuItemId}`, { params: { page, limit } });

export const getUserReviews = (userId: number, page = 1, limit = 10) =>
  get<ReviewsResponse>(`/reviews/user/${userId}`, { params: { page, limit } });

export const getMenuItemRating = (menuItemId: number) =>
  get<{ rating: number; count: number }>(`/reviews/menu-items/${menuItemId}/rating`);

export type ReviewEligibility = {
  canReview: boolean;
  message?: string;
  purchases: Array<{
    orderDetailId: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    itemTitle: string;
    order: { id: number; status: string; paymentStatus: string; createdAt: string };
    review?: Pick<Review, 'id' | 'rating' | 'comment' | 'image' | 'orderDetailId' | 'createdAt' | 'updatedAt'> | null;
  }>;
};

export const getMenuItemReviewEligibility = (accessToken: string, menuItemId: number) =>
  get<ReviewEligibility>(`/reviews/menu-items/${menuItemId}/eligibility`, authConfig(accessToken));

export const createReview = (
  accessToken: string,
  data: { menuItemId?: number; orderDetailId: number; rating: number; comment?: string; image?: string },
) => post<{ message: string; review: Review }>('/reviews', data, authConfig(accessToken));

export const updateReview = (
  accessToken: string,
  id: number,
  data: { rating?: number; comment?: string; image?: string },
) => patch<{ message: string; review: Review }>(`/reviews/${id}`, data, authConfig(accessToken));

export const deleteReview = (accessToken: string, id: number) =>
  del(`/reviews/${id}`, authConfig(accessToken));

const authConfig = (accessToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});
