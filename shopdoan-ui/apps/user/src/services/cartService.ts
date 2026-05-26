import { del, get, patch, post } from '@/utils/httpRequest';

export type ValidateCartItemPayload = {
  menuItemId?: number;
  menuItemOptionId?: number;
  productId?: number;
  variantId?: number;
  quantity?: number;
  note?: string;
};

export type ValidatedCartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  menuItemId?: number;
  menuItemOptionId?: number;
  productId?: number;
  variantId?: number;
  variantName?: string;
  stock?: number;
  seller?: { id: number; shopName: string; shopSlug: string };
  optionTitle?: string;
  note?: string | null;
};

export const validateCartItem = (accessToken: string, data: ValidateCartItemPayload) =>
  post<{ valid: boolean; item: ValidatedCartItem }>('/cart/validate-item', data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

const authConfig = (accessToken: string) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

type CartApiResponse = {
  success?: boolean;
  data?: { items?: ValidatedCartItem[]; item?: ValidatedCartItem; totalAmount?: number };
  items?: ValidatedCartItem[];
};

const unwrapCart = (response: CartApiResponse) => response.data || { items: response.items || [] };

export const getCart = async (accessToken: string) =>
  unwrapCart(await get<CartApiResponse>('/cart', authConfig(accessToken)));

export const addCartItem = async (accessToken: string, data: ValidateCartItemPayload) =>
  unwrapCart(await post<CartApiResponse>('/cart/items', data, authConfig(accessToken)));

export const updateCartItem = (accessToken: string, cartKey: string, quantity: number) =>
  patch<CartApiResponse>(
    `/cart/items/${encodeURIComponent(cartKey)}`,
    { quantity },
    authConfig(accessToken),
  ).then(unwrapCart);

export const removeCartItem = (accessToken: string, cartKey: string) =>
  del<CartApiResponse>(
    `/cart/items/${encodeURIComponent(cartKey)}`,
    authConfig(accessToken),
  ).then(unwrapCart);

export const clearServerCart = (accessToken: string) =>
  del<CartApiResponse>('/cart/clear', authConfig(accessToken)).then(unwrapCart);
