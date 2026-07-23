import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../services/orderService.js';
import { calculateOrderPricing as calculateBrowserPricing } from '../../src/utils/orderPricing.js';

const items = [{ originalPrice: 1000, price: 880, quantity: 1, productDiscount: 120 }];

test('first-order eligibility does not create an automatic duplicate discount', () => {
  const pricing = calculateOrderPricing({ items, firstOrderEligible: true, freeShipping: true });
  assert.equal(pricing.subtotal, 1000);
  assert.equal(pricing.sellingSubtotal, 880);
  assert.equal(pricing.productDiscount, 120);
  assert.equal(pricing.firstOrderDiscount, 0);
  assert.equal(pricing.grandTotal, 880);
});

test('returning customer keeps product discount without first-order discount', () => {
  const pricing = calculateOrderPricing({ items, firstOrderEligible: false, freeShipping: true });
  assert.equal(pricing.firstOrderDiscount, 0);
  assert.equal(pricing.grandTotal, 880);
});

test('coupon stacks once on the selling price and product total never becomes negative', () => {
  assert.equal(calculateOrderPricing({ items, firstOrderEligible: true, couponDiscount: 50, freeShipping: true }).grandTotal, 830);
  assert.equal(calculateOrderPricing({ items, couponDiscount: 5000 }).grandTotal, 29);
});

test('MRP 249 gets a 25 product discount and one extra first-order coupon discount', () => {
  const pricing = calculateOrderPricing({
    items: [{ originalPrice: 249, price: 224, quantity: 1, productDiscount: 25 }],
    couponDiscount: Math.round(224 * 0.10),
    firstOrderEligible: true,
  });
  assert.deepEqual(
    {
      productDiscount: pricing.productDiscount,
      couponDiscount: pricing.couponDiscount,
      firstOrderDiscount: pricing.firstOrderDiscount,
      shipping: pricing.shipping,
      grandTotal: pricing.grandTotal,
    },
    { productDiscount: 25, couponDiscount: 22, firstOrderDiscount: 0, shipping: 29, grandTotal: 231 },
  );
});

test('without a valid coupon the product discount remains and shipping is 29', () => {
  const pricing = calculateOrderPricing({ items: [{ originalPrice: 249, price: 224, quantity: 1, productDiscount: 25 }] });
  assert.equal(pricing.firstOrderDiscount, 0);
  assert.equal(pricing.productDiscount, 25);
  assert.equal(pricing.grandTotal, 253);
});

test('two total units unlock free shipping regardless of basket value', () => {
  const pricing = calculateOrderPricing({ items: [{ originalPrice: 249, price: 224, quantity: 2, productDiscount: 50 }] });
  assert.equal(pricing.quantity, 2);
  assert.equal(pricing.shipping, 0);
  assert.equal(pricing.grandTotal, 448);
});

test('browser estimate and server authority produce identical price fields', () => {
  const browserItems = [{ originalPrice: 249, price: 224, quantity: 1 }];
  const serverItems = [{ originalPrice: 249, price: 224, quantity: 1, productDiscount: 25 }];
  const browser = calculateBrowserPricing({ items: browserItems, couponDiscount: 22, firstOrderEligible: true });
  const server = calculateOrderPricing({ items: serverItems, couponDiscount: 22, firstOrderEligible: true });
  for (const field of ['quantity', 'subtotal', 'sellingSubtotal', 'productDiscount', 'firstOrderDiscount', 'couponDiscount', 'shipping', 'discount', 'tax', 'grandTotal']) {
    assert.equal(browser[field], server[field], field);
  }
});
