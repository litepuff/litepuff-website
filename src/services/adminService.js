import apiClient from './apiClient';

const unwrap = (response) => response.data;

export const adminService = {
  login: async (email, password) => unwrap(await apiClient.post('/admin/login', { email, password })),
  logout: async () => unwrap(await apiClient.post('/admin/logout')),
  profile: async () => unwrap(await apiClient.get('/admin/profile')),
  updateProfile: async (payload) => unwrap(await apiClient.put('/admin/profile', payload)),
  dashboard: async () => unwrap(await apiClient.get('/admin/dashboard')),
  products: async (params = {}) => unwrap(await apiClient.get('/admin/products', { params })),
  createProduct: async (payload) => unwrap(await apiClient.post('/admin/products', payload)),
  updateProduct: async (id, payload) => unwrap(await apiClient.put(`/admin/products/${id}`, payload)),
  deleteProduct: async (id) => unwrap(await apiClient.delete(`/admin/products/${id}`)),
  duplicateProduct: async (id) => unwrap(await apiClient.post(`/admin/products/${id}/duplicate`)),
  orders: async (params = {}) => unwrap(await apiClient.get('/admin/orders', { params })),
  order: async (id) => unwrap(await apiClient.get(`/admin/orders/${id}`)),
  updateOrderStatus: async (id, payload) => unwrap(await apiClient.put(`/admin/orders/${id}/status`, payload)),
  customers: async (params = {}) => unwrap(await apiClient.get('/admin/customers', { params })),
  customer: async (id) => unwrap(await apiClient.get(`/admin/customers/${id}`)),
  updateCustomerStatus: async (id, status) => unwrap(await apiClient.put(`/admin/customers/${id}/status`, { status })),
  inventory: async (params = {}) => unwrap(await apiClient.get('/admin/inventory', { params })),
  updateInventory: async (id, payload) => unwrap(await apiClient.put(`/admin/inventory/${id}`, payload)),
  reviews: async (params = {}) => unwrap(await apiClient.get('/admin/reviews', { params })),
  updateReview: async (id, status) => unwrap(await apiClient.put(`/admin/reviews/${id}`, { status })),
  deleteReview: async (id) => unwrap(await apiClient.delete(`/admin/reviews/${id}`)),
  blogs: async (params = {}) => unwrap(await apiClient.get('/admin/blogs', { params })),
  createBlog: async (payload) => unwrap(await apiClient.post('/admin/blogs', payload)),
  updateBlog: async (id, payload) => unwrap(await apiClient.put(`/admin/blogs/${id}`, payload)),
  deleteBlog: async (id) => unwrap(await apiClient.delete(`/admin/blogs/${id}`)),
  coupons: async (params = {}) => unwrap(await apiClient.get('/admin/coupons', { params })),
  createCoupon: async (payload) => unwrap(await apiClient.post('/admin/coupons', payload)),
  updateCoupon: async (id, payload) => unwrap(await apiClient.put(`/admin/coupons/${id}`, payload)),
  deleteCoupon: async (id) => unwrap(await apiClient.delete(`/admin/coupons/${id}`)),
  messages: async (params = {}) => unwrap(await apiClient.get('/admin/contact', { params })),
  markMessageRead: async (id) => unwrap(await apiClient.put(`/admin/contact/${id}/read`, { status: 'read' })),
  deleteMessage: async (id) => unwrap(await apiClient.delete(`/admin/contact/${id}`)),
  newsletter: async (params = {}) => unwrap(await apiClient.get('/admin/newsletter', { params })),
  deleteSubscriber: async (id) => unwrap(await apiClient.delete(`/admin/newsletter/${id}`)),
  exportNewsletter: async () => {
    const response = await apiClient.get('/admin/newsletter/export', { responseType: 'blob' });
    return response.data;
  },
  createShipment: async (orderId) => unwrap(await apiClient.post(`/admin/orders/${orderId}/shipment`, { provider: 'delhivery' })),
  requestRefund: async (orderId) => unwrap(await apiClient.post(`/admin/payments/${orderId}/refund`)),
  payment: async (id) => unwrap(await apiClient.get(`/admin/payments/${id}`)),
  exportReport: async (type, params = {}) => {
    const response = await apiClient.get(`/admin/reports/${type}`, { params, responseType: 'blob' });
    return response.data;
  },
  createBackup: async () => unwrap(await apiClient.post('/admin/backups')),
  backups: async () => unwrap(await apiClient.get('/admin/backups')),
  downloadBackup: async (fileName) => {
    const response = await apiClient.get(`/admin/backups/${fileName}`, { responseType: 'blob' });
    return response.data;
  },
  downloadInvoice: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
    return response.data;
  }
};
