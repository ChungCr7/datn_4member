import type { Metadata } from "next";
import { Providers } from './providers';
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopDoan - Sàn thương mại điện tử",
  description: "Marketplace đa ngành hàng cho người mua, người bán và admin quản lý sàn.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="mdl-js" suppressHydrationWarning>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
