'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CheckCircle, Clock, PackageCheck, Truck, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { ApiOrder, cancelOrder, getUserOrders } from '@/services/ordersService';

const statuses = ['all', 'PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

const statusText: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  ordered: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const accessToken = (session as any)?.accessToken as string | undefined;
  const userId = Number((session?.user as any)?.id);

  const loadOrders = async () => {
    if (!accessToken || !userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getUserOrders(accessToken, userId, 1, 50);
      setOrders(response.orders || []);
    } catch {
      setOrders([]);
      setError('Không tải được danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    void loadOrders();
  }, [status, accessToken, userId]);

  const filteredOrders = useMemo(
    () =>
      filterStatus === 'all'
        ? orders
        : orders.filter((order) => normalizeStatus(order) === filterStatus),
    [orders, filterStatus],
  );

  const handleCancel = async (order: ApiOrder) => {
    if (!accessToken) return;
    await cancelOrder(accessToken, order.id);
    await loadOrders();
    setSelectedOrder(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Đơn hàng của tôi</h1>
          <p className="mt-2 text-sm text-slate-600">Theo dõi trạng thái đơn hàng marketplace của bạn.</p>
        </div>

        {!accessToken ? (
          <div className="rounded-lg bg-white py-16 text-center shadow-sm">
            <p className="mb-5 text-lg text-slate-600">Bạn cần đăng nhập để xem đơn hàng.</p>
            <Link href="/auth/signin" className="rounded-md bg-slate-950 px-5 py-3 font-semibold text-white">Đăng nhập</Link>
          </div>
        ) : selectedOrder ? (
          <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} onCancel={handleCancel} />
        ) : (
          <>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {statuses.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilterStatus(item)}
                  className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition ${
                    filterStatus === item ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                  }`}
                >
                  {item === 'all' ? 'Tất cả' : statusText[item]}
                </button>
              ))}
            </div>

            {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            {loading ? (
              <div className="rounded-lg bg-white py-16 text-center text-slate-500 shadow-sm">Đang tải đơn hàng...</div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <button
                    type="button"
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(normalizeStatus(order))}
                        <div>
                          <p className="text-sm text-slate-500">Mã đơn hàng</p>
                          <p className="text-lg font-bold">{order.orderCode || `#${order.id}`}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Trạng thái</p>
                        <p className="font-semibold">{statusText[normalizeStatus(order)] || normalizeStatus(order)}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-sm text-slate-500">Tổng thanh toán</p>
                        <p className="text-lg font-black text-orange-600">{formatCurrency(getOrderTotal(order))}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-sm text-slate-500">Ngày đặt</p>
                        <p className="font-semibold">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white py-16 text-center shadow-sm">
                <PackageCheck className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-slate-700">Chưa có đơn hàng nào</p>
                <Link href="/menu" className="mt-5 inline-flex rounded-md bg-orange-500 px-5 py-3 font-bold text-white">
                  Mua sắm ngay
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function OrderDetail({ order, onBack, onCancel }: { order: ApiOrder; onBack: () => void; onCancel: (order: ApiOrder) => void }) {
  const orderItems = order.orderItems?.length ? order.orderItems : order.details || [];
  const status = normalizeStatus(order);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <button onClick={onBack} className="mb-6 font-semibold text-orange-600">Quay lại</button>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <InfoBox label="Mã đơn hàng" value={order.orderCode || `#${order.id}`} />
        <InfoBox label="Trạng thái" value={statusText[status] || status} icon={getStatusIcon(status)} />
        <InfoBox label="Ngày đặt" value={formatDate(order.createdAt)} />
      </div>

      <div className="mb-6 rounded-lg bg-orange-50 p-5">
        <h3 className="mb-3 text-lg font-bold">Thông tin nhận hàng</h3>
        <p className="font-semibold">{order.receiverName || order.customerName || order.user?.name || 'Khách hàng'}</p>
        <p className="mt-1 text-sm text-slate-600">{order.receiverPhone || order.phone || 'Chưa có số điện thoại'}</p>
        <p className="mt-1 text-sm text-slate-600">{order.receiverAddress || order.address || 'Chưa cập nhật địa chỉ'}</p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold">Sản phẩm đã đặt</h3>
        <div className="space-y-3">
          {orderItems.length ? orderItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
              <div className="flex min-w-0 gap-3">
                {item.productImage ? <img src={item.productImage} alt={item.productName || item.itemTitle || ''} className="h-14 w-14 rounded-md object-cover" /> : null}
                <div>
                  <p className="font-semibold">{item.productName || item.itemTitle || `Sản phẩm #${item.productId || item.id}`}</p>
                  <p className="text-sm text-slate-500">Số lượng: {item.quantity}</p>
                </div>
              </div>
              <p className="font-bold text-orange-600">{formatCurrency((item.price || item.unitPrice || 0) * item.quantity)}</p>
            </div>
          )) : (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Đơn hàng chưa có chi tiết sản phẩm.</div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-xl font-black">
          <p>Tổng thanh toán</p>
          <p className="text-orange-600">{formatCurrency(getOrderTotal(order))}</p>
        </div>
      </div>

      {['PENDING', 'CONFIRMED', 'ordered', 'confirmed'].includes(status) ? (
        <button onClick={() => onCancel(order)} className="mt-6 rounded-md bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-600">
          Hủy đơn hàng
        </button>
      ) : null}
    </div>
  );
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="mb-1 text-sm text-slate-500">{label}</p>
      <div className="flex items-center gap-2 font-bold">{icon}{value}</div>
    </div>
  );
}

function normalizeStatus(order: ApiOrder) {
  return order.orderStatus || order.status || 'PENDING';
}

function getOrderTotal(order: ApiOrder) {
  return Number(order.finalAmount ?? order.totalAmount ?? order.totalPrice ?? 0);
}

function getStatusIcon(orderStatus: string) {
  if (orderStatus === 'DELIVERED' || orderStatus === 'delivered') return <CheckCircle className="h-6 w-6 text-green-500" />;
  if (orderStatus === 'CANCELLED' || orderStatus === 'cancelled') return <XCircle className="h-6 w-6 text-red-500" />;
  if (orderStatus === 'SHIPPING') return <Truck className="h-6 w-6 text-blue-500" />;
  return <Clock className="h-6 w-6 text-orange-500" />;
}
