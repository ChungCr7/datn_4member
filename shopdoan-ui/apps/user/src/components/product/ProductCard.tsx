'use client';

import { Star, Store, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { fallbackProductImage, Product } from '@/services/marketplaceService';

type ProductCardProps = {
  product: Product;
  onAddToCart?: (product: Product) => void;
};

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const image = product.images?.[0]?.imageUrl || fallbackProductImage;
  const displayPrice = product.salePrice ?? product.price;
  const hasSale = product.salePrice && product.salePrice < product.price;
  const rememberProduct = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(`shopdoan_product_${product.id}`, JSON.stringify(product));
  };

  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <Link href={`/menu/${product.id}`} onClick={rememberProduct} className="relative block aspect-square overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {hasSale ? (
          <div className="absolute left-2 top-2 rounded bg-orange-500 px-2 py-1 text-xs font-bold text-white">
            Giảm giá
          </div>
        ) : null}
      </Link>

      <div className="space-y-2 p-3">
        <Link href={`/menu/${product.id}`} onClick={rememberProduct} className="line-clamp-2 block min-h-10 text-sm font-medium leading-5 text-slate-900 hover:text-orange-600">
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-orange-600">{formatCurrency(displayPrice)}</span>
          {hasSale ? (
            <span className="text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {product.ratingAverage ? product.ratingAverage.toFixed(1) : 'Mới'}
          </span>
          <span>Đã bán {product.soldCount}</span>
        </div>

        <div className="flex items-center gap-1 truncate text-xs text-slate-500">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{product.seller?.shopName || 'ShopDoan Mall'}</span>
        </div>

        {onAddToCart ? (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ShoppingCart className="h-4 w-4" />
            Thêm vào giỏ
          </button>
        ) : null}
      </div>
    </article>
  );
}
