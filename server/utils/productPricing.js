export const PRODUCT_MRP = 249;
export const PRODUCT_DISCOUNT_PERCENT = 0;
export const PRODUCT_DISCOUNT = 0;
export const PRODUCT_SELLING_PRICE = PRODUCT_MRP;
export const PRODUCT_WEIGHT = '70 g';

export function productPricing() {
  return {
    mrp: PRODUCT_MRP,
    productDiscount: PRODUCT_DISCOUNT,
    sellingPrice: PRODUCT_SELLING_PRICE,
    weight: PRODUCT_WEIGHT,
  };
}
