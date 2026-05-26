'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SellerShell from '@/components/seller/SellerShell';
import {
  getSellerShopConversation,
  getSellerShopConversations,
  sendSellerShopMessage,
  ShopConversation,
} from '@/services/shopChatService';

export default function SellerChatsPage() {
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [conversations, setConversations] = useState<ShopConversation[]>([]);
  const [selected, setSelected] = useState<ShopConversation | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getSellerShopConversations(accessToken)
      .then(async (items) => {
        setConversations(items);
        if (items[0]) setSelected(await getSellerShopConversation(accessToken, items[0].id));
      })
      .finally(() => setLoading(false));
  }, [status, accessToken]);

  const selectConversation = async (id: number) => {
    if (!accessToken) return;
    setSelected(await getSellerShopConversation(accessToken, id));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selected?.id || !message.trim()) return;
    const text = message.trim();
    setMessage('');
    const next = await sendSellerShopMessage(accessToken, selected.id, text);
    setSelected(next);
    setConversations(await getSellerShopConversations(accessToken));
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Tin nhắn khách hàng</h1>
          <p className="mt-1 text-sm text-slate-500">Trả lời các cuộc trò chuyện người mua gửi tới shop.</p>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải tin nhắn...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-lg bg-white p-3 shadow-sm">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectConversation(item.id)}
                  className={`mb-2 w-full rounded-md p-3 text-left ${selected?.id === item.id ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50'}`}
                >
                  <p className="font-bold">{item.user?.fullName || item.user?.name || item.user?.email || `Khách #${item.user?.id}`}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{item.lastMessage || 'Chưa có tin nhắn'}</p>
                </button>
              ))}
              {!conversations.length ? <p className="p-5 text-center text-sm text-slate-500">Chưa có cuộc trò chuyện.</p> : null}
            </aside>

            <section className="rounded-lg bg-white p-4 shadow-sm">
              {selected ? (
                <>
                  <div className="mb-3 border-b border-slate-100 pb-3">
                    <h2 className="font-bold">{selected.user?.fullName || selected.user?.name || selected.user?.email || 'Khách hàng'}</h2>
                  </div>
                  <div className="h-[520px] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
                    {(selected.messages || []).map((item) => {
                      const mine = item.senderRole === 'seller' || item.senderRole === 'admin' || item.senderRole === 'root';
                      return (
                        <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[76%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-orange-500 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                            <p className="whitespace-pre-line">{item.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={submit} className="mt-3 flex gap-2">
                    <input value={message} onChange={(event) => setMessage(event.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500" placeholder="Nhập phản hồi..." />
                    <button disabled={!message.trim()} className="h-11 rounded-md bg-orange-500 px-5 font-bold text-white disabled:opacity-60">Gửi</button>
                  </form>
                </>
              ) : (
                <div className="grid h-[520px] place-items-center text-sm text-slate-500">Chọn một cuộc trò chuyện.</div>
              )}
            </section>
          </div>
        )}
      </div>
    </SellerShell>
  );
}
