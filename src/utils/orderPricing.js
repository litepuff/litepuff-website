export const money = (value) => Number(Number(value || 0).toFixed(2));
export const discountMoney = (value) => Math.round(Number(value || 0));

export function calculateOrderPricing({ items = [], couponDiscount = 0, freeShipping = false }) {
  const normalized = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const sellingPrice = money(item.price);
    const mrp = Math.max(sellingPrice, money(item.originalPrice ?? item.regularPrice ?? item.oldPrice ?? item.compareAtPrice ?? sellingPrice));
    return { quantity, sellingPrice, mrp };
  });
  const quantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = money(normalized.reduce((sum, item) => sum + (item.mrp * item.quantity), 0));
  const sellingSubtotal = money(normalized.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0));
  const productDiscount = money(subtotal - sellingSubtotal);
  const normalizedCouponDiscount = money(Math.min(sellingSubtotal, Math.max(0, couponDiscount)));
  // First-order savings arrive through couponDiscount. Keeping this field at
  // zero prevents the same 10% offer from being applied automatically twice.
  const firstOrderDiscount = 0;
  const shipping = freeShipping || quantity >= 2 ? 0 : quantity === 1 ? 29 : 0;
  const discount = money(productDiscount + normalizedCouponDiscount + firstOrderDiscount);
  const grandTotal = money(Math.max(0, sellingSubtotal - normalizedCouponDiscount - firstOrderDiscount + shipping));
  return { quantity, subtotal, sellingSubtotal, productDiscount, firstOrderDiscount, couponDiscount: normalizedCouponDiscount, discount, shipping, tax: 0, grandTotal };
}
