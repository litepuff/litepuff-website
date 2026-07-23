import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../services/orderService.js';
import { calculateOrderPricing as calculateBrowserPricing } from '../../src/utils/orderPricing.js';

const items = [{ originalPrice: 1000, price: 880, quantity: 1, productDiscount: 120 }];

test('first-order pricing applies 10% once to the selling subtotal', () => {
  const pricing = calculateOrderPricing({ items, firstOrderEligible: true, freeShipping: true });
  assert.equal(pricing.subtotal, 1000);
  assert.equal(pricing.sellingSubtotal, 880);
  assert.equal(pricing.productDiscount, 120);
  assert.equal(pricing.firstOrderDiscount, 88);
  assert.equal(pricing.grandTotal, 792);
});
test('returning customer keeps product discount without first-order discount', () => { const pricing = calculateOrderPricing({ items, firstOrderEligible: false, freeShipping: true }); assert.equal(pricing.firstOrderDiscount, 0); assert.equal(pricing.grandTotal, 880); });
test('coupon stacks independently and product total never becomes negative', () => { assert.equal(calculateOrderPricing({ items, firstOrderEligible: true, couponDiscount: 50, freeShipping: true }).grandTotal, 742); assert.equal(calculateOrderPricing({ items, couponDiscount: 5000 }).grandTotal, 29); });
test('documented one-product example totals 228 with both 10% discounts', () => {
  const pricing = calculateOrderPricing({
    items: [{ originalPrice: 277, price: 249, quantity: 1, productDiscount: 28 }],
    couponDiscount: Math.round(249 * 0.10),
    firstOrderEligible: true
  });
  assert.deepEqual({ productDiscount: pricing.productDiscount, couponDiscount: pricing.couponDiscount, firstOrderDiscount: pricing.firstOrderDiscount, shipping: pricing.shipping, grandTotal: pricing.grandTotal }, { productDiscount: 28, couponDiscount: 25, firstOrderDiscount: 25, shipping: 29, grandTotal: 228 });
});
test('documented returning-customer example totals 253', () => {
  const pricing = calculateOrderPricing({ items: [{ originalPrice: 277, price: 249, quantity: 1, productDiscount: 28 }], couponDiscount: 25 });
  assert.equal(pricing.firstOrderDiscount, 0);
  assert.equal(pricing.grandTotal, 253);
});
test('two total units unlock free shipping regardless of basket value', () => {
  const pricing = calculateOrderPricing({ items: [{ originalPrice: 277, price: 249, quantity: 2, productDiscount: 56 }] });
  assert.equal(pricing.quantity, 2);
  assert.equal(pricing.shipping, 0);
  assert.equal(pricing.grandTotal, 498);
});
test('browser estimate and server authority produce identical price fields', () => {
  const browserItems = [{ originalPrice: 277, price: 249, quantity: 1 }];
  const serverItems = [{ originalPrice: 277, price: 249, quantity: 1, productDiscount: 28 }];
  const browser = calculateBrowserPricing({ items: browserItems, couponDiscount: 25, firstOrderEligible: true });
  const server = calculateOrderPricing({ items: serverItems, couponDiscount: 25, firstOrderEligible: true });
  for (const field of ['quantity', 'subtotal', 'sellingSubtotal', 'productDiscount', 'firstOrderDiscount', 'couponDiscount', 'shipping', 'discount', 'tax', 'grandTotal']) assert.equal(browser[field], server[field], field);
});
