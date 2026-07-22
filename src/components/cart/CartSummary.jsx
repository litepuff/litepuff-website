import { motion } from 'framer-motion';
import { FiCheckCircle, FiLock, FiMapPin, FiTruck } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useOrderPricing } from '../../hooks/useOrderPricing.js';
import { formatMoney } from '../../utils/formatMoney';
import CouponSection from './CouponSection.jsx';
import ShippingProgress from './ShippingProgress.jsx';

const trustItems = [[FiLock, 'Secure Checkout'], [FiTruck, 'Fast Delivery'], [FiMapPin, 'Pan India'], [FiCheckCircle, 'FSSAI Certified']];

function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-4 text-sm text-[#5B5F59]"><span>{label}</span><span>{children}</span></div>;
}

export default function CartSummary({ items = [], subtotal = 0 }) {
  const navigate = useNavigate();
  const pricing = useOrderPricing(items);
  return (
    <aside className="sticky top-[120px] rounded-[28px] border border-[#ECE7DD] bg-white p-6 shadow-[0_14px_42px_rgba(36,48,41,0.055)] lg:p-8">
      <h2 className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] text-[#243029]">Order Summary</h2>
      <div className="mt-5 space-y-2.5">
        <Row label="Subtotal"><strong className="text-[#243029]">{formatMoney(pricing.subtotal)}</strong></Row>
        {pricing.productDiscount > 0 && <Row label="Product Discount"><span className="font-semibold text-[#1E4D3A]">-{formatMoney(pricing.productDiscount)}</span></Row>}
        {pricing.firstOrderDiscount > 0 && <Row label="First Order Discount (10%)"><span className="font-semibold text-[#1E4D3A]">-{formatMoney(pricing.firstOrderDiscount)}</span></Row>}
        <Row label="Shipping"><span className="font-semibold text-[#1E4D3A]">{pricing.shipping === 0 ? 'FREE' : formatMoney(pricing.shipping)}</span></Row>
        <Row label="Tax">Included</Row>
      </div>
      <div className="mt-4 border-t border-[#ECE7DD] pt-4">
        <div className="flex items-end justify-between gap-4"><span className="font-semibold text-[#243029]">Grand Total</span><strong className="font-display text-[30px] font-semibold leading-none text-[#243029]">{formatMoney(pricing.grandTotal)}</strong></div>
        {pricing.firstOrderEligible && <p className="mt-2 text-right text-[11px] font-semibold text-[#1E4D3A]">First-order saving applied automatically</p>}
      </div>
      <div className="mt-5"><ShippingProgress subtotal={subtotal} /></div>
      <div className="mt-4"><CouponSection /></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <motion.button type="button" onClick={() => navigate('/checkout')} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} className="flex h-[52px] items-center justify-center rounded-full bg-[#1E4D3A] px-5 text-sm font-semibold text-white hover:bg-[#2C614A]">Proceed to Checkout</motion.button>
        <Link to="/products" className="flex h-[52px] items-center justify-center rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A] hover:bg-[#FAF8F2]">Continue Shopping</Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#ECE7DD] pt-4">
        {trustItems.map(([Icon, label]) => <div key={label} className="flex items-center gap-2 text-[10px] font-medium text-[#6B726D]"><Icon size={14} className="shrink-0 text-[#1E4D3A]" aria-hidden="true" /><span>{label}</span></div>)}
      </div>
    </aside>
  );
}
