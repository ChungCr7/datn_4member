import { get } from '@/utils/httpRequest';
import { Product } from '@/services/marketplaceService';

export type PublicSellerProfile = {
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
  user?: {
    id: number;
    email: string;
    fullName?: string | null;
    name?: string | null;
    phone?: string | null;
    avatar?: string | null;
  };
  _count?: { products?: number; orderItems?: number };
};

type Wrapped<T> = { success?: boolean; data?: T; message?: string };

export async function getPublicSellerProfile(idOrSlug: string | number) {
  const response = await get<Wrapped<{
    seller: PublicSellerProfile;
    stats: {
      activeProducts: number;
      soldCount: number;
      ratingAverage: number;
      ratingCount: number;
    };
    products: Product[];
  }>>(`/sellers/public/${idOrSlug}`);

  if (!response.data) throw new Error(response.message || 'Không tải được hồ sơ shop.');
  return response.data;
}
