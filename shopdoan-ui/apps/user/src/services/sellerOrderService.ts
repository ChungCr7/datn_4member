import { get, patch } from '@/utils/httpRequest';

export type SellerOrderItem = {
  id: number;
  orderId: number;
  sellerId: number;
  productId: number;
  productName: string;
  productImage?: string | null;
  quantity: number;
  price: number;
  order?: {
    id: number;
    orderCode?: string | null;
    orderStatus?: string | null;
    receiverName?: string | null;
    receiverPhone?: string | null;
    receiverAddress?: string | null;
    createdAt: string;
  };
};

type Wrapped<T> = { success?: boolean; data?: T; orderItems?: SellerOrderItem[]; meta?: unknown };

const authConfig = (accessToken: string) => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

export async function getSellerOrderItems(accessToken: string) {
  const response = await get<Wrapped<{ orderItems?: SellerOrderItem[] }> | { orderItems: SellerOrderItem[] }>(
    '/seller/orders',
    {
      ...authConfig(accessToken),
      params: { page: 1, limit: 100 },
    },
  );
  if ('data' in response && response.data?.orderItems) return response.data.orderItems;
  if ('orderItems' in response) return response.orderItems || [];
  return [];
}

export async function updateSellerOrderStatus(
  accessToken: string,
  orderId: number,
  orderStatus: 'CONFIRMED' | 'PACKING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED',
) {
  return patch(`/seller/orders/${orderId}/status`, { orderStatus }, authConfig(accessToken));
}
