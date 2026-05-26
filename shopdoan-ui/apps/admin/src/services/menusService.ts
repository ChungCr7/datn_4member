import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export type ApiMenu = {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  menuItems?: any[];
  _count?: { menuItems: number };
  createdAt?: string;
};

export const getMenus = (accessToken: string, page = 1, limit = 10, params: Record<string, any> = {}) =>
  get<{ menus: ApiMenu[]; meta: any }>('/menus', authConfig(accessToken, { page, limit, ...params }));

export const createMenu = (accessToken: string, data: FormData) =>
  post<ApiMenu>('/menus', data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const updateMenu = (accessToken: string, id: number, data: FormData) =>
  patch<ApiMenu>(`/menus/${id}`, data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const deleteMenu = (accessToken: string, id: number) =>
  del(`/menus/${id}`, authConfig(accessToken));

const authConfig = (accessToken: string, params?: Record<string, any>): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
  params,
});
