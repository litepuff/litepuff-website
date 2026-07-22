import apiClient from './apiClient';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post('/uploads/image', formData);
  return response.data.imageUrl;
}
