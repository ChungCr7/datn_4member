'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, Phone, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { register, resendActivation, verifyRegistrationCode } from '@/services/authService';

const RESEND_COOLDOWN_SECONDS = 60;

type ApiErrorResponse = {
  response?: {
    data?: {
      message?: string;
      retryAfter?: number;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as ApiErrorResponse).response;
    return response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getRetryAfter(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return 0;
  }

  const retryAfter = (error as ApiErrorResponse).response?.data?.retryAfter;
  return typeof retryAfter === 'number' && retryAfter > 0 ? Math.ceil(retryAfter) : 0;
}

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    if (step !== 'verify' || resendCooldown <= 0) return;

    const timerId = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [step, resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mat khau xac nhan khong khop');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      setStep('verify');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('Ma xac thuc da duoc gui den email cua ban.');
    } catch (error: unknown) {
      const retryAfter = getRetryAfter(error);
      if (retryAfter > 0) {
        setStep('verify');
        setResendCooldown(retryAfter);
      }
      setError(getErrorMessage(error, 'Dang ky that bai'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!verificationCode.trim()) {
      setError('Vui long nhap ma xac thuc');
      return;
    }

    setIsLoading(true);
    try {
      await verifyRegistrationCode(formData.email, verificationCode.trim());
      router.push('/auth/signin?verified=1');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Xac thuc email that bai'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setMessage('');
    setIsResending(true);

    try {
      await resendActivation(formData.email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage('Ma xac thuc moi da duoc gui den email cua ban.');
    } catch (error: unknown) {
      const retryAfter = getRetryAfter(error);
      if (retryAfter > 0) {
        setResendCooldown(retryAfter);
      }
      setError(getErrorMessage(error, 'Khong the gui lai ma'));
    } finally {
      setIsResending(false);
    }
  };

  const isResendDisabled = isResending || resendCooldown > 0;
  const resendLabel =
    resendCooldown > 0
      ? `Gui lai sau ${resendCooldown}s`
      : isResending
        ? 'Dang gui...'
        : 'Gui lai ma';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {step === 'form' ? 'Tao tai khoan' : 'Xac thuc email'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {step === 'form'
              ? 'Dang ky tai khoan khach hang de dat mon nhanh hon.'
              : `Nhap ma da gui den ${formData.email}.`}
          </p>
        </div>

        <form
          onSubmit={step === 'form' ? handleSubmit : handleVerify}
          className="space-y-5 rounded-lg border bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {step === 'verify' ? (
            <>
              <label className="block text-sm font-medium text-foreground">
                Ma xac thuc
                <span className="relative mt-1 block">
                  <ShieldCheck className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="verificationCode"
                    inputMode="numeric"
                    required
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 tracking-[0.35em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="123456"
                    maxLength={6}
                  />
                </span>
              </label>

              {resendCooldown > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Ban co the gui lai ma sau {resendCooldown}s.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Dang xac thuc...' : 'Xac thuc email'}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-muted hover:text-foreground"
                >
                  Sua thong tin
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResendDisabled}
                  className="inline-flex min-w-[132px] items-center justify-center gap-1 rounded-lg border border-primary/20 px-3 py-2 font-medium text-primary transition hover:bg-primary/5 hover:text-primary/80 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                >
                  <RotateCcw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                  {resendLabel}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-foreground">
                Ho ten
                <span className="relative mt-1 block">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Nguyen Van A"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Email
                <span className="relative mt-1 block">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="you@example.com"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-foreground">
                So dien thoai
                <span className="relative mt-1 block">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0987654321"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Mat khau
                <span className="relative mt-1 block">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Password@123"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    aria-label="An hien mat khau"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Xac nhan mat khau
                <span className="relative mt-1 block">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Password@123"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    aria-label="An hien xac nhan mat khau"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Dang tao tai khoan...' : 'Dang ky'}
              </button>

              <p className="text-center text-sm text-muted">
                Da co tai khoan?{' '}
                <Link href="/auth/signin" className="font-medium text-primary hover:text-primary/80">
                  Dang nhap
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
