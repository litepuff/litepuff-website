import { useEffect, useMemo, useState } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { customerService } from '../services/customerService.js';
import { calculateOrderPricing } from '../utils/orderPricing.js';

const completed = (order) => String(order.paymentStatus).toLowerCase() === 'paid' || ['completed', 'delivered'].includes(String(order.status).toLowerCase());

export function useOrderPricing(items = [], options = {}) {
  const { customer } = useCustomerAuth();
  const [eligible, setEligible] = useState(false);
  useEffect(() => { let active = true; if (!customer || String(customer.provider || '').toLowerCase() === 'guest') { setEligible(false); return () => { active = false; }; } setEligible(false); customerService.orders().then(({ orders = [] }) => { if (active) setEligible(!orders.some(completed)); }).catch(() => { if (active) setEligible(false); }); return () => { active = false; }; }, [customer]);
  // First-order savings are coupon-driven. Eligibility controls whether the
  // coupon may be used; it must never add a second automatic 10% discount.
  return useMemo(() => ({ ...calculateOrderPricing({ items, couponDiscount: options.couponDiscount, freeShipping: options.freeShipping, firstOrderEligible: false }), firstOrderEligible: eligible, estimated: true }), [items, eligible, options.couponDiscount, options.freeShipping]);
}
