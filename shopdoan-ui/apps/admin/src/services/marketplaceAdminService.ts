import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export type Meta = { total: number; page: number; limit: number; totalPages: number };
export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  keyword?: string;
  filter?: string;
  sortBy?: string;
  sortOrder?: string;
  categoryId?: number;
};

export type SellerProfile = {
  id: number;
  shopName: string;
  shopSlug: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  user?: { id: number; email: string; fullName?: string | null; name?: string | null };
  _count?: { products?: number; orderItems?: number };
  createdAt?: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  description?: string | null;
  parentId?: number | null;
  isActive: boolean;
  sortOrder?: number;
  _count?: { marketplaceProducts?: number; children?: number };
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  soldCount?: number;
  ratingAverage?: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
  category?: { id: number; name: string };
  seller?: { id: number; shopName: string; shopSlug: string };
  images?: Array<{ imageUrl: string; sortOrder?: number }>;
  createdAt?: string;
};

export type Order = {
  id: number;
  orderCode?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  totalAmount?: number | null;
  finalAmount?: number | null;
  totalPrice?: number | null;
  orderStatus?: string | null;
  paymentMethod?: string | null;
  marketplacePaymentStatus?: string | null;
  paymentStatus?: string | null;
  orderItems?: any[];
  user?: { id: number; email?: string; name?: string };
  createdAt?: string;
};

export type AdminUser = {
  id: number;
  name?: string | null;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
  accountRole?: string | null;
  role?: { id: number; name: string };
  createdAt?: string;
};

const defaultMeta: Meta = { total: 0, page: 1, limit: 10, totalPages: 1 };

export const getSellers = async (accessToken: string, params: ListParams = {}) => {
  const response = await get('/admin/sellers', authConfig(accessToken, normalizeParams(params)));
  const data = unwrap(response);
  return { sellers: asArray<SellerProfile>(data.sellers), meta: toMeta(data.meta, params) };
};

export const approveSeller = (accessToken: string, id: number) =>
  patch(`/admin/sellers/${id}/approve`, {}, authConfig(accessToken));

export const rejectSeller = (accessToken: string, id: number, reason?: string) =>
  patch(`/admin/sellers/${id}/reject`, { reason }, authConfig(accessToken));

export const getCategories = async (accessToken: string, params: ListParams = {}) => {
  const response = await get('/categories', authConfig(accessToken, normalizeParams(params)));
  const data = unwrap(response);
  return { categories: asArray<Category>(data.categories), meta: toMeta(data.meta, params) };
};

export const createCategory = (accessToken: string, data: Partial<Category>) =>
  post('/categories', data, authConfig(accessToken));

export const updateCategory = (accessToken: string, id: number, data: Partial<Category>) =>
  patch(`/categories/${id}`, data, authConfig(accessToken));

export const deleteCategory = (accessToken: string, id: number) =>
  del(`/categories/${id}`, authConfig(accessToken));

export const getProducts = async (accessToken: string, params: ListParams = {}) => {
  const response = await get('/admin/products', authConfig(accessToken, normalizeProductParams(params)));
  const data = unwrap(response);
  return { products: asArray<Product>(data.products), meta: toMeta(data.meta, params) };
};

export const updateProduct = (accessToken: string, id: number, data: Partial<Product>) =>
  patch(`/products/${id}`, data, authConfig(accessToken));

export const deleteProduct = (accessToken: string, id: number) =>
  del(`/products/${id}`, authConfig(accessToken));

export const getOrders = async (accessToken: string, params: ListParams = {}) => {
  const response = await get('/admin/orders', authConfig(accessToken, normalizeParams(params)));
  const data = unwrap(response);
  return { orders: asArray<Order>(data.orders), meta: toMeta(data.meta, params) };
};

export const updateOrder = (accessToken: string, id: number, data: Partial<Order>) =>
  patch(`/orders/${id}`, data, authConfig(accessToken));

export const getUsers = async (accessToken: string, params: ListParams = {}) => {
  const response = await get('/users', authConfig(accessToken, normalizeParams(params)));
  const data = unwrap(response);
  return { users: asArray<AdminUser>(data.users), meta: toMeta(data.meta, params) };
};

export const createUser = (accessToken: string, data: Partial<AdminUser> & { password?: string; roleName?: string }) =>
  post('/users', data, authConfig(accessToken));

export const updateUser = (accessToken: string, id: number, data: Partial<AdminUser> & { password?: string; roleName?: string }) =>
  patch(`/users/${id}`, data, authConfig(accessToken));

export const deleteUser = (accessToken: string, id: number) =>
  del(`/users/${id}`, authConfig(accessToken));

export const uploadImage = async (accessToken: string, file: File, folder = 'misc') => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const response = await post('/uploads/image', formData, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(response);

  if (!data.imageUrl) {
    throw new Error(response?.message || 'Không upload được ảnh.');
  }

  return data as {
    imageUrl: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
  };
};

function authConfig(accessToken: string, params?: Record<string, any>): AxiosRequestConfig {
  return { headers: { Authorization: `Bearer ${accessToken}` }, params };
}

function normalizeParams(params: ListParams) {
  return Object.fromEntries(
    Object.entries({
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || undefined,
      keyword: params.keyword || params.search || undefined,
      filter: params.filter === 'all' ? undefined : params.filter,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      categoryId: params.categoryId,
    }).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function normalizeProductParams(params: ListParams) {
  const sortBy = ['newest', 'price_asc', 'price_desc', 'best_selling', 'rating'].includes(params.sortBy || '')
    ? params.sortBy
    : 'newest';

  return Object.fromEntries(
    Object.entries({
      page: params.page || 1,
      limit: params.limit || 10,
      keyword: params.keyword || params.search || undefined,
      filter: params.filter === 'all' ? undefined : params.filter,
      status: params.filter === 'all' ? undefined : params.filter,
      categoryId: params.categoryId,
      sortBy,
    }).filter(([, value]) => value !== undefined && value !== ''),
  );
}

function unwrap(response: any) {
  return response?.data && typeof response.data === 'object' ? response.data : response || {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function toMeta(meta: any, params: ListParams = {}): Meta {
  return {
    ...defaultMeta,
    page: Number(meta?.page || params.page || defaultMeta.page),
    limit: Number(meta?.limit || params.limit || defaultMeta.limit),
    total: Number(meta?.total || defaultMeta.total),
    totalPages: Number(meta?.totalPages || defaultMeta.totalPages),
  };
}
