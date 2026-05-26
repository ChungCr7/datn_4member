import Link from 'next/link';
import { Globe, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-orange-400">ShopDoan</h3>
            <p className="text-sm leading-6 text-slate-300">
              Sàn thương mại điện tử đa ngành hàng, kết nối người mua với các shop được duyệt trên hệ thống.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 transition hover:text-white" aria-label="Website">
                <Globe className="h-5 w-5" />
              </a>
              <a href="tel:19000000" className="text-slate-400 transition hover:text-white" aria-label="Điện thoại">
                <Phone className="h-5 w-5" />
              </a>
              <a href="mailto:support@shopdoan.local" className="text-slate-400 transition hover:text-white" aria-label="Email">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterColumn
            title="Mua sắm"
            links={[
              ['Sản phẩm', '/menu'],
              ['Giỏ hàng', '/cart'],
              ['Thanh toán', '/checkout'],
              ['Đơn hàng', '/orders'],
            ]}
          />
          <FooterColumn
            title="Người bán"
            links={[
              ['Đăng ký bán hàng', '/seller/register'],
              ['Hồ sơ shop', '/profile'],
              ['Quản lý đơn', '/orders'],
              ['Chính sách bán hàng', '/chatbot'],
            ]}
          />
          <FooterColumn
            title="Hỗ trợ"
            links={[
              ['Chatbot mua sắm', '/chatbot'],
              ['Tài khoản', '/profile'],
              ['Theo dõi đơn', '/orders'],
              ['Chính sách đổi trả', '/chatbot'],
            ]}
          />
        </div>

        <div className="mt-8 border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2026 ShopDoan. Đồ án marketplace.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h4 className="mb-4 font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-slate-300">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
