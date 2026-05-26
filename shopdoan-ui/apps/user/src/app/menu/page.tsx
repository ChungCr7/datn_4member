'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import {
  Category,
  getCategories,
  getProducts,
  Product,
} from '@/services/marketplaceService';

type SortBy = 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';

type ProductQuery = {
  page: number;
  limit: number;
  keyword: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy: SortBy;
};

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
];

export default function ProductListPage() {
  return (
    <Suspense fallback={<ProductListShell />}>
      <ProductListContent />
    </Suspense>
  );
}

function ProductListContent() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    limit: 12,
    keyword: '',
    sortBy: 'newest',
  });

  useEffect(() => {
    const keyword = searchParams.get('search') || searchParams.get('keyword') || '';
    const categoryId = Number(searchParams.get('categoryId')) || undefined;
    const sortBy = (searchParams.get('sortBy') as SortBy) || 'newest';

    setDraftKeyword(keyword);
    setQuery((current) => ({
      ...current,
      page: 1,
      keyword,
      categoryId,
      sortBy: sortOptions.some((option) => option.value === sortBy) ? sortBy : 'newest',
    }));
  }, [searchParams]);

  useEffect(() => {
    getCategories(30)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getProducts(query)
      .then((data) => {
        if (!mounted) return;
        setProducts(data.products);
        setMeta(data.meta);
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setMeta({ total: 0, page: query.page, limit: query.limit, totalPages: 1 });
        setError('Không tải được danh sách sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === query.categoryId),
    [categories, query.categoryId],
  );

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(1, meta.totalPages || 1);
    const start = Math.max(1, query.page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [meta.totalPages, query.page]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery((current) => ({ ...current, page: 1, keyword: draftKeyword.trim() }));
  };

  const applyPriceRange = () => {
    setQuery((current) => ({
      ...current,
      page: 1,
      minPrice: priceRange.min ? Number(priceRange.min) : undefined,
      maxPrice: priceRange.max ? Number(priceRange.max) : undefined,
    }));
  };

  const resetFilters = () => {
    setDraftKeyword('');
    setPriceRange({ min: '', max: '' });
    setQuery({ page: 1, limit: 12, keyword: '', sortBy: 'newest' });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
                <Filter className="h-4 w-4" />
                Marketplace
              </div>
              <h1 className="text-3xl font-bold">Tất cả sản phẩm</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tìm kiếm sản phẩm đa ngành hàng, lọc theo danh mục, khoảng giá và độ phổ biến.
              </p>
            </div>

            <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_120px] lg:w-[560px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={draftKeyword}
                  onChange={(event) => setDraftKeyword(event.target.value)}
                  placeholder="Tìm áo, balo, tai nghe..."
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-500"
                />
              </label>
              <button className="h-11 rounded-md bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600">
                Tìm kiếm
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <FilterPanel title="Danh mục">
              <button
                type="button"
                onClick={() => setQuery((current) => ({ ...current, page: 1, categoryId: undefined }))}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${
                  !query.categoryId ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-orange-50'
                }`}
              >
                Tất cả danh mục
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setQuery((current) => ({ ...current, page: 1, categoryId: category.id }))}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${
                    query.categoryId === category.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-orange-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </FilterPanel>

            <FilterPanel title="Khoảng giá">
              <div className="grid grid-cols-2 gap-2">
                <input
                  inputMode="numeric"
                  value={priceRange.min}
                  onChange={(event) => setPriceRange((current) => ({ ...current, min: event.target.value.replace(/\D/g, '') }))}
                  placeholder="Từ"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500"
                />
                <input
                  inputMode="numeric"
                  value={priceRange.max}
                  onChange={(event) => setPriceRange((current) => ({ ...current, max: event.target.value.replace(/\D/g, '') }))}
                  placeholder="Đến"
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="button"
                onClick={applyPriceRange}
                className="mt-3 h-10 w-full rounded-md bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Áp dụng
              </button>
            </FilterPanel>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Xóa bộ lọc
            </button>
          </aside>

          <section>
            <div className="mb-4 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {loading ? (
                  'Đang tải sản phẩm...'
                ) : (
                  <>
                    Tìm thấy <span className="font-bold text-slate-950">{meta.total || products.length}</span> sản phẩm
                    {selectedCategory ? <span> trong {selectedCategory.name}</span> : null}
                  </>
                )}
              </div>

              <label className="relative block sm:w-56">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={query.sortBy}
                  onChange={(event) =>
                    setQuery((current) => ({
                      ...current,
                      page: 1,
                      sortBy: event.target.value as SortBy,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-orange-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-lg bg-white" />
                ))}
              </div>
            ) : products.length ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {meta.totalPages > 1 ? (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                    <PageButton
                      disabled={query.page <= 1}
                      onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                    >
                      Trước
                    </PageButton>
                    {pageNumbers.map((page) => (
                      <PageButton
                        key={page}
                        active={page === query.page}
                        onClick={() => setQuery((current) => ({ ...current, page }))}
                      >
                        {page}
                      </PageButton>
                    ))}
                    <PageButton
                      disabled={query.page >= meta.totalPages}
                      onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                    >
                      Sau
                    </PageButton>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
                <h2 className="text-lg font-bold text-slate-900">Không tìm thấy sản phẩm</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Hãy thử từ khóa khác, đổi danh mục hoặc bỏ bớt khoảng giá.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProductListShell() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-40 animate-pulse rounded-lg bg-white" />
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-lg bg-white" />
            <div className="h-40 animate-pulse rounded-lg bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FilterPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-10 min-w-10 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
