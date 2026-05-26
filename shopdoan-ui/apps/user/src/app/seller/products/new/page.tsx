'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SellerShell from '@/components/seller/SellerShell';
import ProductForm from '@/components/seller/ProductForm';
import { createSellerProduct, ProductPayload } from '@/services/sellerProductService';

export default function NewSellerProductPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (data: ProductPayload) => {
    if (!accessToken) return router.push('/auth/signin?callbackUrl=/seller/products/new');
    setSubmitting(true);
    setError('');
    try {
      await createSellerProduct(accessToken, data);
      router.push('/seller/products');
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không tạo được sản phẩm. Hãy kiểm tra hồ sơ người bán đã được duyệt chưa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Tạo sản phẩm mới</h1>
          <p className="mt-1 text-sm text-slate-500">Shop đã được duyệt mới có thể đăng sản phẩm.</p>
        </div>
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <ProductForm submitting={submitting} onSubmit={submit} />
      </div>
    </SellerShell>
  );
}
