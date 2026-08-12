const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const money = (value) => Number(finiteNumber(value).toFixed(2));
export const discountMoney = (value) => Math.round(finiteNumber(value));

export function calculateOrderPricing({
  items = [],
  couponCode = '',
  couponDiscount = 0,
  paymentMethod = 'online',
}) {
  const normalized = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const mrp = money(item.originalPrice ?? item.regularPrice ?? item.oldPrice ?? item.price);
    const sellingTotal = money(item.total ?? Number(item.price || 0) * quantity);
    return { quantity, mrp, sellingTotal, freeDelivery: item.freeDelivery === true };
  });
  const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = money(normalized.reduce((sum, item) => sum + item.mrp * item.quantity, 0));
  const sellingSubtotal = money(normalized.reduce((sum, item) => sum + item.sellingTotal, 0));
  const productDiscount = money(Math.max(0, subtotal - sellingSubtotal));
  const cod = String(paymentMethod).toLowerCase() === 'cod';
  const normalizedCode = String(couponCode || '').trim().toUpperCase();
  const couponApplied = !cod && Boolean(normalizedCode) && Number(couponDiscount) > 0;
  const normalizedCouponDiscount = couponApplied ? money(Math.min(sellingSubtotal, Math.max(0, couponDiscount))) : 0;
  const offerFreeDelivery = normalized.some((item) => item.freeDelivery);
  const shipping = cod || offerFreeDelivery ? 0 : quantity === 1 ? 29 : 0;
  const grandTotal = money(Math.max(0, sellingSubtotal - normalizedCouponDiscount + shipping));
  return {
    quantity,
    subtotal,
    mrp: subtotal,
    sellingSubtotal,
    productDiscount,
    couponDiscount: normalizedCouponDiscount,
    discount: normalizedCouponDiscount,
    shipping,
    shippingIncluded: cod || offerFreeDelivery,
    tax: 0,
    grandTotal,
    paymentMethod: cod ? 'cod' : 'online',
    couponAllowed: !cod,
    couponApplied,
    offerStatus: cod ? 'unavailable_for_cod' : couponApplied ? 'applied' : 'available',
  };
}
