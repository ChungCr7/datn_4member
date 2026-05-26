import { AxiosRequestConfig } from 'axios';
import { get, patch } from '@/utils/httpRequest';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileDto {
  name?: string;
  phone?: string;
  address?: string;
  image?: string;
  password?: string;
  oldPassword?: string;
}

export const getCurrentUser = async (
  accessToken: string,
): Promise<ApiUser> => {
  try {
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await get<ApiUser>('/users/profile', config);
    return response;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  accessToken: string,
  data: UpdateUserProfileDto,
): Promise<ApiUser> => {
  try {
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await patch<ApiUser>('/users/profile', data, config);
    return response;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
};

export const uploadProfileImage = async (
  accessToken: string,
  imageFile: File,
): Promise<ApiUser> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const response = await patch<ApiUser>('/users/profile/image', formData, config);
    return response;
  } catch (error) {
    console.error('Failed to upload profile image:', error);
    throw error;
  }
};

export const getUserById = async (
  accessToken: string,
  userId: number,
): Promise<ApiUser> => {
  try {
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const response = await get<ApiUser>(`/users/${userId}`, config);
    return response;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};
