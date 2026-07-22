import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../services/orderService.js';

const items = [{ originalPrice: 1000, price: 880, quantity: 1, productDiscount: 120 }];

test('first-order pricing applies 10% after product discounts', () => { assert.deepEqual(calculateOrderPricing({ items, firstOrderEligible: true, freeShipping: true }), { subtotal: 1000, productDiscount: 120, discountedSubtotal: 880, firstOrderDiscount: 88, couponDiscount: 0, shipping: 0, discount: 208, tax: 0, grandTotal: 792 }); });
test('returning customer keeps product discount without first-order discount', () => { const pricing = calculateOrderPricing({ items, firstOrderEligible: false, freeShipping: true }); assert.equal(pricing.firstOrderDiscount, 0); assert.equal(pricing.grandTotal, 880); });
test('coupon stacks independently and total never becomes negative', () => { assert.equal(calculateOrderPricing({ items, firstOrderEligible: true, couponDiscount: 50, freeShipping: true }).grandTotal, 742); assert.equal(calculateOrderPricing({ items, couponDiscount: 5000 }).grandTotal, 0); });
