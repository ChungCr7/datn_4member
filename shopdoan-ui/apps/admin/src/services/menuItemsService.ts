import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export interface ApiMenuItemOption {
  id: number;
  title: string;
  additionalPrice: number;
  optionalDescription?: string;
  isAvailable?: boolean;
}

export interface ApiMenuItem {
  id: number;
  menuId: number;
  title: string;
  description?: string;
  basePrice: number;
  image?: string;
  isAvailable?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  menu?: { id: number; title: string };
  options?: ApiMenuItemOption[];
}

export const getMenuItems = (accessToken: string, page = 1, limit = 10, params: Record<string, any> = {}) =>
  get<{ items: ApiMenuItem[]; meta: any }>('/menu-items', authConfig(accessToken, { page, limit, ...params }));

export const createMenuItem = (accessToken: string, data: FormData) =>
  post<ApiMenuItem>('/menu-items', data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const updateMenuItem = (accessToken: string, menuItemId: number, data: FormData) =>
  patch<ApiMenuItem>(`/menu-items/${menuItemId}`, data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const deleteMenuItem = (accessToken: string, menuItemId: number) =>
  del(`/menu-items/${menuItemId}`, authConfig(accessToken));

export const createMenuItemOption = (accessToken: string, data: Omit<ApiMenuItemOption, 'id'> & { menuItemId: number }) =>
  post<ApiMenuItemOption>('/menu-items/options', data, authConfig(accessToken));

export const updateMenuItemOption = (accessToken: string, id: number, data: Partial<ApiMenuItemOption>) =>
  patch<ApiMenuItemOption>(`/menu-items/options/${id}`, data, authConfig(accessToken));

export const deleteMenuItemOption = (accessToken: string, id: number) =>
  del(`/menu-items/options/${id}`, authConfig(accessToken));

const authConfig = (accessToken: string, params?: Record<string, any>): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
  params,
});
