import apiClient from './apiClient';
import { fallbackProducts } from '../utils/siteConfig';
import { DEFAULT_OFFER_CONFIG } from '../../shared/offerConfig.js';

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

export async function getOfferConfig() {
  try {
    const response = await apiClient.get('/products/offers/config');
    return response.data.offers;
  } catch {
    return DEFAULT_OFFER_CONFIG;
  }
}
