'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SellerShell from '@/components/seller/SellerShell';
import ProductForm from '@/components/seller/ProductForm';
import { getProductById, Product } from '@/services/marketplaceService';
import { ProductPayload, updateSellerProduct } from '@/services/sellerProductService';

export default function EditSellerProductPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const productId = Number(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!productId) return;
    getProductById(productId)
      .then(setProduct)
      .catch(() => setError('Không tải được sản phẩm.'));
  }, [productId]);

  const submit = async (data: ProductPayload) => {
    if (!accessToken) return router.push('/auth/signin?callbackUrl=/seller/products');
    setSubmitting(true);
    setError('');
    try {
      await updateSellerProduct(accessToken, productId, data);
      router.push('/seller/products');
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không cập nhật được sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SellerShell>
      <div className="space-y-5">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold">Sửa sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin, giá bán, tồn kho và phân loại sản phẩm.</p>
        </div>
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p> : null}
        {product ? (
          <ProductForm initialProduct={product} submitting={submitting} onSubmit={submit} />
        ) : (
          <div className="rounded-lg bg-white p-8 text-slate-500 shadow-sm">Đang tải sản phẩm...</div>
        )}
      </div>
    </SellerShell>
  );
}
