'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Menu, Search, ShoppingCart, Store, User, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: session, status } = useSession();
  const { totalItems, clearCart } = useCart();
  const router = useRouter();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = search.trim();
    router.push(term ? `/menu?search=${encodeURIComponent(term)}` : '/menu');
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-orange-200 bg-white">
      <div className="bg-orange-500 text-white">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs sm:px-6 lg:px-8">
          <div className="hidden gap-4 sm:flex">
            <Link href="/seller/register" className="hover:underline">Kênh người bán</Link>
            <Link href="/chatbot" className="hover:underline">Chăm sóc khách hàng</Link>
          </div>
          <div className="ml-auto flex gap-4">
            <Link href="/orders" className="hover:underline">Theo dõi đơn hàng</Link>
            {!session ? <Link href="/auth/signup" className="hover:underline">Đăng ký</Link> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-orange-500 text-sm font-black text-white">
              SD
            </span>
            <span className="text-2xl font-black tracking-tight text-orange-600">ShopDoan</span>
          </Link>

          <form onSubmit={submitSearch} className="hidden flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm sản phẩm, thương hiệu và tên shop"
                className="h-11 w-full rounded-md border-2 border-orange-500 bg-white pl-10 pr-28 text-sm outline-none"
              />
              <button className="absolute right-1 top-1 h-9 rounded bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600">
                Tìm kiếm
              </button>
            </div>
          </form>

          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-md text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 ? (
              <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            ) : null}
          </Link>

          <div className="relative">
            {status === 'loading' ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
            ) : session ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((value) => !value)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white"
                  aria-label="Tài khoản"
                >
                  {session.user?.name?.charAt(0) || 'U'}
                </button>
                {isProfileOpen ? (
                  <div className="absolute right-0 z-50 mt-3 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                    <Link href="/profile" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setIsProfileOpen(false)}>
                      Hồ sơ cá nhân
                    </Link>
                    <Link href="/orders" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setIsProfileOpen(false)}>
                      Đơn hàng của tôi
                    </Link>
                    <Link href="/seller/register" className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setIsProfileOpen(false)}>
                      Đăng ký bán hàng
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await clearCart(false);
                        await signOut();
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex"
              >
                <User className="h-4 w-4" />
                Đăng nhập
              </Link>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-700 md:hidden"
            onClick={() => setIsMenuOpen((value) => !value)}
            aria-label="Mở menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="space-y-3 border-t border-slate-200 py-4 md:hidden">
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm sản phẩm"
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:bg-white"
              />
            </form>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/menu" className="rounded-md bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white" onClick={() => setIsMenuOpen(false)}>
                Sản phẩm
              </Link>
              <Link href="/seller/register" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setIsMenuOpen(false)}>
                <Store className="h-4 w-4" />
                Bán hàng
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {isProfileOpen ? <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} /> : null}
    </header>
  );
}
