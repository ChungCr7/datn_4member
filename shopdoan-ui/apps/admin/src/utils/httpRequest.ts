import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_URL } from '@/lib/config';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers = config.headers || {};
    delete (config.headers as any)['Content-Type'];
    delete (config.headers as any)['content-type'];
  }
  return config;
});

export const setAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

const normalizeAxiosError = (error: any): Error => {
  // AxiosError type guard without importing the type.
  const isAxios = typeof error === 'object' && error !== null && (error as any).isAxiosError;

  if (!isAxios) {
    return error instanceof Error ? error : new Error('Unknown error');
  }

  const axiosErr = error as any;
  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;
  const message = axiosErr.message || 'Network Error';

  // Common hints for browser failures.
  const hintParts: string[] = [];
  if (!axiosErr.response) {
    hintParts.push(
      'No response received (possible API is down, wrong baseURL/port, CORS blocked, or network unreachable).',
    );
  }

  if (status) {
    hintParts.push(`HTTP ${status}`);
  }

  const dataStr = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';

  const hint = hintParts.length ? `\nHint: ${hintParts.join(' ')}` : '';
  return new Error(`${message}${status ? ` (HTTP ${status})` : ''}${dataStr ? ` | Response: ${dataStr}` : ''}${hint}`);
};

export const get = async <T = any>(url: string, config?: AxiosRequestConfig) => {
  try {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

export const post = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  try {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

export const put = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  try {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

export const patch = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  try {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

export const del = async <T = any>(url: string, config?: AxiosRequestConfig) => {
  try {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
};

