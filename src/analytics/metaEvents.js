export const META_EVENTS = Object.freeze({
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  SEARCH: 'Search',
  VIEW_CATEGORY: 'ViewCategory',
  REMOVE_FROM_CART: 'RemoveFromCart',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  ADD_TO_WISHLIST: 'AddToWishlist',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  CONTACT: 'Contact',
});

export const META_CURRENCY = 'INR';

export const META_CONTENT_TYPE = 'product';

export const META_PAGE_VIEW_EXCLUDED_PATHS = Object.freeze([
  '/login',
  '/register',
]);

export function isMetaPageViewExcluded(pathname = '') {
  try {
    const normalizedPath = String(pathname || '/').split(/[?#]/, 1)[0];
    return (
      normalizedPath === '/admin' ||
      normalizedPath.startsWith('/admin/') ||
      META_PAGE_VIEW_EXCLUDED_PATHS.includes(normalizedPath)
    );
  } catch {
    return true;
  }
}

export function createMetaEventId(prefix = 'meta') {
  try {
    if (globalThis.crypto?.randomUUID) {
      return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  } catch {
    return '';
  }
}

export function normalizeMetaValue(value) {
  try {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized >= 0
      ? Number(normalized.toFixed(2))
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeMetaContentIds(contentIds) {
  try {
    const values = Array.isArray(contentIds) ? contentIds : [contentIds];
    return values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function compactMetaParams(params = {}) {
  try {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      }),
    );
  } catch {
    return {};
  }
}
