import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export interface ApiOrderItem {
  id: number;
  sellerId?: number;
  productId?: number;
  variantId?: number | null;
  productName?: string;
  productImage?: string | null;
  quantity: number;
  price?: number;
  itemTitle?: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ApiOrder {
  id: number;
  userId: number;
  orderCode?: string | null;
  totalPrice: number;
  totalAmount?: number | null;
  shippingFee?: number | null;
  discountAmount?: number | null;
  finalAmount?: number | null;
  status: string;
  orderStatus?: string | null;
  paymentStatus?: string;
  marketplacePaymentStatus?: string | null;
  paymentMethod?: string | null;
  customerName?: string | null;
  receiverName?: string | null;
  phone?: string | null;
  receiverPhone?: string | null;
  address?: string | null;
  receiverAddress?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  details?: ApiOrderItem[];
  orderItems?: ApiOrderItem[];
  user?: { id: number; name?: string; email?: string; phone?: string; address?: string };
}

export interface OrdersResponse {
  orders: ApiOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type Wrapped<T> = {
  success?: boolean;
  data?: T;
};

export type MarketplaceOrderItemPayload = {
  productId: number;
  variantId?: number;
  quantity: number;
  note?: string;
};

export const getUserOrders = async (accessToken: string, _userId: number, page = 1, limit = 20) => {
  const response = await get<Wrapped<OrdersResponse> | OrdersResponse>('/orders/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { page, limit },
  });
  return unwrap(response, { orders: [], meta: { total: 0, page, limit, totalPages: 1 } });
};

export const getOrderById = async (accessToken: string, orderId: number) => {
  const response = await get<Wrapped<ApiOrder> | ApiOrder>(`/orders/${orderId}`, authConfig(accessToken));
  return unwrap(response, null as unknown as ApiOrder);
};

export const createOrder = (
  accessToken: string,
  data: {
    customerName?: string;
    phone?: string;
    address?: string;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    note?: string;
    paymentProvider?: 'cash' | 'stripe';
    paymentMethod?: 'COD' | 'MOMO' | 'CREDIT_CARD' | 'BANK_TRANSFER';
    details?: Array<{ menuItemId?: number; productId?: number; menuItemOptionId?: number; variantId?: number; quantity: number; note?: string }>;
    items?: MarketplaceOrderItemPayload[];
  },
) => post<Wrapped<ApiOrder> | ApiOrder>('/orders', data, authConfig(accessToken));

export const cancelOrder = async (accessToken: string, orderId: number) => {
  const response = await patch<Wrapped<ApiOrder> | ApiOrder>(
    `/orders/${orderId}/cancel`,
    {},
    authConfig(accessToken),
  );
  return unwrap(response, null as unknown as ApiOrder);
};

export const deleteOrder = (accessToken: string, orderId: number) =>
  del(`/orders/${orderId}`, authConfig(accessToken));

const authConfig = (accessToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

function unwrap<T>(response: Wrapped<T> | T, fallback: T): T {
  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data;
  }
  return (response as T) || fallback;
}
