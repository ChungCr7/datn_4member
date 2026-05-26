'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, MessageCircle, Package, PlusCircle, ShoppingBag, Store } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const navItems = [
  { href: '/seller', label: 'Tổng quan', icon: BarChart3 },
  { href: '/seller/products', label: 'Sản phẩm', icon: Package },
  { href: '/seller/products/new', label: 'Tạo sản phẩm', icon: PlusCircle },
  { href: '/seller/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { href: '/seller/chats', label: 'Tin nhắn', icon: MessageCircle },
  { href: '/seller/register', label: 'Hồ sơ shop', icon: Store },
];

export default function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg bg-white p-3 shadow-sm">
          <div className="mb-3 px-3 py-2">
            <p className="text-xs font-bold uppercase text-orange-500">Kênh người bán</p>
            <h1 className="mt-1 text-lg font-black">Seller Center</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    active ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
      <Footer />
    </div>
  );
}
