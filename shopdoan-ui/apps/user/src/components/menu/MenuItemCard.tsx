'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type MenuItemCardProps = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  menuItemId?: number;
  rating?: number;
  isPopular?: boolean;
  isVegetarian?: boolean;
  onAddToCart: (item: {
    id: string;
    name: string;
    price: number;
    image: string;
    menuItemId?: number;
  }) => void;
};

export default function MenuItemCard({
  id,
  name,
  description,
  price,
  image,
  menuItemId,
  rating,
  isPopular,
  isVegetarian,
  onAddToCart,
}: MenuItemCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex">
        <div className="relative h-28 w-28 flex-shrink-0 sm:h-32 sm:w-36">
          <Image src={image} alt={name} fill className="object-cover" />
          {isPopular && (
            <div className="absolute left-2 top-2 rounded bg-red-500 px-2 py-1 text-xs text-white">
              Pho bien
            </div>
          )}
          {isVegetarian && (
            <div className="absolute bottom-2 left-2 rounded bg-green-500 px-2 py-1 text-xs text-white">
              Chay
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex h-full flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <Link href={`/menu/${id}`} className="mb-1 line-clamp-1 text-base font-semibold text-slate-950 hover:text-emerald-700">
                {name}
              </Link>
              <p className="mb-2 line-clamp-2 text-sm leading-6 text-slate-600">{description}</p>

              {rating && (
                <div className="flex items-center text-sm">
                  <Star className="mr-1 h-3 w-3 fill-current text-yellow-400" />
                  <span className="text-slate-600">{rating}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <p className="text-lg font-bold text-primary">{formatCurrency(price)}</p>
              <button
                onClick={() =>
                  onAddToCart({
                    id,
                    name,
                    price,
                    image,
                    menuItemId: menuItemId || Number(id),
                  })
                }
                className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white transition-colors hover:bg-emerald-700"
              aria-label="Thêm vào giỏ hàng"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
