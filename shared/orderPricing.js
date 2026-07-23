const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const money = (value) => Number(finiteNumber(value).toFixed(2));
export const discountMoney = (value) => Math.round(finiteNumber(value));
export const ONLINE_COUPON_CODE = 'LITEPUFF20';

export function calculateOrderPricing({
  items = [],
  couponCode = '',
  couponDiscount = 0,
  paymentMethod = 'online',
}) {
  const normalized = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const mrp = money(item.originalPrice ?? item.regularPrice ?? item.oldPrice ?? item.price);
    return { quantity, mrp };
  });
  const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = money(normalized.reduce((sum, item) => sum + item.mrp * item.quantity, 0));
  const cod = String(paymentMethod).toLowerCase() === 'cod';
  const normalizedCode = String(couponCode || '').trim().toUpperCase();
  const couponApplied = !cod && normalizedCode === ONLINE_COUPON_CODE && Number(couponDiscount) > 0;
  const normalizedCouponDiscount = couponApplied ? money(Math.min(subtotal, Math.max(0, couponDiscount))) : 0;
  const shipping = cod ? 0 : quantity === 1 ? 29 : 0;
  const grandTotal = cod ? subtotal : money(Math.max(0, subtotal - normalizedCouponDiscount + shipping));
  return {
    quantity,
    subtotal,
    mrp: subtotal,
    sellingSubtotal: subtotal,
    productDiscount: 0,
    couponDiscount: normalizedCouponDiscount,
    discount: normalizedCouponDiscount,
    shipping,
    shippingIncluded: cod,
    tax: 0,
    grandTotal,
    paymentMethod: cod ? 'cod' : 'online',
    couponAllowed: !cod,
    couponApplied,
    offerStatus: cod ? 'unavailable_for_cod' : couponApplied ? 'applied' : 'available',
  };
}
