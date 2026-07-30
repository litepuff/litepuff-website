import apiClient from './apiClient';
const data = (response) => response.data;
export const reviewService = {
  list: (productId, params = {}) => apiClient.get(`/products/${productId}/reviews`, { params }).then(data),
  summary: (productId) => apiClient.get(`/products/${productId}/rating-summary`).then(data),
  create: (productId, payload) => apiClient.post(`/products/${productId}/review`, payload, { headers: { 'Content-Type': 'multipart/form-data' } }).then(data),
  update: (reviewId, payload) => apiClient.put(`/reviews/${reviewId}`, payload).then(data),
  remove: (reviewId) => apiClient.delete(`/reviews/${reviewId}`).then(data),
  helpful: (reviewId) => apiClient.post(`/reviews/${reviewId}/helpful`).then(data),
  report: (reviewId, reason) => apiClient.post(`/reviews/${reviewId}/report`, { reason }).then(data)
};
