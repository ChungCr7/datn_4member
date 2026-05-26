'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import {
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';

type CartItemView = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  productId?: number;
  variantName?: string;
  stock?: number;
  seller?: { id: number; shopName: string; shopSlug: string };
};

export default function CartPage() {
  const { items, totalItems, totalPrice, updateItem, removeItem, clearCart } = useCart();
  const groupedItems = groupItemsByShop(items as CartItemView[]);
  const shippingFee = totalItems > 0 ? 30000 : 0;
  const discount = totalPrice >= 500000 ? 25000 : 0;
  const finalAmount = Math.max(0, totalPrice + shippingFee - discount);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
              <ShoppingBag className="h-4 w-4" />
              Giỏ hàng marketplace
            </div>
            <h1 className="text-3xl font-bold">Giỏ hàng của bạn</h1>
            <p className="mt-2 text-sm text-slate-600">
              Kiểm tra sản phẩm theo từng shop trước khi thanh toán.
            </p>
          </div>

          {items.length ? (
            <button
              type="button"
              onClick={() => void clearCart()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Xóa toàn bộ
            </button>
          ) : null}
        </div>

        {items.length ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.shopId} className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                    <Store className="h-5 w-5 text-orange-500" />
                    <span className="font-bold">{group.shopName}</span>
                    <span className="text-sm text-slate-400">({group.items.length} sản phẩm)</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div key={item.id} className="grid gap-4 p-4 md:grid-cols-[1fr_160px_120px_40px] md:items-center">
                        <div className="flex min-w-0 gap-4">
                          <Link href={item.productId ? `/menu/${item.productId}` : '/menu'} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-slate-400">
                                <PackageOpen className="h-8 w-8" />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link href={item.productId ? `/menu/${item.productId}` : '/menu'} className="line-clamp-2 font-semibold hover:text-orange-600">
                              {item.name}
                            </Link>
                            {item.variantName ? (
                              <p className="mt-1 text-sm text-slate-500">Phân loại: {item.variantName}</p>
                            ) : null}
                            <p className="mt-2 text-sm text-slate-500">
                              Đơn giá: <span className="font-semibold text-slate-700">{formatCurrency(item.price)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex h-10 w-fit overflow-hidden rounded-md border border-slate-300 bg-white">
                          <button
                            type="button"
                            onClick={() => void updateItem(item.id, item.quantity - 1)}
                            className="grid w-10 place-items-center hover:bg-slate-50"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="grid w-12 place-items-center border-x border-slate-300 text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => void updateItem(item.id, item.quantity + 1)}
                            className="grid w-10 place-items-center hover:bg-slate-50"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="font-bold text-orange-600 md:text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </div>

                        <button
                          type="button"
                          onClick={() => void removeItem(item.id)}
                          className="grid h-10 w-10 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Xóa sản phẩm"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <aside className="h-fit rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Tóm tắt thanh toán</h2>
              <div className="mt-5 space-y-3 text-sm">
                <SummaryLine label="Số sản phẩm" value={`${totalItems}`} />
                <SummaryLine label="Tạm tính" value={formatCurrency(totalPrice)} />
                <SummaryLine label="Phí vận chuyển" value={formatCurrency(shippingFee)} />
                <SummaryLine label="Voucher" value={`-${formatCurrency(discount)}`} muted={discount === 0} />
                <div className="border-t border-slate-200 pt-3">
                  <SummaryLine label="Tổng thanh toán" value={formatCurrency(finalAmount)} strong />
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block rounded-md bg-orange-500 px-5 py-3 text-center font-bold text-white hover:bg-orange-600"
              >
                Mua hàng
              </Link>

              <div className="mt-5 space-y-3 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                <TrustRow icon={<ShieldCheck className="h-4 w-4" />} text="COD được hỗ trợ trước trong bản demo." />
                <TrustRow icon={<Truck className="h-4 w-4" />} text="Phí vận chuyển mock sẽ lưu vào đơn hàng." />
              </div>
            </aside>
          </div>
        ) : (
          <EmptyCart />
        )}
      </main>
      <Footer />
    </div>
  );
}

function groupItemsByShop(items: CartItemView[]) {
  const groups = new Map<string, { shopId: string; shopName: string; items: CartItemView[] }>();

  for (const item of items) {
    const shopId = item.seller?.id ? String(item.seller.id) : 'shopdoan';
    const shopName = item.seller?.shopName || 'ShopDoan Mall';
    const current = groups.get(shopId) || { shopId, shopName, items: [] };
    current.items.push(item);
    groups.set(shopId, current);
  }

  return Array.from(groups.values());
}

function SummaryLine({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-lg font-black' : ''} ${muted ? 'text-slate-400' : ''}`}>
      <span>{label}</span>
      <span className={strong ? 'text-orange-600' : 'font-semibold'}>{value}</span>
    </div>
  );
}

function TrustRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-orange-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-50 text-orange-500">
        <ShoppingBag className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Giỏ hàng đang trống</h2>
      <p className="mt-2 text-sm text-slate-500">
        Hãy khám phá sản phẩm đang bán trên sàn và thêm vào giỏ hàng.
      </p>
      <Link
        href="/menu"
        className="mt-6 inline-flex rounded-md bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
      >
        Khám phá sản phẩm
      </Link>
    </div>
  );
}
