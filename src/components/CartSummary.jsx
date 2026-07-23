import { FiTruck } from 'react-icons/fi';
import { formatMoney } from '../utils/formatMoney';
import { useOrderPricing } from '../hooks/useOrderPricing.js';

function SummaryRow({ label, children, strong = false }) { return <div className={`flex items-center justify-between gap-4 ${strong ? 'text-[#243029]' : 'text-[#626964]'}`}><span>{label}</span><span className={strong ? 'font-semibold' : ''}>{children}</span></div>; }

export default function CartSummary({ items = [], coupon = null }) {
  const pricing = useOrderPricing(items, { couponDiscount: coupon?.discount, freeShipping: coupon?.freeShipping, firstOrderCoupon: coupon?.firstOrder });
  return <section className="rounded-[18px] border border-[#E7E1D7] bg-white p-3.5 shadow-[0_5px_16px_rgba(36,48,41,0.035)]" aria-labelledby="cart-summary-title">
    <h3 id="cart-summary-title" className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[#243029]">Order Summary</h3>
    <div className="mt-2.5 space-y-1.5 text-xs leading-5">
      <SummaryRow label="Subtotal">{formatMoney(pricing.subtotal)}</SummaryRow>
      <SummaryRow label="Product Discount"><span className="font-semibold text-[#1F5E3B]">{pricing.productDiscount ? `-${formatMoney(pricing.productDiscount)}` : '—'}</span></SummaryRow>
      <SummaryRow label="Selling Price Total"><strong>{formatMoney(pricing.sellingSubtotal)}</strong></SummaryRow>
      {pricing.firstOrderDiscount > 0 && <SummaryRow label={`First Order Discount${coupon?.firstOrder ? ` (${coupon.code})` : ''}`}><span className="font-semibold text-[#1F5E3B]">-{formatMoney(pricing.firstOrderDiscount)}</span></SummaryRow>}
      {pricing.couponDiscount > 0 && <SummaryRow label="Coupon"><span className="font-semibold text-[#1F5E3B]">-{formatMoney(pricing.couponDiscount)}</span></SummaryRow>}
      <SummaryRow label="Shipping">{pricing.shipping ? formatMoney(pricing.shipping) : <span className="font-medium text-[#1E4D3A]">Free</span>}</SummaryRow>
      <SummaryRow label="Tax">Included</SummaryRow>
      <SummaryRow label="Estimated delivery"><span className="inline-flex items-center gap-1.5"><FiTruck aria-hidden="true" />2–4 Days</span></SummaryRow>
    </div>
    <div className="mt-2.5 border-t border-[#ECE7DD] pt-2.5 text-[15px]"><SummaryRow label="Grand Total" strong>{formatMoney(pricing.grandTotal)}</SummaryRow></div>
  </section>;
}
