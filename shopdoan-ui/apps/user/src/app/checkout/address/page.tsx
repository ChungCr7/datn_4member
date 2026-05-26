'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  CheckoutAddress,
  readAddresses,
  readSelectedAddress,
  writeAddresses,
  writeSelectedAddress,
} from '@/lib/checkoutStorage';
import { ChevronLeft, MapPin, Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
};

export default function CheckoutAddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const stored = readAddresses();
    const selected = readSelectedAddress();
    setAddresses(stored);
    setSelectedId(selected?.id || stored.find((item) => item.isDefault)?.id || stored[0]?.id || '');
  }, []);

  const saveAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.receiverName.trim() || !form.receiverPhone.trim() || !form.receiverAddress.trim()) return;

    const nextAddress: CheckoutAddress = {
      id: `${Date.now()}`,
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      receiverAddress: form.receiverAddress.trim(),
      isDefault: addresses.length === 0,
    };
    const nextAddresses = [...addresses, nextAddress];
    setAddresses(nextAddresses);
    setSelectedId(nextAddress.id);
    writeAddresses(nextAddresses);
    writeSelectedAddress(nextAddress);
    setForm(emptyForm);
    setShowForm(false);
  };

  const selectAddress = (address: CheckoutAddress) => {
    setSelectedId(address.id);
    writeSelectedAddress(address);
  };

  const removeAddress = (id: string) => {
    const nextAddresses = addresses.filter((address) => address.id !== id);
    setAddresses(nextAddresses);
    writeAddresses(nextAddresses);
    if (selectedId === id) {
      const nextSelected = nextAddresses[0];
      setSelectedId(nextSelected?.id || '');
      if (nextSelected) writeSelectedAddress(nextSelected);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/checkout" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
          <ChevronLeft className="h-4 w-4" />
          Quay lại thanh toán
        </Link>

        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Địa chỉ nhận hàng</h1>
              <p className="mt-1 text-sm text-slate-500">
                Bạn có thể lưu nhiều người nhận, số điện thoại và địa chỉ khác nhau.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Thêm địa chỉ
            </button>
          </div>

          {showForm ? (
            <form onSubmit={saveAddress} className="mt-5 grid gap-4 rounded-lg border border-orange-100 bg-orange-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Tên người nhận
                  <input
                    value={form.receiverName}
                    onChange={(event) => setForm((current) => ({ ...current, receiverName: event.target.value }))}
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
                    required
                  />
                </label>
                <label className="text-sm font-semibold">
                  Số điện thoại
                  <input
                    value={form.receiverPhone}
                    onChange={(event) => setForm((current) => ({ ...current, receiverPhone: event.target.value }))}
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
                    required
                  />
                </label>
              </div>
              <label className="text-sm font-semibold">
                Địa chỉ nhận hàng
                <textarea
                  value={form.receiverAddress}
                  onChange={(event) => setForm((current) => ({ ...current, receiverAddress: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-orange-500"
                  required
                />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">
                  Hủy
                </button>
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                  Lưu địa chỉ
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-5 space-y-3">
            {addresses.length ? (
              addresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-lg border p-4 ${
                    selectedId === address.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    <MapPin className="mt-1 h-5 w-5 shrink-0 text-orange-500" />
                    <button type="button" onClick={() => selectAddress(address)} className="min-w-0 flex-1 text-left">
                      <p className="font-bold">{address.receiverName} - {address.receiverPhone}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{address.receiverAddress}</p>
                      {selectedId === address.id ? <p className="mt-2 text-sm font-semibold text-orange-600">Đang chọn</p> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(address.id)}
                      className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Xóa địa chỉ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ đầu tiên.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push('/checkout')}
            className="mt-5 w-full rounded-md bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
          >
            Dùng địa chỉ này
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
