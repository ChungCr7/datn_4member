import { get } from '@/utils/httpRequest';

export type MenuItemOption = {
  id: number;
  menuItemId: number;
  title: string;
  additionalPrice: number;
  optionalDescription?: string | null;
  isAvailable?: boolean;
};

export type MenuItem = {
  id: number;
  menuId: number;
  title: string;
  description?: string | null;
  basePrice: number;
  image?: string | null;
  isAvailable?: boolean;
  options?: MenuItemOption[];
  menu?: { id: number; title: string };
};

export type Menu = {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean;
  menuItems?: MenuItem[];
  _count?: { menuItems: number };
};

export type Paginated<TName extends string, T> = Record<TName, T[]> & {
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const fallbackFoodImage =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80';

export const getMenus = (page = 1, limit = 20, params: Record<string, any> = {}) =>
  get<Paginated<'menus', Menu>>('/menus', { params: { page, limit, ...params } });

export const getMenuById = (id: number) => get<Menu>(`/menus/${id}`);

export const getMenuItems = (page = 1, limit = 12, params: Record<string, any> = {}) =>
  get<{ items: MenuItem[]; meta: any }>('/menu-items', { params: { page, limit, ...params } });

export const getMenuItemsByMenu = (menuId: number, page = 1, limit = 12, params: Record<string, any> = {}) =>
  get<{ items: MenuItem[]; meta: any }>(`/menu-items/menu/${menuId}`, { params: { page, limit, ...params } });

export const getMenuItemById = (id: number) => get<MenuItem>(`/menu-items/${id}`);
