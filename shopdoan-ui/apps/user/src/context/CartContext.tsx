'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  addCartItem,
  clearServerCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/services/cartService';

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  menuItemId?: number;
  menuItemOptionId?: number;
  productId?: number;
  variantId?: number;
  variantName?: string;
  stock?: number;
  seller?: { id: number; shopName: string; shopSlug: string };
  optionTitle?: string;
  note?: string | null;
};

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<boolean>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: (syncServer?: boolean) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_PREFIX = 'shopdoan_cart';
const LEGACY_STORAGE_KEY = 'shopdoan_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const userId = (session?.user as any)?.id;
  const storageKey = userId ? `${STORAGE_PREFIX}_${userId}` : null;

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated' || !accessToken || !storageKey) {
      setItems([]);
      clearCartStorage();
      return;
    }

    const cached = readStoredCart(storageKey);
    setItems(cached);

    let cancelled = false;
    getCart(accessToken)
      .then((data) => {
        if (!cancelled) setItems(data.items || []);
      })
      .catch(() => {
        showToast('Không tải được giỏ hàng. Vui lòng thử lại.', 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [status, accessToken, storageKey, showToast]);

  useEffect(() => {
    if (status === 'authenticated' && storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, status, storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requireLogin = () => {
    if (status === 'authenticated' && accessToken) return true;
    setItems([]);
    clearCartStorage();
    const callbackUrl = encodeURIComponent(pathname || '/menu');
    router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
    showToast('Vui lòng đăng nhập để dùng giỏ hàng.', 'error');
    return false;
  };

  const addItem = async (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    if (!requireLogin() || !accessToken) return false;

    const productId = item.productId || (!item.menuItemId ? Number(item.id) : undefined);
    if (!item.menuItemId && (!productId || Number.isNaN(productId))) {
      showToast('Thêm vào giỏ hàng thất bại', 'error');
      return false;
    }

    const optimisticKey = item.productId
      ? `product:${item.productId}:${item.variantId || 'base'}`
      : item.id;
    const previousItems = items;
    setItems((current) => upsertLocalCartItem(current, optimisticKey, item, quantity));
    showToast('Đã thêm vào giỏ hàng', 'success');

    try {
      const data = await addCartItem(accessToken, {
        menuItemId: item.menuItemId,
        menuItemOptionId: item.menuItemOptionId,
        productId,
        variantId: item.variantId,
        quantity: Math.max(1, quantity),
        note: item.note || undefined,
      });
      if (data.items) {
        setItems(data.items);
      }
      return true;
    } catch (error: any) {
      setItems(previousItems);
      showToast(error?.response?.data?.message || 'Thêm vào giỏ hàng thất bại', 'error');
      return false;
    }
  };

  const updateItem = async (id: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );

    if (!accessToken) return;
    try {
      const data = await updateCartItem(accessToken, id, quantity);
      setItems(data.items || []);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Không cập nhật được giỏ hàng', 'error');
      const data = await getCart(accessToken).catch(() => null);
      if (data) setItems(data.items || []);
    }
  };

  const removeItem = async (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    if (!accessToken) return;
    try {
      const data = await removeCartItem(accessToken, id);
      setItems(data.items || []);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Không xóa được sản phẩm khỏi giỏ', 'error');
    }
  };

  const clearCart = async (syncServer = true) => {
    setItems([]);
    clearCartStorage();
    if (syncServer && accessToken) {
      await clearServerCart(accessToken).catch(() => undefined);
    }
  };

  const totalItems = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, updateItem, removeItem, clearCart }}>
      {children}
      {toast ? (
        <div
          className={`fixed right-4 top-20 z-[70] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-xl ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

function readStoredCart(storageKey: string) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '[]') as CartItem[];
  } catch {
    return [];
  }
}

function clearCartStorage() {
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
    .forEach((key) => window.localStorage.removeItem(key));
}

function upsertLocalCartItem(
  current: CartItem[],
  key: string,
  item: Omit<CartItem, 'quantity'>,
  quantity: number,
) {
  const existing = current.find((entry) => entry.id === key);
  if (existing) {
    return current.map((entry) =>
      entry.id === key ? { ...entry, quantity: entry.quantity + quantity } : entry,
    );
  }

  return [
    {
      ...item,
      id: key,
      quantity,
    },
    ...current,
  ];
}
