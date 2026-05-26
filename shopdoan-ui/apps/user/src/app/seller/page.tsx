'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SellerShell from '@/components/seller/SellerShell';
import { getMySellerProfile, getSellerAnalytics, SellerAnalytics, SellerProfile } from '@/services/sellerService';
import { formatCurrency } from '@/lib/format';

export default function SellerDashboardPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<SellerAnalytics>({ products: 0, orderItems: 0, revenue: 0, averageRating: 0, latestItems: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getMySellerProfile(accessToken)
      .then(async (seller) => {
        setProfile(seller);
        if (seller?.status === 'APPROVED') {
          const analytics = await getSellerAnalytics(accessToken).catch(() => null);
          if (analytics) setStats(analytics);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Tổng quan bán hàng</h1>
          <p className="mt-2 text-sm text-slate-500">Theo dõi nhanh tình trạng shop, sản phẩm, đơn hàng và doanh thu.</p>
        </div>

        {!accessToken ? (
          <Notice text="Bạn cần đăng nhập để dùng kênh người bán." href="/auth/signin?callbackUrl=/seller" />
        ) : loading ? (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải dữ liệu...</div>
        ) : !profile ? (
          <Notice text="Bạn chưa đăng ký hồ sơ người bán." href="/seller/register" action="Đăng ký ngay" />
        ) : profile.status !== 'APPROVED' ? (
          <Notice text={`Shop đang ở trạng thái ${statusText[profile.status]}. Bạn cần chờ admin duyệt trước khi bán hàng.`} href="/seller/register" action="Xem hồ sơ" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Sản phẩm" value={stats.products.toString()} />
              <StatCard label="Sản phẩm đã bán" value={stats.orderItems.toString()} />
              <StatCard label="Doanh thu đã giao" value={formatCurrency(stats.revenue)} />
              <StatCard label="Đánh giá trung bình" value={stats.averageRating ? `${stats.averageRating}/5` : 'Chưa có'} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/seller/products/new" className="rounded-lg bg-orange-500 p-5 font-bold text-white shadow-sm hover:bg-orange-600">
                Tạo sản phẩm mới
              </Link>
              <Link href="/seller/orders" className="rounded-lg bg-white p-5 font-bold text-slate-900 shadow-sm hover:text-orange-600">
                Xem đơn hàng của shop
              </Link>
            </div>

            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Đơn gần đây</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {stats.latestItems?.length ? stats.latestItems.map((item) => (
                  <div key={item.id} className="grid gap-3 py-3 text-sm sm:grid-cols-[1fr_140px_120px] sm:items-center">
                    <div>
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-slate-500">Mã đơn: {item.order?.orderCode || `#${item.orderId}`}</p>
                    </div>
                    <p className="font-semibold text-orange-600">{formatCurrency(item.price * item.quantity)}</p>
                    <p className="text-slate-500">{orderStatusText[item.order?.orderStatus || 'PENDING']}</p>
                  </div>
                )) : <p className="py-6 text-center text-sm text-slate-500">Shop chưa có đơn hàng.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </SellerShell>
  );
}

const statusText: Record<SellerProfile['status'], string> = {
  PENDING: 'đang chờ duyệt',
  APPROVED: 'đã được duyệt',
  REJECTED: 'bị từ chối',
  SUSPENDED: 'tạm khóa',
};

const orderStatusText: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
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
