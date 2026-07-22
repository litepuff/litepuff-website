import apiClient from './apiClient';

export async function loginAdmin(email, password) {
  const response = await apiClient.post('/admin/login', { email, password });
  return response.data;
}

export async function getCurrentAdmin() {
  const response = await apiClient.get('/admin/profile');
  return response.data.admin;
}
