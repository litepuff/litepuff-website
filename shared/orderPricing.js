export const money = (value) => Number(Number(value || 0).toFixed(2));
export const discountMoney = (value) => Math.round(Number(value || 0));

export function calculateOrderPricing({
  items = [],
  couponDiscount = 0,
  freeShipping = false,
  firstOrderEligible = false,
  firstOrderCoupon = false,
}) {
  const normalized = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const sellingPrice = money(item.price);
    const mrp = Math.max(sellingPrice, money(item.originalPrice ?? item.regularPrice ?? item.oldPrice ?? item.compareAtPrice ?? sellingPrice));
    return { quantity, sellingPrice, mrp };
  });
  const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = money(normalized.reduce((sum, item) => sum + item.mrp * item.quantity, 0));
  const sellingSubtotal = money(normalized.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0));
  const productDiscount = money(subtotal - sellingSubtotal);
  const firstOrderDiscount = firstOrderEligible ? discountMoney(sellingSubtotal * 0.10) : 0;
  // LITEPUFF10 confirms the automatic first-order offer. It never creates a
  // second discount. Other coupons retain their independently validated value.
  const normalizedCouponDiscount = firstOrderCoupon
    ? 0
    : money(Math.min(Math.max(0, sellingSubtotal - firstOrderDiscount), Math.max(0, couponDiscount)));
  const shipping = freeShipping || quantity >= 2 ? 0 : quantity === 1 ? 29 : 0;
  const discount = money(productDiscount + firstOrderDiscount + normalizedCouponDiscount);
  const grandTotal = money(Math.max(0, sellingSubtotal - firstOrderDiscount - normalizedCouponDiscount + shipping));
  return {
    quantity,
    subtotal,
    sellingSubtotal,
    discountedSubtotal: sellingSubtotal,
    productDiscount,
    firstOrderDiscount,
    couponDiscount: normalizedCouponDiscount,
    discount,
    shipping,
    tax: 0,
    grandTotal,
  };
}
