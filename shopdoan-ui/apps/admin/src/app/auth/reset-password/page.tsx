'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { USER_APP_URL } from '@/lib/config';

function ResetPasswordRedirectContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!USER_APP_URL) return;

    const query = searchParams.toString();
    window.location.replace(
      `${USER_APP_URL}/auth/reset-password${query ? `?${query}` : ''}`,
    );
  }, [searchParams, USER_APP_URL]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center text-gray-700">
      {USER_APP_URL
        ? 'Đang chuyển đến trang đặt lại mật khẩu...'
        : 'Thiếu cấu hình NEXT_PUBLIC_USER_APP_URL trong .env admin.'}
    </div>
  );
}

export default function ResetPasswordRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ResetPasswordRedirectContent />
    </Suspense>
  );
}
