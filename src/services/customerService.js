import axios from 'axios';
import { siteConfig } from '../utils/siteConfig';

const customerApi = axios.create({ baseURL: siteConfig.apiBaseUrl, withCredentials: true });
const payload = (response) => response.data?.success === true ? { ...(response.data.data || {}), message: response.data.message || '' } : response.data;

let refreshRequest;
customerApi.interceptors.response.use((response) => response, async (error) => {
  const original = error.config || {};
  const isAuthBoundary = /\/auth\/(?:refresh|logout|email\/|whatsapp\/)/.test(String(original.url || ''));
  if (error.response?.status !== 401 || original._retried || isAuthBoundary) throw error;
  original._retried = true;
  refreshRequest ||= customerApi.post('/auth/refresh', {}).finally(() => { refreshRequest = null; });
  await refreshRequest;
  return customerApi(original);
});

async function beginOtp(identifier) {
  const email = String(identifier || '').trim().toLowerCase();
  const isEmail = email.includes('@');
  const channel = isEmail ? 'email' : 'whatsapp';
  const identity = isEmail ? { email } : { phone: String(identifier || '').trim() };
  try {
    return payload(await customerApi.post(`/auth/${channel}/login`, identity));
  } catch (error) {
    if (error.response?.data?.code !== 'CUSTOMER_NOT_FOUND') throw error;
    return payload(await customerApi.post(`/auth/${channel}/signup`, identity));
  }
}

async function verifyOtp(challenge, otp) {
  const provider = challenge.provider === 'whatsapp' ? 'whatsapp' : 'email';
  const identity = provider === 'email' ? { email: challenge.identifier } : { phone: challenge.identifier };
  return payload(await customerApi.post(`/auth/${provider}/verify-otp`, { ...identity, otpId: challenge.otpId, purpose: challenge.purpose, otp }));
}

export const customerService = {
  beginOtp,
  verifyOtp,
  resendOtp: (challenge) => customerApi.post(`/auth/${challenge.provider}/resend`, { otpId: challenge.otpId, purpose: challenge.purpose, ...(challenge.provider === 'email' ? { email: challenge.identifier } : { phone: challenge.identifier }) }).then(payload),
  me: () => customerApi.get('/auth/me').then(payload),
  session: () => customerApi.get('/auth/session').then(payload),
  logout: () => customerApi.post('/auth/logout').then(payload),
  logoutAll: () => customerApi.post('/auth/logout-all').then(payload),
  sessions: () => customerApi.get('/account/sessions').then(payload),
  recover: (data) => customerApi.post('/account/recover', data).then(payload),
  profile: () => customerApi.get('/account/profile').then(payload).then((result) => ({ ...result, customer: result.profile })),
  updateProfile: (data) => customerApi.put('/account/profile', { firstName: data.firstName, lastName: data.lastName, marketingConsent: data.marketingConsent ?? data.newsletter }).then(payload).then((result) => ({ ...result, customer: result.profile })),
  orders: () => customerApi.get('/orders').then(payload),
  order: (id) => customerApi.get(`/orders/${id}`).then(payload),
  tracking: (orderId) => customerApi.get(`/tracking/${orderId}`).then(payload),
  cart: () => customerApi.get('/cart').then(payload),
  addCart: (productId, quantity = 1) => customerApi.post('/cart', { productId, quantity }).then(payload),
  updateCart: (id, quantity) => customerApi.put(`/cart/${id}`, { quantity }).then(payload),
  clearCartRemote: () => customerApi.delete('/cart').then(payload),
  addresses: () => customerApi.get('/addresses').then(payload),
  addAddress: (data) => customerApi.post('/address', data).then(payload),
  updateAddress: (id, data) => customerApi.put(`/address/${id}`, data).then(payload),
  removeAddress: (id) => customerApi.delete(`/address/${id}`).then(payload),
  wishlist: () => customerApi.get('/wishlist').then(payload),
  addWishlist: (productId) => customerApi.post('/wishlist', { productId }).then(payload),
  removeWishlist: (id) => customerApi.delete(`/wishlist/${id}`).then(payload),
  downloadInvoice: (orderId) => customerApi.get(`/orders/${orderId}/invoice`, { responseType: 'blob' }),
  createRazorpayOrder: (checkout) => customerApi.post('/payment/create-order', checkout).then(payload),
  createCashOnDeliveryOrder: (checkout) => customerApi.post('/payment/cash-on-delivery', checkout).then(payload),
  verifyRazorpayPayment: (data) => customerApi.post('/payment/verify', data).then(payload),
  recordPaymentFailure: (data) => customerApi.post('/payment/failure', data).then(payload),
  payment: (paymentId) => customerApi.get(`/payment/${paymentId}`).then(payload),
  liveShipmentTracking: (orderId) => customerApi.get(`/shipping/tracking/${orderId}`).then(payload),
};

export function apiMessage(error) {
  if (!error?.response) return 'We could not connect to LitePuff. Check your connection and try again.';
  return error.response.data?.error || error.response.data?.message || 'Something went wrong. Please try again.';
}
