import { useEffect, useMemo, useState } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { customerService } from '../services/customerService.js';

const money = (value) => Number(Number(value || 0).toFixed(2));
const completed = (order) => String(order.paymentStatus).toLowerCase() === 'paid' || ['completed', 'delivered'].includes(String(order.status).toLowerCase());

export function useOrderPricing(items = []) {
  const { customer } = useCustomerAuth();
  const [eligible, setEligible] = useState(!customer);
  useEffect(() => { let active = true; if (!customer) { setEligible(true); return () => { active = false; }; } setEligible(false); customerService.orders().then(({ orders = [] }) => { if (active) setEligible(!orders.some(completed)); }).catch(() => { if (active) setEligible(false); }); return () => { active = false; }; }, [customer]);
  return useMemo(() => { const subtotal = money(items.reduce((sum, item) => sum + Number(item.originalPrice || item.compareAtPrice || item.price || 0) * Number(item.quantity || 1), 0)); const saleSubtotal = money(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)); const productDiscount = money(Math.max(0, subtotal - saleSubtotal)); const firstOrderDiscount = eligible ? money(saleSubtotal * 0.1) : 0; const shipping = saleSubtotal >= 498 ? 0 : 29; const discount = money(productDiscount + firstOrderDiscount); return { subtotal, productDiscount, firstOrderDiscount, couponDiscount: 0, discount, shipping, tax: 0, grandTotal: money(Math.max(0, subtotal - discount + shipping)), firstOrderEligible: eligible, estimated: true }; }, [items, eligible]);
}
