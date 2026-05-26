'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Chatbot from '@/components/ui/Chatbot';
import ProductCard from '@/components/product/ProductCard';
import {
  Category,
  getCategories,
  getHomeRecommendations,
  getProducts,
  Product,
} from '@/services/marketplaceService';
import {
  BadgePercent,
  ChevronRight,
  Headphones,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Zap,
} from 'lucide-react';

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestSelling, setBestSelling] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getCategories(10),
      getProducts({ sortBy: 'best_selling', limit: 8 }),
      getHomeRecommendations(8),
    ])
      .then(([categoryData, bestSellingData, recommendationData]) => {
        if (!mounted) return;
        setCategories(categoryData);
        setBestSelling(bestSellingData.products);
        setRecommended(recommendationData);
      })
      .catch(() => {
        if (!mounted) return;
        setCategories([]);
        setBestSelling([]);
        setRecommended([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const flashSaleProducts = useMemo(
    () => bestSelling.filter((product) => product.salePrice).slice(0, 4),
    [bestSelling],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main>
        <section className="bg-orange-500 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
            <div
              className="flex min-h-[320px] flex-col justify-between overflow-hidden rounded-lg bg-slate-900 p-6"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(15,23,42,.92), rgba(15,23,42,.38)), url('https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1400&q=80')",
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur">
                  <Zap className="h-4 w-4 text-amber-300" />
                  Sàn thương mại điện tử ShopDoan
                </div>
                <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                  Mua sắm đa ngành hàng, giao nhanh, giá tốt mỗi ngày
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-orange-50">
                  Khám phá sản phẩm từ nhiều shop, săn ưu đãi, theo dõi đơn hàng và hỏi chatbot nội bộ khi cần hỗ trợ.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                >
                  <Search className="h-4 w-4" />
                  Khám phá sản phẩm
                </Link>
                <Link
                  href="/chatbot"
                  className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Headphones className="h-4 w-4" />
                  Hỏi trợ lý mua sắm
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <PromoTile
                icon={<BadgePercent className="h-5 w-5" />}
                title="Flash Sale"
                text="Săn sản phẩm đang giảm giá từ các shop nổi bật."
              />
              <PromoTile
                icon={<Store className="h-5 w-5" />}
                title="Kênh người bán"
                text="Đăng ký shop, chờ duyệt và bắt đầu bán hàng."
              />
              <PromoTile
                icon={<Truck className="h-5 w-5" />}
                title="Theo dõi đơn"
                text="Cập nhật trạng thái đóng gói, giao hàng và hoàn tất."
              />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-5">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            <TrustItem icon={<PackageCheck className="h-5 w-5" />} title="Hàng thật từ shop" />
            <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="Thanh toán COD trước" />
            <TrustItem icon={<ShoppingBag className="h-5 w-5" />} title="Giỏ hàng đa shop" />
          </div>
        </section>

        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Danh mục nổi bật" href="/menu" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {loading
                ? Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="h-28 animate-pulse rounded-lg bg-white" />
                  ))
                : categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/menu?categoryId=${category.id}`}
                      className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center transition hover:border-orange-200 hover:shadow-sm"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-orange-50">
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          <ShoppingBag className="m-3 h-6 w-6 text-orange-500" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-orange-600">
                        {category.name}
                      </span>
                    </Link>
                  ))}
            </div>
          </div>
        </section>

        <section className="py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-lg border border-orange-200 bg-white p-4">
              <SectionHeader title="Flash Sale hôm nay" href="/menu?sortBy=price_asc" compact />
              <ProductGrid products={flashSaleProducts.length ? flashSaleProducts : bestSelling.slice(0, 4)} loading={loading} />
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Gợi ý cho bạn" href="/menu?sortBy=best_selling" />
            <ProductGrid products={recommended.length ? recommended : bestSelling} loading={loading} />
          </div>
        </section>
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
}

function SectionHeader({
  title,
  href,
  compact = false,
}: {
  title: string;
  href: string;
  compact?: boolean;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between ${compact ? '' : 'border-b border-slate-200 pb-3'}`}>
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
        Xem thêm
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ProductGrid({ products, loading }: { products: Product[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Chưa có sản phẩm phù hợp để hiển thị.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function PromoTile({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-white p-5 text-slate-950 shadow-sm">
      <div className="mb-3 inline-flex rounded-md bg-orange-50 p-2 text-orange-600">{icon}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function TrustItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
      <span className="text-orange-500">{icon}</span>
      {title}
    </div>
  );
}
