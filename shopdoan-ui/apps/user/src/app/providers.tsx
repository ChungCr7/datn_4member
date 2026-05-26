'use client';

import { SessionProvider } from 'next-auth/react';
import { NextIntlClientProvider } from 'next-intl';
import { CartProvider } from '@/context/CartContext';
import messages from '../../messages/vi.json';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <CartProvider>{children}</CartProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
