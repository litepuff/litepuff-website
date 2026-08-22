import axios from 'axios';
import { siteConfig } from '../utils/siteConfig';

const publicApi = axios.create({ baseURL: siteConfig.apiBaseUrl, withCredentials: true });
publicApi.interceptors.response.use((response) => { if (response.data?.success === true && response.data.data) response.data = { ...response.data.data, message: response.data.message || '' }; return response; });

export const contentService = {
  faqs: () => publicApi.get('/faqs').then((res) => res.data),
  reviews: (productId) => publicApi.get('/reviews', { params: productId ? { productId } : {} }).then((res) => res.data),
  createReview: (data) => publicApi.post('/reviews', data).then((res) => res.data),
  contact: (data) => publicApi.post('/contact', data).then((res) => res.data),
  newsletter: (email) => publicApi.post('/newsletter', { email }).then((res) => res.data),
  validateCoupon: (data) => publicApi.post('/coupons/validate', data).then((res) => res.data),
  search: async (q) => {
    const [products, blogs, faqs] = await Promise.all([
      publicApi.get('/products/search', { params: { q } }).then((res) => res.data.products || []),
      publicApi.get('/blogs').then((res) => (res.data.blogs || []).filter((blog) => [blog.title, blog.excerpt, blog.category].join(' ').toLowerCase().includes(q.toLowerCase()))),
      publicApi.get('/faqs').then((res) => (res.data.faqs || []).filter((faq) => [faq.question, faq.answer, faq.category].join(' ').toLowerCase().includes(q.toLowerCase())))
    ]);
    return { products, blogs, faqs };
  }
};
