import { createContext, useContext, useMemo, useState } from 'react';
import { customerService } from '../services/customerService';
import { useCustomerAuth } from './CustomerAuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { customer } = useCustomerAuth();
  const [cartItems, setCartItems] = useState(() => {
    return JSON.parse(localStorage.getItem('everydayMakhanaCart') || '[]');
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
      nextItems = [...cartItems, { ...product, quantity }];
    }

    saveCart(nextItems);
    if (customer) {
      customerService.addCart(product.id, quantity).catch(() => {});
    }
  }

  function updateQuantity(productId, quantity) {
    const nextItems = cartItems
      .map((item) => (item.id === productId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    saveCart(nextItems);
  }

  function clearCart() {
    saveCart([]);
    if (customer) {
      customerService.clearCartRemote().catch(() => {});
    }
  }

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const value = useMemo(() => ({
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    updateQuantity,
    clearCart
  }), [cartItems, cartTotal, cartCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
