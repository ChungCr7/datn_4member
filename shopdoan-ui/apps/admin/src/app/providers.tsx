'use client';

import { SessionProvider } from 'next-auth/react';
import { App as AntdApp, ConfigProvider } from 'antd';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f766e',
          borderRadius: 8,
          fontFamily: 'Arial, Helvetica, sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#f6f8fb',
            headerBg: '#ffffff',
            siderBg: '#10201d',
            triggerBg: '#10201d',
          },
          Menu: {
            darkItemBg: '#10201d',
            darkSubMenuItemBg: '#10201d',
            darkItemSelectedBg: '#0f766e',
          },
        },
      }}
    >
      <AntdApp>
        <SessionProvider>{children}</SessionProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
