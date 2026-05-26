'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageCircle, Package, Star, Store, Truck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { Product } from '@/services/marketplaceService';
import { getPublicSellerProfile, PublicSellerProfile } from '@/services/shopService';
import { getShopConversation, sendShopMessage, ShopConversation } from '@/services/shopChatService';

export default function ShopProfilePage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = String(params?.id || '');
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [seller, setSeller] = useState<PublicSellerProfile | null>(null);
  const [stats, setStats] = useState({ activeProducts: 0, soldCount: 0, ratingAverage: 0, ratingCount: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [conversation, setConversation] = useState<ShopConversation | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setError('');

    getPublicSellerProfile(sellerId)
      .then((data) => {
        setSeller(data.seller);
        setStats(data.stats);
        setProducts(data.products);
      })
      .catch((error: any) => setError(error?.response?.data?.message || error?.message || 'Không tải được hồ sơ shop.'))
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    if (!accessToken || !seller?.id) return;
    setChatLoading(true);
    getShopConversation(accessToken, seller.id)
      .then(setConversation)
      .catch(() => setConversation(null))
      .finally(() => setChatLoading(false));
  }, [accessToken, seller?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seller?.id || !accessToken || !message.trim()) return;

    const text = message.trim();
    setMessage('');
    setChatLoading(true);
    try {
      const next = await sendShopMessage(accessToken, seller.id, text);
      setConversation(next);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="h-96 animate-pulse rounded-lg bg-white" />
        ) : error || !seller ? (
          <div className="rounded-lg bg-white p-10 text-center text-sm font-semibold text-red-600">{error || 'Không tìm thấy shop.'}</div>
        ) : (
          <>
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div
                className="h-52 bg-slate-200 bg-cover bg-center"
                style={{ backgroundImage: seller.banner ? `url(${seller.banner})` : 'linear-gradient(135deg, #f97316, #fb7185)' }}
              />
              <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between">
                <div className="flex gap-4">
                  <img
                    src={seller.logo || 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=200&q=80'}
                    alt={seller.shopName}
                    className="-mt-14 h-24 w-24 rounded-lg border-4 border-white object-cover shadow-sm"
                  />
                  <div>
                    <h1 className="text-3xl font-black">{seller.shopName}</h1>
                    <p className="mt-1 text-sm text-slate-500">@{seller.shopSlug}</p>
                    <p className="mt-2 text-sm text-slate-600">{seller.address || 'Shop chưa cập nhật địa chỉ.'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => accessToken ? document.getElementById('shop-chat-box')?.scrollIntoView({ behavior: 'smooth' }) : router.push(`/auth/signin?callbackUrl=/shop/${seller.id}`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Trò chuyện với shop
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/menu?sellerId=${seller.id}`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Store className="h-4 w-4" />
                    Xem sản phẩm
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <Stat icon={<Package />} label="Sản phẩm" value={stats.activeProducts} />
              <Stat icon={<Truck />} label="Đã bán" value={stats.soldCount} />
              <Stat icon={<Star />} label="Đánh giá" value={stats.ratingAverage ? stats.ratingAverage.toFixed(1) : 'Mới'} />
              <Stat icon={<Store />} label="Hồ sơ" value="Đã duyệt" />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-bold">Tiểu sử shop</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {seller.description || 'Shop chưa cập nhật tiểu sử. Bạn có thể trò chuyện trực tiếp để hỏi thêm thông tin sản phẩm, bảo hành và vận chuyển.'}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <p><span className="font-bold text-slate-900">Liên hệ:</span> {seller.phone || 'Chưa cập nhật'}</p>
                    <p><span className="font-bold text-slate-900">Người bán:</span> {seller.user?.fullName || seller.user?.name || seller.user?.email || 'ShopDoan Seller'}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Sản phẩm nổi bật</h2>
                    <button onClick={() => router.push(`/menu?sellerId=${seller.id}`)} className="text-sm font-bold text-orange-600">Xem tất cả</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {products.slice(0, 6).map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              </div>

              <aside id="shop-chat-box" className="h-fit rounded-lg bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <MessageCircle className="h-5 w-5 text-orange-500" />
                  Trò chuyện với shop
                </h2>
                {!accessToken ? (
                  <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                    Bạn cần đăng nhập để gửi tin nhắn cho shop.
                    <button onClick={() => router.push(`/auth/signin?callbackUrl=/shop/${seller.id}`)} className="mt-3 h-10 w-full rounded-md bg-slate-950 font-bold text-white">
                      Đăng nhập
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 h-96 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
                      {(conversation?.messages || []).map((item) => {
                        const mine = item.senderRole === 'user';
                        return (
                          <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-orange-500 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                              <p className="whitespace-pre-line">{item.content || item.message}</p>
                              <p className={`mt-1 text-[10px] ${mine ? 'text-orange-50' : 'text-slate-400'}`}>{formatTime(item.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                      {!conversation?.messages?.length ? <p className="py-16 text-center text-sm text-slate-500">Hãy gửi lời chào tới shop.</p> : null}
                      <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={submitMessage} className="mt-3 flex gap-2">
                      <input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-orange-500"
                      />
                      <button disabled={chatLoading || !message.trim()} className="h-11 rounded-md bg-orange-500 px-4 text-sm font-bold text-white disabled:opacity-60">
                        Gửi
                      </button>
                    </form>
                  </>
                )}
              </aside>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
      <span className="text-orange-500 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
