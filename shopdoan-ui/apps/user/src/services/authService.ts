import { post } from '@/utils/httpRequest';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  role: string;
}

export const login = async (payload: LoginPayload) => {
  return post<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/login', payload);
};

export const register = async (payload: RegisterPayload) => {
  return post('/auth/register', payload);
};

export const verifyRegistrationCode = async (email: string, code: string) => {
  return post('/auth/verify-registration', { email, code });
};

export const resendActivation = async (email: string) => {
  return post('/auth/resend-activation', { email });
};

export const refresh = async (refreshToken: string) => {
  return post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
};

export const forgotPassword = async (email: string) => {
  return post('/auth/forgot-password', { email });
};

export const verifyResetCode = async (email: string, code: string) => {
  return post('/auth/verify-code', { email, code });
};

export const changePassword = async (payload: { email: string; code: string; password: string; confirmPassword: string }) => {
  return post('/auth/change-password', payload);
};
