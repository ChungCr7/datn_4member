'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { forgotPassword, verifyResetCode, changePassword } from '@/services/authService';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'verify' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes

  // Auto-fill if coming from email link
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    if (emailParam && codeParam) {
      setEmail(emailParam);
      setCode(codeParam);
      setStep('verify');
      // Auto-verify code from link
      handleVerifyCode(emailParam, codeParam);
    }
  }, [searchParams]);

  // Timer countdown
  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setStep('verify');
      setTimer(600);
      setCode('');
      setCodeVerified(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (emailParam?: string, codeParam?: string) => {
    const emailToVerify = emailParam || email;
    const codeToVerify = codeParam || code;

    if (!codeToVerify) {
      setError('Vui lòng nhập mã xác minh');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyResetCode(emailToVerify, codeToVerify);
      setCodeVerified(true);
      setStep('password');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã xác minh không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      await changePassword({ email, code, password, confirmPassword });
      setStep('success');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
          {/* STEP 1: Email */}
          {step === 'email' && (
            <>
              <h1 className="text-3xl font-bold mb-2">Quên mật khẩu</h1>
              <p className="text-gray-600 mb-6 text-sm">
                Bước 1/3: Nhập email đã đăng ký để nhận mã xác minh
              </p>
              {error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 mb-4 text-sm">
                  {error}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-3xl border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="your@email.com"
                    suppressHydrationWarning
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-primary px-5 py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  suppressHydrationWarning
                >
                  {loading ? 'Đang gửi...' : 'Gửi mã xác minh'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: Verify Code */}
          {step === 'verify' && !codeVerified && (
            <>
              <h1 className="text-3xl font-bold mb-2">Nhập mã xác minh</h1>
              <p className="text-gray-600 mb-2 text-sm">
                Bước 2/3: Kiểm tra email <strong>{email}</strong> để lấy mã
              </p>
              <p className="text-orange-600 mb-6 text-sm font-semibold">
                ⏱️ Hết hạn trong: {formatTime(timer)}
              </p>
              {error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 mb-4 text-sm">
                  {error}
                </div>
              )}
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyCode();
                }}
              >
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-foreground">
                    Mã xác minh (6 chữ số)
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.slice(0, 6))}
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="mt-2 block w-full rounded-3xl border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center text-2xl tracking-widest font-bold"
                    placeholder="000000"
                    suppressHydrationWarning
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full rounded-full bg-primary px-5 py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  suppressHydrationWarning
                >
                  {loading ? 'Đang xác minh...' : 'Xác minh mã'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                  }}
                  className="w-full rounded-full border border-gray-300 px-5 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
                  suppressHydrationWarning
                >
                  Quay lại
                </button>
              </form>
            </>
          )}

          {/* STEP 3: Change Password */}
          {step === 'password' && codeVerified && (
            <>
              <h1 className="text-3xl font-bold mb-2">Đặt mật khẩu mới</h1>
              <p className="text-gray-600 mb-6 text-sm">
                Bước 3/3: Nhập mật khẩu mới cho tài khoản của bạn
              </p>
              {error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 mb-4 text-sm">
                  {error}
                </div>
              )}
              <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Mật khẩu mới
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-2 block w-full rounded-3xl border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    suppressHydrationWarning
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-2 block w-full rounded-3xl border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Xác nhận mật khẩu"
                    suppressHydrationWarning
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-primary px-5 py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  suppressHydrationWarning
                >
                  {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('verify');
                    setPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="w-full rounded-full border border-gray-300 px-5 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
                  suppressHydrationWarning
                >
                  Quay lại
                </button>
              </form>
            </>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-4">✅ Thành công!</h1>
                <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-green-700 mb-6">
                  <p className="font-semibold mb-2">Mật khẩu của bạn đã được đặt lại thành công</p>
                  <p className="text-sm">Bạn có thể đăng nhập ngay bây giờ với mật khẩu mới</p>
                </div>
                <a
                  href="/auth/signin"
                  className="block w-full rounded-full bg-primary px-5 py-3 text-white font-semibold hover:bg-primary/90 text-center transition"
                >
                  Đi đến trang đăng nhập
                </a>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
