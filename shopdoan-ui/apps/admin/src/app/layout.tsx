import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from './providers';
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopDoan Admin",
  description: "Admin dashboard for ShopDoan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="mdl-js" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
