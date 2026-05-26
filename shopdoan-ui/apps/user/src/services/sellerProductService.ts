import { del, get, patch, post } from '@/utils/httpRequest';
import { Product } from '@/services/marketplaceService';

export type ProductPayload = {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  images?: Array<{ imageUrl: string; sortOrder?: number }>;
  variants?: Array<{
    name: string;
    value?: string;
    priceDelta?: number;
    price?: number;
    stock?: number;
  }>;
};

type Wrapped<T> = { success?: boolean; data?: T; message?: string };

const authConfig = (accessToken: string) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

export async function getSellerProducts(accessToken: string, sellerId: number) {
  const response = await get<Wrapped<{ products: Product[] }>>(`/products/seller/${sellerId}`, {
    ...authConfig(accessToken),
    params: { page: 1, limit: 100, sortBy: 'newest' },
  });
  return response.data?.products || [];
}

export async function createSellerProduct(accessToken: string, data: ProductPayload) {
  const response = await post<Wrapped<Product>>('/products', data, authConfig(accessToken));
  return response.data;
}

export async function updateSellerProduct(accessToken: string, id: number, data: Partial<ProductPayload>) {
  const response = await patch<Wrapped<Product>>(`/products/${id}`, data, authConfig(accessToken));
  return response.data;
}

export async function deleteSellerProduct(accessToken: string, id: number) {
  const response = await del<Wrapped<Product>>(`/products/${id}`, authConfig(accessToken));
  return response.data;
}
