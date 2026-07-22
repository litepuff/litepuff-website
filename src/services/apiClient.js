import axios from 'axios';
import { siteConfig } from '../utils/siteConfig';

const apiClient = axios.create({
  baseURL: siteConfig.apiBaseUrl,
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use((response) => {
  if (response.data?.success === true && response.data.data && typeof response.data.data === 'object' && !(response.data instanceof Blob)) response.data = { ...response.data.data, message: response.data.message || '' };
  return response;
});

export default apiClient;
