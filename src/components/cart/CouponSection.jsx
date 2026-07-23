import { useState } from 'react';
import { contentService } from '../../services/contentService';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function CouponSection({ onApplied }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { cartTotal } = useCart();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await contentService.validateCoupon({ code, subtotal: cartTotal });
      localStorage.setItem('litepuffCoupon', JSON.stringify(result.coupon));
      onApplied?.(result.coupon);
      showToast('✓ Coupon Applied Successfully');
    } catch (error) {
      localStorage.removeItem('litepuffCoupon');
      onApplied?.(null);
      showToast(error.response?.data?.message || 'Invalid coupon code.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#ECE7DD] pt-5">
      <label htmlFor="cart-page-coupon" className="text-sm font-semibold text-[#243029]">Have a Coupon?</label>
      <div className="mt-3 flex gap-2">
        <input id="cart-page-coupon" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter code" autoComplete="off" className="h-[52px] min-w-0 flex-1 rounded-full border border-[#ECE7DD] bg-[#FAF8F2] px-4 text-sm outline-none transition-colors placeholder:text-[#9A9F9B] focus:border-[#1E4D3A]" />
        <button type="submit" disabled={!code.trim() || loading} className="h-[52px] rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] transition-colors hover:bg-[#1E4D3A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Checking…' : 'Apply'}</button>
      </div>
    </form>
  );
}
