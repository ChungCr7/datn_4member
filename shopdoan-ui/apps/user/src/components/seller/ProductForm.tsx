'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Category, getCategories, Product } from '@/services/marketplaceService';
import { ProductPayload } from '@/services/sellerProductService';
import { uploadImage } from '@/services/uploadService';

type ProductFormProps = {
  initialProduct?: Product;
  submitting?: boolean;
  onSubmit: (data: ProductPayload) => void;
};

export default function ProductForm({ initialProduct, submitting, onSubmit }: ProductFormProps) {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: initialProduct?.name || '',
    categoryId: initialProduct?.category?.id ? String(initialProduct.category.id) : '',
    description: initialProduct?.description || '',
    price: initialProduct?.price ? String(initialProduct.price) : '',
    salePrice: initialProduct?.salePrice ? String(initialProduct.salePrice) : '',
    stock: initialProduct?.stock ? String(initialProduct.stock) : '0',
    imageUrl: initialProduct?.images?.[0]?.imageUrl || '',
    status: (initialProduct?.status as 'DRAFT' | 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
    variantName: initialProduct?.variants?.[0]?.name || '',
    variantValues: initialProduct?.variants?.map((variant) => variant.value).filter(Boolean).join(', ') || '',
  });
  const [categoryError, setCategoryError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    getCategories(100)
      .then(setCategories)
      .catch(() => setCategoryError('Không tải được danh mục. Vui lòng kiểm tra API.'));
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const variants = form.variantName.trim() && form.variantValues.trim()
      ? form.variantValues
          .split(',')
          .map((value) => ({
            name: form.variantName.trim(),
            value: value.trim(),
            stock: Number(form.stock) || 0,
            priceDelta: 0,
          }))
          .filter((variant) => variant.value)
      : undefined;

    onSubmit({
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      description: form.description.trim(),
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      stock: Number(form.stock) || 0,
      status: form.status,
      images: form.imageUrl.trim() ? [{ imageUrl: form.imageUrl.trim(), sortOrder: 1 }] : undefined,
      variants,
    });
  };

  const uploadProductImage = async (file?: File) => {
    if (!file || !accessToken) return;
    setUploading(true);
    setUploadError('');

    try {
      const result = await uploadImage(accessToken, file, 'products');
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
    } catch (error: any) {
      setUploadError(error?.response?.data?.message || error?.message || 'Không upload được ảnh sản phẩm.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Tên sản phẩm" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
        <label className="text-sm font-semibold">
          Danh mục
          <select
            value={form.categoryId}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            required
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
          >
            <option value="">Chọn danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categoryError ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{categoryError}</p> : null}

      <label className="text-sm font-semibold">
        Mô tả
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          rows={4}
          className="mt-2 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-orange-500"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Giá bán" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: digits(value) }))} required />
        <TextField label="Giá khuyến mãi" value={form.salePrice} onChange={(value) => setForm((current) => ({ ...current, salePrice: digits(value) }))} />
        <TextField label="Tồn kho" value={form.stock} onChange={(value) => setForm((current) => ({ ...current, stock: digits(value) }))} required />
      </div>

      <ImagePicker
        label="Ảnh sản phẩm"
        imageUrl={form.imageUrl}
        uploading={uploading}
        onFileChange={uploadProductImage}
        onClear={() => setForm((current) => ({ ...current, imageUrl: '' }))}
      />
      {uploadError ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{uploadError}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Tên phân loại, ví dụ: Size, Màu" value={form.variantName} onChange={(value) => setForm((current) => ({ ...current, variantName: value }))} />
        <TextField label="Giá trị phân loại, cách nhau bằng dấu phẩy" value={form.variantValues} onChange={(value) => setForm((current) => ({ ...current, variantValues: value }))} />
      </div>

      <label className="text-sm font-semibold">
        Trạng thái
        <select
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as typeof form.status }))}
          className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
        >
          <option value="ACTIVE">Đang bán</option>
          <option value="DRAFT">Nháp</option>
          <option value="INACTIVE">Tạm ẩn</option>
        </select>
      </label>

      <button disabled={submitting || uploading} className="h-11 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600 disabled:opacity-60">
        {submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
      </button>
    </form>
  );
}

function ImagePicker({
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
      <div className="mt-2 flex flex-col gap-3 rounded-md border border-dashed border-slate-300 p-3 sm:flex-row sm:items-center">
        {imageUrl ? <img src={imageUrl} alt={label} className="h-24 w-24 rounded-md object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-md bg-slate-100 text-xs text-slate-500">Chưa có ảnh</div>}
        <div className="flex-1">
          <input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0])} disabled={uploading} />
          <p className="mt-2 text-xs font-normal text-slate-500">Ảnh sẽ được upload lên Cloudinary và lưu URL tự động.</p>
          {imageUrl ? (
            <button type="button" onClick={onClear} className="mt-2 text-sm font-bold text-red-600">
              Xóa ảnh
            </button>
          ) : null}
        </div>
        {uploading ? <span className="text-sm text-orange-600">Đang upload...</span> : null}
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-orange-500"
      />
    </label>
  );
}

function digits(value: string) {
  return value.replace(/\D/g, '');
}
