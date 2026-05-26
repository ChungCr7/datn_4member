'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SellerShell from '@/components/seller/SellerShell';
import { getSellerOrderItems, SellerOrderItem, updateSellerOrderStatus } from '@/services/sellerOrderService';
import { formatCurrency, formatDate } from '@/lib/format';

const statusOptions = ['CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;
const filterOptions = ['ALL', 'PENDING', ...statusOptions] as const;

const statusText: Record<string, string> = {
  ALL: 'Tất cả',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default function SellerOrdersPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [items, setItems] = useState<SellerOrderItem[]>([]);
  const [filter, setFilter] = useState<typeof filterOptions[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    if (filter === 'ALL') return items;
    return items.filter((item) => (item.order?.orderStatus || 'PENDING') === filter);
  }, [filter, items]);

  const load = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setItems(await getSellerOrderItems(accessToken));
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không tải được đơn hàng của shop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]);

  const updateStatus = async (orderId: number, orderStatus: typeof statusOptions[number]) => {
    if (!accessToken) return;

    try {
      await updateSellerOrderStatus(accessToken, orderId, orderStatus);
      setMessage('Đã cập nhật trạng thái đơn hàng.');
      await load();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không cập nhật được trạng thái đơn hàng.');
    }
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Đơn hàng của shop</h1>
          <p className="mt-1 text-sm text-slate-500">Người bán chỉ thấy sản phẩm và đơn liên quan đến shop của mình.</p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg bg-white p-3 shadow-sm">
          {filterOptions.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${filter === status ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-orange-50 hover:text-orange-600'}`}
            >
              {statusText[status]}
            </button>
          ))}
        </div>

        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}

        {!accessToken ? (
          <Notice text="Bạn cần đăng nhập để xem đơn hàng." href="/auth/signin?callbackUrl=/seller/orders" />
        ) : loading ? (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải đơn hàng...</div>
        ) : (
          <div className="space-y-3">
            {filteredItems.length ? filteredItems.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[1fr_170px_220px] md:items-center">
                  <div className="flex min-w-0 gap-3">
                    {item.productImage ? <img src={item.productImage} alt={item.productName} className="h-16 w-16 rounded-md object-cover" /> : null}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.productName}</p>
                      <p className="text-sm text-slate-500">Mã đơn: {item.order?.orderCode || `#${item.orderId}`}</p>
                      <p className="text-sm text-slate-500">Ngày đặt: {formatDate(item.order?.createdAt)}</p>
                      <p className="text-sm text-slate-500">Người nhận: {item.order?.receiverName || 'Khách hàng'} - {item.order?.receiverPhone || ''}</p>
                      <p className="line-clamp-1 text-sm text-slate-500">Địa chỉ: {item.order?.receiverAddress || 'Chưa có địa chỉ'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-orange-600">{formatCurrency(item.price * item.quantity)}</p>
                    <p className="text-sm text-slate-500">Số lượng: {item.quantity}</p>
                    <p className="text-sm font-semibold">{statusText[item.order?.orderStatus || 'PENDING']}</p>
                  </div>
                  <select
                    value={item.order?.orderStatus || 'PENDING'}
                    onChange={(event) => void updateStatus(item.orderId, event.target.value as typeof statusOptions[number])}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500"
                  >
                    <option value="PENDING" disabled>Chờ xác nhận</option>
                    {statusOptions.map((status) => <option key={status} value={status}>{statusText[status]}</option>)}
                  </select>
                </div>
              </div>
            )) : <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Chưa có đơn hàng phù hợp.</div>}
          </div>
        )}
      </div>
    </SellerShell>
  );
}

function Notice({ text, href, action = 'Tiếp tục' }: { text: string; href: string; action?: string }) {
  return (
    <div className="rounded-lg bg-white p-8 text-center shadow-sm">
      <p className="mb-4 text-slate-600">{text}</p>
      <Link href={href} className="rounded-md bg-orange-500 px-5 py-3 font-bold text-white">
        {action}
      </Link>
    </div>
  );
}
