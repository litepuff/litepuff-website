import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import CartHeader from './CartHeader.jsx';
import CartItem from './CartItem.jsx';
import CartSummary from './CartSummary.jsx';
import CouponInput from './CouponInput.jsx';
import EmptyCart from './EmptyCart.jsx';
import FreeShippingBar from './FreeShippingBar.jsx';
import FirstOrderOffer from './FirstOrderOffer.jsx';

export default function CartDrawer({ isOpen, onClose, onCheckout, onApplyCoupon }) {
  const { cartItems, cartTotal, cartCount, updateQuantity } = useCart();
  const closeButtonRef = useRef(null);
  const [couponCode, setCouponCode] = useState('');

  function applyCoupon(code) {
    setCouponCode(code.toUpperCase());
    onApplyCoupon?.(code);
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.button
            type="button"
            aria-label="Close shopping bag"
            className="absolute inset-0 h-full w-full bg-[#16211C]/50 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.aside
            id="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 right-0 top-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FAF8F2] shadow-[-24px_0_70px_rgba(18,28,23,0.18)] sm:w-[440px] lg:w-[500px]"
          >
            <div className="relative z-10 shrink-0 bg-[#FAF8F2]">
              <CartHeader itemCount={cartCount} onClose={onClose} closeButtonRef={closeButtonRef} />
            </div>

            {cartItems.length === 0 ? (
              <EmptyCart onClose={onClose} />
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {cartItems.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onUpdateQuantity={updateQuantity}
                          onRemove={(productId) => updateQuantity(productId, 0)}
                        />
                      ))}
                    </AnimatePresence>
                    <FirstOrderOffer compact />
                    <CouponInput onApply={applyCoupon} />
                    <FreeShippingBar subtotal={cartTotal} />
                  </div>
                </div>

                <footer className="sticky bottom-0 z-20 shrink-0 border-t border-[#ECE7DD] bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(36,48,41,0.06)] sm:px-6">
                  <div className="space-y-2.5">
                    <CartSummary items={cartItems} couponCode={couponCode} />

                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.button
                        type="button"
                        onClick={onCheckout}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#1F5E3B] px-3 text-xs font-bold text-white transition-colors hover:bg-[#2C614A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5E3B] focus-visible:ring-offset-2"
                      >
                        Proceed to Checkout
                      </motion.button>
                      <Link to="/products" onClick={onClose} className="flex h-11 w-full items-center justify-center rounded-xl border border-[#1F5E3B] px-3 text-xs font-bold text-[#1F5E3B] transition-colors hover:bg-[#FAF8F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5E3B] focus-visible:ring-offset-2">Continue Shopping</Link>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1 text-xs text-[#7A817C]">
                      <FiLock size={13} aria-hidden="true" />
                      <span>Secure checkout &middot; Protected payment</span>
                    </div>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
