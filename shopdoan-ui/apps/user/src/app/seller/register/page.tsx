'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SellerShell from '@/components/seller/SellerShell';
import { getMySellerProfile, registerSeller, SellerProfile, updateMySellerProfile } from '@/services/sellerService';
import { uploadImage } from '@/services/uploadService';

type SellerForm = {
  shopName: string;
  phone: string;
  address: string;
  description: string;
  logo: string;
  banner: string;
};

const emptyForm: SellerForm = {
  shopName: '',
  phone: '',
  address: '',
  description: '',
  logo: '',
  banner: '',
};

export default function SellerRegisterPage() {
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState<SellerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewSlug = useMemo(() => profile?.shopSlug || createPreviewSlug(form.shopName), [profile?.shopSlug, form.shopName]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    getMySellerProfile(accessToken)
      .then((data) => {
        setProfile(data);
        if (data) {
          setForm({
            shopName: data.shopName || '',
            phone: data.phone || '',
            address: data.address || '',
            description: data.description || '',
            logo: data.logo || '',
            banner: data.banner || '',
          });
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [status, accessToken]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const payload = compactPayload(form);
      const data = profile
        ? await updateMySellerProfile(accessToken, payload)
        : await registerSeller(accessToken, payload);

      if (data) setProfile(data);
      setMessage(profile ? 'Đã cập nhật hồ sơ shop.' : 'Đã gửi hồ sơ đăng ký. Vui lòng chờ admin duyệt.');
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không lưu được hồ sơ shop. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadShopImage = async (kind: 'logo' | 'banner', file?: File) => {
    if (!file || !accessToken) return;

    setUploading(kind);
    setError('');

    try {
      const folder = kind === 'logo' ? 'sellers/logos' : 'sellers/banners';
      const result = await uploadImage(accessToken, file, folder);
      setForm((current) => ({ ...current, [kind]: result.imageUrl }));
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Không upload được ảnh shop.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Hồ sơ người bán</h1>
              <p className="mt-2 text-sm text-slate-500">Người bán chỉ nhập tên shop và thông tin liên hệ. Slug shop sẽ được hệ thống tự tạo.</p>
            </div>
            {profile ? <StatusBadge status={profile.status} /> : null}
          </div>
          {previewSlug ? (
            <p className="mt-3 break-all rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Slug shop: <span className="font-bold text-slate-900">{previewSlug}</span>
            </p>
          ) : null}
        </div>

        {!accessToken && !loading ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-slate-600">Bạn cần đăng nhập để đăng ký người bán.</p>
            <Link href="/auth/signin?callbackUrl=/seller/register" className="rounded-md bg-orange-500 px-5 py-3 font-bold text-white">
              Đăng nhập
            </Link>
          </div>
        ) : loading ? (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải hồ sơ shop...</div>
        ) : (
          <>
            <ShopPreview form={form} profile={profile} />
            <form onSubmit={submit} className="grid gap-4 rounded-lg bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tên shop" value={form.shopName} onChange={(value) => setForm((current) => ({ ...current, shopName: value }))} required />
                <Input label="Số điện thoại shop" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <Input label="Địa chỉ shop" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
                <ImageInput
                  label="Logo shop"
                  imageUrl={form.logo}
                  uploading={uploading === 'logo'}
                  onFileChange={(file) => uploadShopImage('logo', file)}
                  onClear={() => setForm((current) => ({ ...current, logo: '' }))}
                />
                <ImageInput
                  label="Banner shop"
                  imageUrl={form.banner}
                  uploading={uploading === 'banner'}
                  onFileChange={(file) => uploadShopImage('banner', file)}
                  onClear={() => setForm((current) => ({ ...current, banner: '' }))}
                />
              </div>
              <label className="text-sm font-semibold">
                Mô tả shop
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-orange-500"
                />
              </label>
              {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
              {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}
              <button disabled={submitting || Boolean(uploading)} className="h-11 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600 disabled:opacity-60">
                {submitting ? 'Đang lưu...' : profile ? 'Cập nhật hồ sơ' : 'Gửi đăng ký'}
              </button>
            </form>
          </>
        )}
      </div>
    </SellerShell>
  );
}

function ShopPreview({ form, profile }: { form: SellerForm; profile: SellerProfile | null }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div
        className="h-36 bg-slate-200 bg-cover bg-center"
        style={{ backgroundImage: form.banner ? `url(${form.banner})` : 'linear-gradient(135deg, #f97316, #fb7185)' }}
      />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-4">
          <img
            src={form.logo || 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=200&q=80'}
            alt={form.shopName || 'Logo shop'}
            className="-mt-12 h-20 w-20 rounded-lg border-4 border-white object-cover shadow-sm"
          />
          <div>
            <p className="text-xl font-black">{form.shopName || 'Tên shop của bạn'}</p>
            <p className="mt-1 text-sm text-slate-500">{form.address || 'Chưa có địa chỉ shop'}</p>
            <p className="mt-1 text-sm text-slate-500">{form.phone || 'Chưa có số điện thoại'}</p>
          </div>
        </div>
        {profile ? <StatusBadge status={profile.status} /> : null}
      </div>
      {form.description ? <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{form.description}</p> : null}
    </div>
  );
}

function ImageInput({
  label,
  imageUrl,
  uploading,
  onFileChange,
  onClear,
}: {
  label: string;
  imageUrl: string;
  uploading: boolean;
  onFileChange: (file?: File) => void;
  onClear: () => void;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <div className="mt-2 flex min-h-28 gap-3 rounded-md border border-dashed border-slate-300 p-3">
        {imageUrl ? <img src={imageUrl} alt={label} className="h-20 w-20 rounded-md object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-md bg-slate-100 text-xs text-slate-500">Chưa có ảnh</div>}
        <div className="min-w-0 flex-1">
          <input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0])} disabled={uploading} />
          <p className="mt-2 text-xs font-normal text-slate-500">Upload ảnh lên Cloudinary, hệ thống tự lưu URL.</p>
          {imageUrl ? (
            <button type="button" onClick={onClear} className="mt-2 text-sm font-bold text-red-600">
              Xóa ảnh
            </button>
          ) : null}
          {uploading ? <p className="mt-2 text-sm font-semibold text-orange-600">Đang upload...</p> : null}
        </div>
      </div>
    </label>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500" />
    </label>
  );
}

function StatusBadge({ status }: { status: SellerProfile['status'] }) {
  const text: Record<SellerProfile['status'], string> = {
    PENDING: 'Đang chờ duyệt',
    APPROVED: 'Đã được duyệt',
    REJECTED: 'Bị từ chối',
    SUSPENDED: 'Tạm khóa',
  };
  const color: Record<SellerProfile['status'], string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
    SUSPENDED: 'bg-slate-100 text-slate-700',
  };
  return <span className={`inline-flex h-fit rounded px-3 py-1 text-sm font-bold ${color[status]}`}>{text[status]}</span>;
}

function compactPayload(form: SellerForm): SellerForm {
  return {
    shopName: form.shopName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    description: form.description.trim(),
    logo: form.logo.trim(),
    banner: form.banner.trim(),
  };
}

function createPreviewSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
