import { FiTruck } from 'react-icons/fi';
import { formatMoney } from '../utils/formatMoney';

function SummaryRow({ label, children, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-[#243029]' : 'text-[#626964]'}`}>
      <span>{label}</span>
      <span className={strong ? 'font-semibold' : ''}>{children}</span>
    </div>
  );
}

export default function CartSummary({ subtotal, couponCode = '', freeShippingThreshold = 499 }) {
  const hasFreeShipping = subtotal >= freeShippingThreshold;
  const discount = couponCode === 'LITEPUFF10' ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  return (
    <section className="rounded-[18px] border border-[#E7E1D7] bg-white p-3.5 shadow-[0_5px_16px_rgba(36,48,41,0.035)]" aria-labelledby="cart-summary-title">
      <h3 id="cart-summary-title" className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[#243029]">Order Summary</h3>
      <div className="mt-2.5 space-y-1.5 text-xs leading-5">
        <SummaryRow label="Subtotal">{formatMoney(subtotal)}</SummaryRow>
        <SummaryRow label="Coupon"><span className="font-semibold text-[#1F5E3B]">{couponCode || 'Available'}</span></SummaryRow>
        <SummaryRow label="Discount"><span className="font-semibold text-[#1F5E3B]">{discount ? `-${formatMoney(discount)}` : '—'}</span></SummaryRow>
        <SummaryRow label="Shipping">{hasFreeShipping ? <span className="font-medium text-[#1E4D3A]">Free</span> : 'Calculated at checkout'}</SummaryRow>
        <SummaryRow label="Estimated delivery"><span className="inline-flex items-center gap-1.5"><FiTruck aria-hidden="true" />2–4 Days</span></SummaryRow>
      </div>
      <div className="mt-2.5 border-t border-[#ECE7DD] pt-2.5 text-[15px]">
        <SummaryRow label="Grand Total" strong>{formatMoney(grandTotal)}</SummaryRow>
      </div>
    </section>
  );
}
