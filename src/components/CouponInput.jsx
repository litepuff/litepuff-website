import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiTag } from 'react-icons/fi';
import { contentService } from '../services/contentService.js';
import { useCart } from '../context/CartContext.jsx';

export default function CouponInput({ onApply }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { cartTotal } = useCart();

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!normalizedCode) return;
    try {
      const result = await contentService.validateCoupon({ code: normalizedCode, subtotal: cartTotal });
      setStatus('applied');
      setErrorMessage('');
      localStorage.setItem('litepuffCoupon', JSON.stringify(result.coupon));
      onApply?.(result.coupon);
    } catch (error) {
      setStatus('invalid');
      setErrorMessage(error.response?.data?.message || 'Invalid coupon code.');
      localStorage.removeItem('litepuffCoupon');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[24px] border border-[#E7DFD2] bg-white p-4 shadow-[0_8px_24px_rgba(36,48,41,0.035)]">
      <div className="mb-3 flex items-center justify-between gap-3"><label htmlFor="cart-coupon" className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B726D]">Coupon code</label><span className="inline-flex items-center gap-1 rounded-full bg-[#F8F1DF] px-2.5 py-1 text-[10px] font-bold text-[#8B6828]"><FiTag aria-hidden="true" /> Online offer</span></div>
      <button type="button" onClick={() => { setCode('LITEPUFF20'); setStatus('idle'); }} className="mb-3 flex w-full items-center justify-between rounded-2xl border border-dashed border-[#CDBD9A] bg-[#FCF8EE] px-4 py-3 text-left"><span><strong className="block text-sm text-[#243029]">LITEPUFF20</strong><span className="text-xs text-[#6B726D]">20% off online payments</span></span><span className="text-xs font-bold text-[#1E4D3A]">Use code</span></button>
      <div className="flex gap-2">
        <input
          id="cart-coupon"
          value={code}
          onChange={(event) => { setCode(event.target.value.toUpperCase()); setStatus('idle'); }}
          placeholder="Enter your code"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-[#ECE7DD] bg-[#FAF8F2] px-4 text-sm text-[#243029] outline-none transition-colors placeholder:text-[#9A9F9B] focus:border-[#1E4D3A]"
        />
        <button type="submit" disabled={!code.trim() || status === 'applied'} className="h-11 rounded-xl bg-[#1E4D3A] px-5 text-sm font-bold text-white transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#2C614A] disabled:cursor-not-allowed disabled:opacity-50">{status === 'applied' ? 'Applied' : 'Apply'}</button>
      </div>
      <AnimatePresence mode="wait">{status !== 'idle' && <motion.p key={status} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={status === 'invalid' ? 'alert' : 'status'} className={`mt-3 flex items-center gap-2 text-xs font-semibold ${status === 'applied' ? 'text-[#1E6A45]' : 'text-[#9A392F]'}`}>{status === 'applied' && <FiCheck aria-hidden="true" />}{status === 'applied' ? 'Coupon Applied Successfully' : errorMessage}</motion.p>}</AnimatePresence>
    </form>
  );
}
