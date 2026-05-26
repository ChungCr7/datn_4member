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

export const get = async <T = any>(url: string, config?: AxiosRequestConfig) => {
  const response = await apiClient.get<T>(url, config);
  return response.data;
};

export const post = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
};

export const put = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
};

export const patch = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
};

export const del = async <T = any>(url: string, config?: AxiosRequestConfig) => {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
};

export const localClient: AxiosInstance = axios.create();
