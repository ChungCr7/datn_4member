import { post } from '@/utils/httpRequest';
import { AxiosRequestConfig } from 'axios';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const login = async (data: LoginDto): Promise<AuthResponse> => {
  try {
    const response = await post<AuthResponse>('/auth/login', data);
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const refresh = async (refreshToken: string): Promise<AuthResponse> => {
  return post<AuthResponse>('/auth/refresh', { refreshToken });
};

export const register = async (data: any): Promise<AuthResponse> => {
  try {
    const response = await post<AuthResponse>('/auth/register', data);
    return response;
  } catch (error) {
    console.error('Register failed:', error);
    throw error;
  }
};

export const changePassword = async (accessToken: string, data: any): Promise<any> => {
  try {
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await post('/auth/change-password', data, config);
    return response;
  } catch (error) {
    console.error('Change password failed:', error);
    throw error;
  }
};
