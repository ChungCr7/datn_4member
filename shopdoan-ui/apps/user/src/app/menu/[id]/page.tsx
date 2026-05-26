'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { useCart } from '@/context/CartContext';
import { writeBuyNowItem } from '@/lib/checkoutStorage';
import { formatCurrency } from '@/lib/format';
import {
  fallbackProductImage,
  getProductById,
  getProducts,
  Product,
} from '@/services/marketplaceService';
import {
  ChevronLeft,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Zap,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [buyNowVariantId, setBuyNowVariantId] = useState<number | undefined>();
  const [buyNowQuantity, setBuyNowQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addItem } = useCart();

  useEffect(() => {
    if (!productId) return;
    let mounted = true;
    setError('');
    const snapshot = readProductSnapshot(productId);
    if (snapshot) {
      setProduct(snapshot);
      setSelectedImage(snapshot.images?.[0]?.imageUrl || fallbackProductImage);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getProductById(productId)
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
        setSelectedImage(data.images?.[0]?.imageUrl || fallbackProductImage);
        writeProductSnapshot(data);
        if (data.category?.id) {
          getProducts({ categoryId: data.category.id, limit: 5, sortBy: 'best_selling' })
            .then((result) => {
              if (mounted) setRelatedProducts(result.products.filter((item) => item.id !== data.id).slice(0, 4));
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError('Không tải được thông tin sản phẩm.');
        if (!snapshot) setProduct(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [productId]);

  const activeVariants = useMemo(
    () => product?.variants?.filter((variant) => variant.isActive !== false) || [],
    [product?.variants],
  );

  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId);
  const basePrice = product ? product.salePrice ?? product.price : 0;
  const finalPrice = selectedVariant
    ? Number(selectedVariant.price ?? basePrice) + Number(selectedVariant.priceDelta || 0)
    : basePrice;
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;
  const images = product?.images?.length ? product.images : [{ id: 0, imageUrl: fallbackProductImage, sortOrder: 0 }];
  const hasSale = product?.salePrice && product.salePrice < product.price;

  const addToCart = async () => {
    if (!product) return;
    const added = await addItem(
      {
        id: String(product.id),
        productId: product.id,
        variantId: selectedVariantId,
        variantName: selectedVariant
          ? `${selectedVariant.name}${selectedVariant.value ? `: ${selectedVariant.value}` : ''}`
          : undefined,
        name: selectedVariant?.value ? `${product.name} (${selectedVariant.value})` : product.name,
        price: finalPrice,
        image: selectedImage || fallbackProductImage,
        stock,
        seller: product.seller || undefined,
      },
      quantity,
    );
    if (added) return;
  };

  const openBuyNow = () => {
    setBuyNowVariantId(selectedVariantId);
    setBuyNowQuantity(quantity);
    setBuyNowOpen(true);
  };

  const confirmBuyNow = () => {
    if (!product) return;
    const variant = activeVariants.find((entry) => entry.id === buyNowVariantId);
    const price = variant
      ? Number(variant.price ?? basePrice) + Number(variant.priceDelta || 0)
      : basePrice;
    const variantStock = variant?.stock ?? product.stock;
    const safeQuantity = Math.max(1, Math.min(buyNowQuantity, variantStock || buyNowQuantity));

    writeBuyNowItem({
      id: `buy-now:${product.id}:${variant?.id || 'base'}`,
      productId: product.id,
      variantId: variant?.id,
      variantName: variant ? `${variant.name}${variant.value ? `: ${variant.value}` : ''}` : undefined,
      name: variant?.value ? `${product.name} (${variant.value})` : product.name,
      price,
      image: selectedImage || product.images?.[0]?.imageUrl || fallbackProductImage,
      quantity: safeQuantity,
      seller: product.seller,
    });
    router.push('/checkout?mode=buy-now');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/menu" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách sản phẩm
        </Link>

        {loading ? (
          <ProductSkeleton />
        ) : error || !product ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
            {error || 'Không tìm thấy sản phẩm.'}
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-6 rounded-lg bg-white p-4 shadow-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-6">
              <div>
                <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.slice(0, 5).map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImage(image.imageUrl)}
                      className={`aspect-square overflow-hidden rounded-md border ${
                        selectedImage === image.imageUrl ? 'border-orange-500' : 'border-slate-200'
                      }`}
                    >
                      <img src={image.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {hasSale ? (
                      <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600">
                        <Zap className="h-3.5 w-3.5" />
                        Đang giảm giá
                      </span>
                    ) : null}
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {product.category?.name || 'Sản phẩm'}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {product.ratingAverage ? product.ratingAverage.toFixed(1) : 'Chưa có đánh giá'}
                    </span>
                    <span>Đã bán {product.soldCount}</span>
                    <span>Còn {stock} sản phẩm</span>
                  </div>
                </div>

                <div className="rounded-lg bg-orange-50 p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-black text-orange-600">{formatCurrency(finalPrice)}</span>
                    {hasSale ? (
                      <span className="text-base text-slate-400 line-through">{formatCurrency(product.price)}</span>
                    ) : null}
                  </div>
                </div>

                {activeVariants.length ? (
                  <div>
                    <h2 className="mb-2 text-sm font-bold text-slate-700">Phân loại</h2>
                    <div className="flex flex-wrap gap-2">
                      {activeVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id === selectedVariantId ? undefined : variant.id)}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                            selectedVariantId === variant.id
                              ? 'border-orange-500 bg-orange-50 text-orange-600'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200'
                          }`}
                        >
                          {variant.name}{variant.value ? `: ${variant.value}` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h2 className="mb-2 text-sm font-bold text-slate-700">Số lượng</h2>
                  <div className="inline-flex h-11 overflow-hidden rounded-md border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      className="grid w-11 place-items-center hover:bg-slate-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      value={quantity}
                      inputMode="numeric"
                      onChange={(event) => setQuantity(Math.max(1, Number(event.target.value.replace(/\D/g, '')) || 1))}
                      className="w-16 border-x border-slate-300 text-center text-sm font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(stock || value + 1, value + 1))}
                      className="grid w-11 place-items-center hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={stock <= 0}
                    onClick={() => void addToCart()}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-orange-500 bg-orange-50 text-sm font-bold text-orange-600 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Thêm vào giỏ
                  </button>
                  <button
                    type="button"
                    disabled={stock <= 0}
                    onClick={openBuyNow}
                    className="h-12 flex-1 rounded-md bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mua ngay
                  </button>
                  <button
                    type="button"
                    className="grid h-12 w-12 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Yêu thích"
                  >
                    <Heart className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
                  <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="Thanh toán COD" />
                  <TrustItem icon={<Truck className="h-5 w-5" />} title="Giao hàng demo" />
                  <TrustItem icon={<PackageCheck className="h-5 w-5" />} title="Đổi trả hỗ trợ" />
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-50 text-orange-600">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold">{product.seller?.shopName || 'ShopDoan Mall'}</h2>
                    <p className="text-sm text-slate-500">Người bán đã được duyệt trên sàn</p>
                  </div>
                </div>
                <Link
                  href={`/menu?sellerId=${product.seller?.id || ''}`}
                  className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Xem shop
                </Link>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Mô tả sản phẩm</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {product.description || 'Sản phẩm chưa có mô tả chi tiết.'}
                </p>
              </div>

              <div className="rounded-lg bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold">Đánh giá</h2>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-orange-600">
                    {product.ratingAverage ? product.ratingAverage.toFixed(1) : '0.0'}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">/ 5 sao</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {product.ratingCount || 0} lượt đánh giá. Phần viết đánh giá sản phẩm sẽ được nối tiếp khi refactor module reviews sang product.
                </p>
              </div>
            </section>

            {relatedProducts.length ? (
              <section className="mt-8">
                <h2 className="mb-4 text-xl font-bold">Sản phẩm liên quan</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {relatedProducts.map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
      {product && buyNowOpen ? (
        <BuyNowModal
          product={product}
          variants={activeVariants}
          selectedVariantId={buyNowVariantId}
          quantity={buyNowQuantity}
          onClose={() => setBuyNowOpen(false)}
          onChangeVariant={setBuyNowVariantId}
          onChangeQuantity={setBuyNowQuantity}
          onConfirm={confirmBuyNow}
        />
      ) : null}
      <Footer />
    </div>
  );
}

function BuyNowModal({
  product,
  variants,
  selectedVariantId,
  quantity,
  onClose,
  onChangeVariant,
  onChangeQuantity,
  onConfirm,
}: {
  product: Product;
  variants: NonNullable<Product['variants']>;
  selectedVariantId?: number;
  quantity: number;
  onClose: () => void;
  onChangeVariant: (id?: number) => void;
  onChangeQuantity: (quantity: number) => void;
  onConfirm: () => void;
}) {
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const price =
    Number(selectedVariant?.price ?? product.salePrice ?? product.price) +
    Number(selectedVariant?.priceDelta || 0);
  const stock = selectedVariant?.stock ?? product.stock;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
        <div className="flex gap-4">
          <img
            src={product.images?.[0]?.imageUrl || fallbackProductImage}
            alt={product.name}
            className="h-24 w-24 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 font-bold">{product.name}</h2>
            <p className="mt-2 text-2xl font-black text-orange-600">{formatCurrency(price)}</p>
            <p className="mt-1 text-sm text-slate-500">Còn {stock} sản phẩm</p>
          </div>
        </div>

        {variants.length ? (
          <div className="mt-5">
            <div className="mb-2 text-sm font-bold text-slate-700">Chọn size/phân loại</div>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onChangeVariant(variant.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    selectedVariantId === variant.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-slate-200 text-slate-700 hover:border-orange-200'
                  }`}
                >
                  {variant.name}{variant.value ? `: ${variant.value}` : ''}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-2 text-sm font-bold text-slate-700">Số lượng</div>
          <div className="inline-flex h-10 overflow-hidden rounded-md border border-slate-300">
            <button type="button" onClick={() => onChangeQuantity(Math.max(1, quantity - 1))} className="w-10">-</button>
            <input
              value={quantity}
              inputMode="numeric"
              onChange={(event) => onChangeQuantity(Math.max(1, Number(event.target.value.replace(/\D/g, '')) || 1))}
              className="w-14 border-x border-slate-300 text-center text-sm font-semibold outline-none"
            />
            <button type="button" onClick={() => onChangeQuantity(Math.min(stock || quantity + 1, quantity + 1))} className="w-10">+</button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-md border border-slate-300 font-semibold text-slate-700">
            Hủy
          </button>
          <button type="button" onClick={onConfirm} className="h-11 flex-1 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600">
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-6 grid gap-6 rounded-lg bg-white p-6 shadow-sm lg:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-20 animate-pulse rounded bg-slate-200" />
        <div className="h-14 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-12 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

function TrustItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
      <span className="text-orange-500">{icon}</span>
      {title}
    </div>
  );
}

function readProductSnapshot(productId: number) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`shopdoan_product_${productId}`);
    return raw ? (JSON.parse(raw) as Product) : null;
  } catch {
    return null;
  }
}

function writeProductSnapshot(product: Product) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(`shopdoan_product_${product.id}`, JSON.stringify(product));
}
