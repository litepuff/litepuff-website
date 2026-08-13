import cheeseImage from '../assets/images/products/cheese.png';
import creamOnionImage from '../assets/images/products/cream-onion.png';
import mintImage from '../assets/images/products/mint.png';
import periPeriImage from '../assets/images/products/peri-peri.png';
import saltPepperImage from '../assets/images/products/salt-pepper.png';

const imagesById = Object.freeze({
  'peri-peri-makhana': periPeriImage,
  'mint-pudina-makhana': mintImage,
  'cheese-makhana': cheeseImage,
  'cream-onion-makhana': creamOnionImage,
  'salt-pepper-makhana': saltPepperImage,
});

export function getLocalProductImage(product = {}) {
  const id = String(product.id || product.productId || product.ProductID || product.slug || '').trim().toLowerCase();
  if (imagesById[id]) return imagesById[id];

  const identity = `${product.name || ''} ${product.flavour || product.flavor || ''}`.toLowerCase();
  if (identity.includes('cream') || identity.includes('onion')) return creamOnionImage;
  if (identity.includes('cheese')) return cheeseImage;
  if (identity.includes('mint') || identity.includes('pudina')) return mintImage;
  if (identity.includes('salt') || identity.includes('pepper')) return saltPepperImage;
  if (identity.includes('peri')) return periPeriImage;
  return '';
}

export function getProductImage(product = {}) {
  return String(product.image || product.primaryImage || '').trim() || getLocalProductImage(product);
}
