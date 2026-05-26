import { post } from '@/utils/httpRequest';

type Wrapped<T> = { success?: boolean; data?: T; message?: string };
type UploadResult = {
  imageUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
};

export async function uploadImage(accessToken: string, file: File, folder = 'misc') {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const response = await post<Wrapped<UploadResult>>('/uploads/image', formData, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.data?.imageUrl) {
    throw new Error(response.message || 'Không upload được ảnh.');
  }

  return response.data;
}
