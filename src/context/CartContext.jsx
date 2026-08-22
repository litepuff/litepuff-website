import { createContext, useContext, useMemo, useState } from 'react';
import { customerService } from '../services/customerService';
import { useCustomerAuth } from './CustomerAuthContext';
import { siteConfig } from '../utils/siteConfig.js';
import useMetaTracking from '../analytics/useMetaTracking.js';
import { DEFAULT_OFFER_CONFIG } from '../../shared/offerConfig.js';
import { comboCartId } from '../utils/comboCart.js';

const CartContext = createContext(null);
const normalizePrice = (item) => ({
  ...item,
  price: item.type === 'combo' ? Number(item.price) : Number(item.price || (siteConfig.productMrp * (1 - DEFAULT_OFFER_CONFIG.singleDiscountPercent / 100)).toFixed(2)),
  originalPrice: Number(item.originalPrice || item.regularPrice || item.oldPrice || (item.type === 'combo' ? item.items?.reduce((sum, part) => sum + Number(part.originalPrice || part.price || siteConfig.productMrp) * part.quantity, 0) : siteConfig.productMrp)),
  regularPrice: Number(item.regularPrice || item.originalPrice || siteConfig.productMrp),
  oldPrice: Number(item.oldPrice || item.originalPrice || siteConfig.productMrp),
  weight: siteConfig.productWeight,
});

export function CartProvider({ children }) {
  const { customer } = useCustomerAuth();
  const { trackAddToCart, trackRemoveFromCart } = useMetaTracking();
  const [cartItems, setCartItems] = useState(() => {
    return JSON.parse(localStorage.getItem('everydayMakhanaCart') || '[]').map(normalizePrice);
  });

  function saveCart(nextItems) {
    setCartItems(nextItems);
    localStorage.setItem('everydayMakhanaCart', JSON.stringify(nextItems));
    localStorage.removeItem('litepuffCoupon');
    window.dispatchEvent(new CustomEvent('litepuff:coupon', { detail: null }));
  }

  function addToCart(product, quantity = 1) {
    const existingItem = cartItems.find((item) => item.id === product.id);
    let nextItems;

    if (existingItem) {
      nextItems = cartItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      nextItems = [...cartItems, { ...normalizePrice(product), quantity }];
    }

    saveCart(nextItems);
    try {
      trackAddToCart(normalizePrice(product), quantity);
    } catch {
      // Analytics is optional and must never affect cart behavior.
    }
    if (customer && product.type !== 'combo') {
      customerService.addCart(product.id, quantity).catch(() => {});
    }
  }

  function updateQuantity(productId, quantity) {
    const removedItem = quantity <= 0
      ? cartItems.find((item) => item.id === productId)
      : null;
    const nextItems = cartItems
      .map((item) => (item.id === productId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    saveCart(nextItems);
    if (removedItem) {
      try {
        trackRemoveFromCart(removedItem, removedItem.quantity);
      } catch {
        // Analytics is optional and must never affect cart behavior.
      }
    }
  }

  function addComboToCart(combo) {
    const id = combo.id || comboCartId(combo);
    const existing = cartItems.find((item) => item.id === id);
    saveCart(existing
      ? cartItems.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cartItems, { ...normalizePrice(combo), id, type: 'combo', quantity: 1 }]);
  }

  function clearCart() {
    saveCart([]);
    if (customer) {
      customerService.clearCartRemote().catch(() => {});
    }
  }

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((total, item) => total + (item.type === 'combo' ? item.items.reduce((sum, part) => sum + part.quantity, 0) * item.quantity : item.quantity), 0);

  const value = useMemo(() => ({
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    addComboToCart,
    updateQuantity,
    clearCart
  }), [cartItems, cartTotal, cartCount, customer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
