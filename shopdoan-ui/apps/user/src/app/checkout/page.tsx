'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import {
  BuyNowItem,
  CheckoutAddress,
  clearBuyNowItem,
  readBuyNowItem,
  readSelectedAddress,
  writeSelectedAddress,
} from '@/lib/checkoutStorage';
import { formatCurrency } from '@/lib/format';
import { createOrder } from '@/services/ordersService';
import { getCurrentUser } from '@/services/usersService';
import { CreditCard, MapPin, MessageSquareText, PackageCheck, Truck } from 'lucide-react';

type CheckoutItem = BuyNowItem;

export default function CheckoutPage() {
  const { items: cartItems, totalPrice, clearCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(null);
  const [address, setAddress] = useState<CheckoutAddress | null>(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'MOMO' | 'CREDIT_CARD' | 'BANK_TRANSFER'>('COD');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBuyNowItem(readBuyNowItem());
    const selected = readSelectedAddress();
    if (selected) setAddress(selected);
  }, []);

  useEffect(() => {
    const accessToken = (session as any)?.accessToken;
    if (!accessToken || address) return;

    getCurrentUser(accessToken)
      .then((user) => {
        const fallbackAddress = {
          id: 'profile',
          receiverName: user.name || '',
          receiverPhone: user.phone || '',
          receiverAddress: user.address || '',
          isDefault: true,
        };
        if (fallbackAddress.receiverName || fallbackAddress.receiverPhone || fallbackAddress.receiverAddress) {
          setAddress(fallbackAddress);
          writeSelectedAddress(fallbackAddress);
        }
      })
      .catch(() => undefined);
  }, [session, address]);

  const checkoutItems: CheckoutItem[] = useMemo(() => {
    if (buyNowItem) return [buyNowItem];
    return cartItems
      .filter((item) => item.productId)
      .map((item) => ({
        id: item.id,
        productId: item.productId!,
        variantId: item.variantId,
        variantName: item.variantName,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        seller: item.seller,
      }));
  }, [buyNowItem, cartItems]);

  const subtotal = buyNowItem
    ? buyNowItem.price * buyNowItem.quantity
    : totalPrice;
  const shippingFee = checkoutItems.length ? 30000 : 0;
  const discount = subtotal >= 500000 ? 25000 : 0;
  const finalAmount = Math.max(0, subtotal + shippingFee - discount);

  const submit = async () => {
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      router.push('/auth/signin?callbackUrl=/checkout');
      return;
    }
    if (!checkoutItems.length) {
      router.push('/menu');
      return;
    }
    if (!address?.receiverName || !address.receiverPhone || !address.receiverAddress) {
      setError('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await createOrder(accessToken, {
        receiverName: address.receiverName.trim(),
        receiverPhone: address.receiverPhone.trim(),
        receiverAddress: address.receiverAddress.trim(),
        note: note.trim(),
        paymentMethod,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
      const order = ((result as any).data || result) as { id?: number };
      if (buyNowItem) {
        clearBuyNowItem();
      } else {
        await clearCart();
      }
      router.push(`/orders${order?.id ? `?created=${order.id}` : ''}`);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không tạo được đơn hàng. Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">Thanh toán</h1>

          <Link href="/checkout/address" className="block rounded-lg bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-orange-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold">Địa chỉ nhận hàng</h2>
                  <span className="text-sm font-semibold text-orange-600">Thay đổi</span>
                </div>
                {address ? (
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    <p className="font-semibold">{address.receiverName} - {address.receiverPhone}</p>
                    <p>{address.receiverAddress}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Bấm để thêm tên người nhận, số điện thoại và địa chỉ giao hàng.</p>
                )}
              </div>
            </div>
          </Link>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-orange-500" />
              <h2 className="font-bold">Sản phẩm đặt mua</h2>
            </div>
            {checkoutItems.length ? (
              <div className="divide-y divide-slate-100">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold">{item.name}</p>
                      {item.variantName ? <p className="mt-1 text-sm text-slate-500">{item.variantName}</p> : null}
                      <p className="mt-1 text-sm text-slate-500">Shop: {item.seller?.shopName || 'ShopDoan Mall'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-bold text-orange-600">{formatCurrency(item.price)}</p>
                      <p className="mt-1 text-slate-500">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Chưa có sản phẩm để thanh toán.
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <h2 className="font-bold">Phương thức thanh toán</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['COD', 'Thanh toán khi nhận hàng'],
                ['MOMO', 'Momo mock'],
                ['CREDIT_CARD', 'Thẻ tín dụng mock'],
                ['BANK_TRANSFER', 'Chuyển khoản mock'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                  className={`rounded-md border p-4 text-left text-sm font-semibold ${
                    paymentMethod === value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block rounded-lg bg-white p-5 shadow-sm">
            <span className="mb-3 flex items-center gap-2 font-bold">
              <MessageSquareText className="h-5 w-5 text-orange-500" />
              Ghi chú cho người bán
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-orange-500"
              placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..."
            />
          </label>
        </section>

        <aside className="h-fit rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Tóm tắt đơn hàng</h2>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryLine label="Tạm tính" value={formatCurrency(subtotal)} />
            <SummaryLine label="Phí vận chuyển" value={formatCurrency(shippingFee)} />
            <SummaryLine label="Voucher" value={`-${formatCurrency(discount)}`} muted={discount === 0} />
            <div className="border-t border-slate-200 pt-3">
              <SummaryLine label="Tổng thanh toán" value={formatCurrency(finalAmount)} strong />
            </div>
          </div>
          {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !checkoutItems.length}
            className="mt-6 w-full rounded-md bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang tạo đơn...' : 'Đặt hàng'}
          </button>
          <div className="mt-4 flex gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            <Truck className="mt-0.5 h-4 w-4 text-orange-500" />
            <span>Đơn hàng sẽ lưu phí vận chuyển và phương thức thanh toán rõ ràng.</span>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}

function SummaryLine({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-lg font-black' : ''} ${muted ? 'text-slate-400' : ''}`}>
      <span>{label}</span>
      <span className={strong ? 'text-orange-600' : 'font-semibold'}>{value}</span>
    </div>
  );
}
