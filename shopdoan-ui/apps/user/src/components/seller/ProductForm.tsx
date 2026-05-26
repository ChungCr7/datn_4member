'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Category, getCategories, Product } from '@/services/marketplaceService';
import { ProductPayload } from '@/services/sellerProductService';

type ProductFormProps = {
  initialProduct?: Product;
  submitting?: boolean;
  onSubmit: (data: ProductPayload) => void;
};

export default function ProductForm({ initialProduct, submitting, onSubmit }: ProductFormProps) {
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

      <TextField label="Ảnh sản phẩm URL" value={form.imageUrl} onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} />

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

      <button disabled={submitting} className="h-11 rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600 disabled:opacity-60">
        {submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
      </button>
    </form>
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
