import { get } from '@/utils/httpRequest';

export type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  _count?: {
    marketplaceProducts?: number;
  };
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  stock: number;
  soldCount: number;
  ratingAverage: number;
  ratingCount: number;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
  images?: Array<{ id: number; imageUrl: string; sortOrder: number }>;
  variants?: Array<{
    id: number;
    name: string;
    value?: string | null;
    priceDelta?: number | null;
    price?: number | null;
    stock: number;
    isActive?: boolean;
  }>;
  category?: { id: number; name: string; slug: string } | null;
  seller?: { id: number; shopName: string; shopSlug: string; logo?: string | null } | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const cache = new Map<string, { expiresAt: number; value: unknown }>();
const CACHE_TTL = 30_000;

export const fallbackProductImage =
  'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=80';

export async function getCategories(limit = 12) {
  return cached(`categories:${limit}`, async () => {
    const response = await get<ApiResponse<{ categories: Category[] }>>('/categories', {
      params: { page: 1, limit },
    });
    return response.data.categories;
  });
}

export async function getProducts(params?: {
  keyword?: string;
  search?: string;
  categoryId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';
  page?: number;
  limit?: number;
}) {
  const { search, ...rest } = params || {};
  const requestParams = { page: 1, limit: 12, ...rest, keyword: params?.keyword || search };
  return cached(`products:${JSON.stringify(requestParams)}`, async () => {
    const response = await get<ApiResponse<{ products: Product[]; meta?: { total: number; page: number; limit: number; totalPages: number } }>>('/products', {
      params: requestParams,
    });
    return {
      products: response.data.products,
      meta: response.data.meta || {
        total: response.data.products.length,
        page: params?.page || 1,
        limit: params?.limit || 12,
        totalPages: 1,
      },
    };
  });
}

export async function getHomeRecommendations(limit = 12) {
  return cached(`recommendations:${limit}`, async () => {
    const response = await get<ApiResponse<{ products: Product[] }>>('/recommendations/home', {
      params: { limit },
    });
    return response.data.products;
  });
}

export async function getProductById(id: number) {
  return cached(`product:${id}`, async () => {
    const response = await get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  });
}

export async function getProductBySlug(slug: string) {
  return cached(`product-slug:${slug}`, async () => {
    const response = await get<ApiResponse<Product>>(`/products/by-slug/${slug}`);
    return response.data;
  });
}

async function cached<T>(key: string, loader: () => Promise<T>) {
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) {
    return current.value as T;
  }
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
  return value;
}
