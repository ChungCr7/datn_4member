import { AxiosRequestConfig } from 'axios';
import { del, get, patch, post } from '@/utils/httpRequest';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

interface UsersResponse {
  users: ApiUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getUsers = async (
  accessToken: string,
  page = 1,
  limit = 10,
  params: Record<string, any> = {},
): Promise<UsersResponse> => {
  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      page,
      limit,
      ...params,
    },
  };

  return get<UsersResponse>('/users', config);
};

export const createUser = (accessToken: string, data: Partial<ApiUser> & { password?: string; roleId?: number; roleName?: string; isActive?: boolean }) =>
  post<ApiUser>('/users', data, authConfig(accessToken));

export const updateUser = (accessToken: string, id: number, data: Partial<ApiUser> & { roleId?: number; roleName?: string; isActive?: boolean; password?: string }) =>
  patch<ApiUser>(`/users/${id}`, data, authConfig(accessToken));

export const deleteUser = (accessToken: string, id: number) =>
  del(`/users/${id}`, authConfig(accessToken));

const authConfig = (accessToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});
