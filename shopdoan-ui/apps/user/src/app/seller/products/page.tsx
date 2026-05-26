'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SellerShell from '@/components/seller/SellerShell';
import { Product, fallbackProductImage } from '@/services/marketplaceService';
import { getMySellerProfile, SellerProfile } from '@/services/sellerService';
import { deleteSellerProduct, getSellerProducts } from '@/services/sellerProductService';
import { formatCurrency } from '@/lib/format';

export default function SellerProductsPage() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return products;
    return products.filter((product) => `${product.name} ${product.category?.name || ''}`.toLowerCase().includes(text));
  }, [keyword, products]);

  const load = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const seller = await getMySellerProfile(accessToken);
      setProfile(seller);
      if (seller) setProducts(await getSellerProducts(accessToken, seller.id));
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không tải được danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]);

  const remove = async (id: number) => {
    if (!accessToken) return;
    if (!window.confirm('Bạn muốn ẩn sản phẩm này khỏi gian hàng?')) return;

    await deleteSellerProduct(accessToken, id);
    setMessage('Đã ẩn sản phẩm.');
    await load();
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sản phẩm của shop</h1>
            <p className="mt-1 text-sm text-slate-500">Quản lý sản phẩm đang bán, nháp hoặc tạm ẩn.</p>
          </div>
          <Link href="/seller/products/new" className="rounded-md bg-orange-500 px-4 py-2 text-sm font-bold text-white">
            Tạo sản phẩm
          </Link>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên sản phẩm hoặc danh mục"
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
          />
        </div>

        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}

        {!accessToken ? (
          <Notice text="Bạn cần đăng nhập để quản lý sản phẩm." href="/auth/signin?callbackUrl=/seller/products" />
        ) : loading ? (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải sản phẩm...</div>
        ) : profile && profile.status !== 'APPROVED' ? (
          <Notice text="Shop cần được admin duyệt trước khi đăng bán sản phẩm." href="/seller/register" action="Xem hồ sơ shop" />
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            {filteredProducts.length ? filteredProducts.map((product) => (
              <div key={product.id} className="grid gap-4 border-b border-slate-100 p-4 md:grid-cols-[1fr_150px_120px_170px] md:items-center">
                <div className="flex min-w-0 gap-3">
                  <img src={product.images?.[0]?.imageUrl || fallbackProductImage} alt={product.name} className="h-16 w-16 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.category?.name || 'Chưa phân loại'}</p>
                    <p className="text-xs font-semibold text-slate-400">{productStatusText[product.status || 'ACTIVE']}</p>
                  </div>
                </div>
                <p className="font-bold text-orange-600">{formatCurrency(product.salePrice || product.price)}</p>
                <p className="text-sm text-slate-600">Tồn: {product.stock}</p>
                <div className="flex gap-2">
                  <Link href={`/seller/products/${product.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">
                    Sửa
                  </Link>
                  <button onClick={() => void remove(product.id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                    Ẩn
                  </button>
                </div>
              </div>
            )) : <div className="p-8 text-center text-sm text-slate-500">Shop chưa có sản phẩm phù hợp.</div>}
          </div>
        )}
      </div>
    </SellerShell>
  );
}

const productStatusText: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  INACTIVE: 'Tạm ẩn',
  BANNED: 'Bị khóa',
};

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
