import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowRight, FiLock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import CartHeader from './CartHeader.jsx';
import CartItem from './CartItem.jsx';
import CartSummary from './CartSummary.jsx';
import CouponInput from './CouponInput.jsx';
import EmptyCart from './EmptyCart.jsx';
import ComboUpgradePrompt from './cart/ComboUpgradePrompt.jsx';
import { useOrderPricing } from '../hooks/useOrderPricing.js';
import { formatMoney } from '../utils/formatMoney.js';

export default function CartDrawer({ isOpen, onClose, onCheckout, onApplyCoupon }) {
  const { cartItems, cartCount, updateQuantity } = useCart();
  const closeButtonRef = useRef(null);
  const [coupon, setCoupon] = useState(() => { try { return JSON.parse(localStorage.getItem('litepuffCoupon') || 'null'); } catch { return null; } });
  const pricing = useOrderPricing(cartItems, { couponCode: coupon?.code, couponDiscount: coupon?.discount, paymentMethod: 'online' });
  const changeQuantity = (id, quantity) => { setCoupon(null); updateQuantity(id, quantity); };

  function applyCoupon(result) {
    setCoupon(result);
    onApplyCoupon?.(result.code);
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
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
                  <div className="space-y-3 pb-2">
                    <AnimatePresence initial={false}>
                      {cartItems.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onUpdateQuantity={changeQuantity}
                          onRemove={(productId) => changeQuantity(productId, 0)}
                        />
                      ))}
                    </AnimatePresence>
                    <ComboUpgradePrompt items={cartItems} onAccept={onClose} />
                    <CouponInput onApply={applyCoupon} />
                    <CartSummary items={cartItems} coupon={coupon} />
                  </div>
                </div>

                <footer className="relative z-20 shrink-0 border-t border-[#E5DED2] bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(36,48,41,0.10)] sm:px-5">
                  <div className="space-y-2.5">
                    <div className="flex items-end justify-between gap-4">
                      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7A817C]">Grand Total</p><p className="mt-0.5 text-[10px] text-[#7A817C]">Tax included</p></div>
                      <strong className="font-display text-[28px] font-semibold leading-none text-[#243029]">{formatMoney(pricing.grandTotal)}</strong>
                    </div>

                    <div className="grid gap-2">
                      <motion.button
                        type="button"
                        onClick={onCheckout}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1F5E3B] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(31,94,59,.18)] transition-colors hover:bg-[#2C614A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5E3B] focus-visible:ring-offset-2"
                      >
                        Proceed to Checkout <FiArrowRight aria-hidden="true" />
                      </motion.button>
                      <Link to="/products" onClick={onClose} className="flex h-8 w-full items-center justify-center text-xs font-semibold text-[#526159] transition-colors hover:text-[#1F5E3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5E3B] focus-visible:ring-offset-2">Continue Shopping</Link>
                    </div>

                    <div className="flex items-center justify-center gap-2 border-t border-[#F0ECE5] pt-2 text-[10px] text-[#7A817C]">
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
