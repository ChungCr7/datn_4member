'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifyRegistrationCode } from '@/services/authService';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const codeParam = searchParams.get('code');
  const hasValidParams = Boolean(emailParam && codeParam);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    hasValidParams ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    hasValidParams
      ? 'Dang xac thuc email...'
      : 'Lien ket xac thuc khong hop le hoac bi thieu thong tin.',
  );

  useEffect(() => {
    if (!emailParam || !codeParam) return;

    let cancelled = false;

    verifyRegistrationCode(emailParam, codeParam)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        setMessage('Email cua ban da duoc xac thuc thanh cong.');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const apiMessage: unknown =
          error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { data?: { message?: string } } }).response?.data
            ?.message;

        setStatus('error');
        setMessage(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Lien ket xac thuc khong hop le hoac da het han.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [emailParam, codeParam]);

  const Icon =
    status === 'loading' ? Loader2 : status === 'success' ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <Icon
          className={`mx-auto h-12 w-12 ${
            status === 'loading'
              ? 'animate-spin text-primary'
              : status === 'success'
                ? 'text-emerald-600'
                : 'text-red-600'
          }`}
        />
        <h1 className="mt-5 text-2xl font-bold text-foreground">
          {status === 'success'
            ? 'Xac thuc thanh cong'
            : status === 'error'
              ? 'Khong the xac thuc'
              : 'Dang xac thuc'}
        </h1>
        <p className="mt-2 text-sm text-muted">{message}</p>

        <div className="mt-6 flex flex-col gap-3">
          {status === 'success' ? (
            <Link
              href="/auth/signin?verified=1"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Dang nhap
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Quay lai dang ky
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
