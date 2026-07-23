import { useMemo } from 'react';
import { calculateOrderPricing } from '../utils/orderPricing.js';

export function useOrderPricing(items = [], options = {}) {
  return useMemo(() => ({
    ...calculateOrderPricing({
      items,
      couponCode: options.couponCode,
      couponDiscount: options.couponDiscount,
      paymentMethod: options.paymentMethod || 'online',
    }),
    estimated: true,
  }), [items, options.couponCode, options.couponDiscount, options.paymentMethod]);
}
