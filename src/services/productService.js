import apiClient from './apiClient';
import { fallbackProducts } from '../utils/siteConfig';

export async function getProducts() {
  try {
    const response = await apiClient.get('/products');
    return response.data.products;
  } catch {
    return fallbackProducts;
  }
}

export async function getProductBySlug(slug) {
  try {
    const response = await apiClient.get(`/products/${slug}`);
    return response.data.product;
  } catch {
    return fallbackProducts.find((product) => product.slug === slug);
  }
}
