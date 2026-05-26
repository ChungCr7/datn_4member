import { get, patch, post } from '@/utils/httpRequest';

export type SellerProfile = {
  id: number;
  userId: number;
  shopName: string;
  shopSlug: string;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  address?: string | null;
  phone?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
};

export type SellerAnalytics = {
  products: number;
  orderItems: number;
  revenue: number;
  averageRating: number;
  latestItems?: Array<{
    id: number;
    orderId: number;
    productName: string;
    quantity: number;
    price: number;
    order?: {
      id: number;
      orderCode?: string | null;
      orderStatus?: string | null;
      receiverName?: string | null;
      createdAt?: string;
    };
  }>;
};

type Wrapped<T> = { success?: boolean; data?: T; message?: string };

const authConfig = (accessToken: string) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

export async function getMySellerProfile(accessToken: string) {
  const response = await get<Wrapped<SellerProfile>>('/sellers/me', authConfig(accessToken));
  return response.data || null;
}

export async function registerSeller(
  accessToken: string,
  data: {
    shopName: string;
    shopSlug?: string;
    description?: string;
    logo?: string;
    banner?: string;
    address?: string;
    phone?: string;
  },
) {
  const response = await post<Wrapped<SellerProfile>>('/sellers/register', data, authConfig(accessToken));
  return response.data;
}

export async function updateMySellerProfile(
  accessToken: string,
  data: Partial<Pick<SellerProfile, 'shopName' | 'shopSlug' | 'description' | 'logo' | 'banner' | 'address' | 'phone'>>,
) {
  const response = await patch<Wrapped<SellerProfile>>('/sellers/me', data, authConfig(accessToken));
  return response.data;
}

export async function getSellerAnalytics(accessToken: string) {
  const response = await get<Wrapped<SellerAnalytics> | SellerAnalytics>('/orders/seller/analytics', authConfig(accessToken));
  if ('data' in response && response.data) return response.data;
  return response as SellerAnalytics;
}
