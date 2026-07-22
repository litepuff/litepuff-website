import { motion } from 'framer-motion';
import { FiCheckCircle, FiLock, FiMapPin, FiTruck } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { formatMoney } from '../../utils/formatMoney';
import CouponSection from './CouponSection.jsx';
import ShippingProgress from './ShippingProgress.jsx';

const trustItems = [
  [FiLock, 'Secure Checkout'],
  [FiTruck, 'Fast Delivery'],
  [FiMapPin, 'Pan India'],
  [FiCheckCircle, 'FSSAI Certified'],
];

function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-4 text-sm text-[#5B5F59]"><span>{label}</span><span>{children}</span></div>;
}

export default function CartSummary({ subtotal }) {
  const navigate = useNavigate();

  return (
    <aside className="sticky top-[120px] rounded-[28px] border border-[#ECE7DD] bg-white p-6 shadow-[0_14px_42px_rgba(36,48,41,0.055)] lg:p-9">
      <h2 className="font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Order Summary</h2>
      <div className="mt-6 space-y-3.5">
        <Row label="Subtotal"><strong className="text-[#243029]">{formatMoney(subtotal)}</strong></Row>
        <Row label="Shipping"><span className="font-semibold text-[#1E4D3A]">{subtotal >= 498 ? 'FREE' : '₹29 at checkout'}</span></Row>
        <Row label="Discount">&mdash;</Row>
        <Row label="Tax">At checkout</Row>
      </div>
      <div className="mt-5 border-t border-[#ECE7DD] pt-5">
        <div className="flex items-end justify-between gap-4">
          <span className="font-medium text-[#243029]">Total</span>
          <strong className="font-display text-[32px] font-semibold leading-none text-[#243029]">{formatMoney(subtotal)}</strong>
        </div>
      </div>

      <div className="mt-6"><ShippingProgress subtotal={subtotal} /></div>
      <div className="mt-5"><CouponSection /></div>

      <div className="mt-6 space-y-3">
        <motion.button type="button" onClick={() => navigate('/checkout')} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} transition={{ duration: 0.2 }} className="h-[58px] w-full rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2C614A]">Proceed to Checkout</motion.button>
        <Link to="/products" className="flex h-[52px] w-full items-center justify-center rounded-full border border-[#1E4D3A] px-6 text-sm font-semibold text-[#1E4D3A] transition-colors hover:bg-[#FAF8F2]">Continue Shopping</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-[#ECE7DD] pt-5">
        {trustItems.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2 text-[10px] font-medium text-[#6B726D]"><Icon size={14} className="shrink-0 text-[#1E4D3A]" aria-hidden="true" /><span>{label}</span></div>
        ))}
      </div>
    </aside>
  );
}
