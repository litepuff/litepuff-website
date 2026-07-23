import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../services/orderService.js';
import { calculateOrderPricing as calculateBrowserPricing } from '../../src/utils/orderPricing.js';

const basket = (quantity) => [{
  originalPrice: 249,
  price: 224,
  quantity,
  productDiscount: 25 * quantity,
}];

const expected = {
  1: {
    returning: { subtotal: 249, productDiscount: 25, sellingSubtotal: 224, firstOrderDiscount: 0, shipping: 29, grandTotal: 253 },
    first: { subtotal: 249, productDiscount: 25, sellingSubtotal: 224, firstOrderDiscount: 22, shipping: 29, grandTotal: 231 },
  },
  2: {
    returning: { subtotal: 498, productDiscount: 50, sellingSubtotal: 448, firstOrderDiscount: 0, shipping: 0, grandTotal: 448 },
    first: { subtotal: 498, productDiscount: 50, sellingSubtotal: 448, firstOrderDiscount: 45, shipping: 0, grandTotal: 403 },
  },
  3: {
    returning: { subtotal: 747, productDiscount: 75, sellingSubtotal: 672, firstOrderDiscount: 0, shipping: 0, grandTotal: 672 },
    first: { subtotal: 747, productDiscount: 75, sellingSubtotal: 672, firstOrderDiscount: 67, shipping: 0, grandTotal: 605 },
  },
};

for (const quantity of [1, 2, 3]) {
  test(`${quantity} product pricing is correct for returning customers`, () => {
    const pricing = calculateOrderPricing({ items: basket(quantity) });
    for (const [field, value] of Object.entries(expected[quantity].returning)) assert.equal(pricing[field], value, field);
  });

  test(`${quantity} product pricing applies the automatic first-order offer once`, () => {
    const pricing = calculateOrderPricing({ items: basket(quantity), firstOrderEligible: true });
    for (const [field, value] of Object.entries(expected[quantity].first)) assert.equal(pricing[field], value, field);
  });

  test(`${quantity} product LITEPUFF10 confirmation equals the automatic offer`, () => {
    const automatic = calculateOrderPricing({ items: basket(quantity), firstOrderEligible: true });
    const confirmed = calculateOrderPricing({
      items: basket(quantity),
      firstOrderEligible: true,
      firstOrderCoupon: true,
      couponDiscount: Math.round(automatic.sellingSubtotal * 0.10),
    });
    assert.equal(confirmed.firstOrderDiscount, automatic.firstOrderDiscount);
    assert.equal(confirmed.couponDiscount, 0);
    assert.equal(confirmed.grandTotal, automatic.grandTotal);
  });
}

test('an invalid or ineligible first-order coupon never removes the product discount', () => {
  const pricing = calculateOrderPricing({ items: basket(1), firstOrderEligible: false, firstOrderCoupon: true });
  assert.equal(pricing.productDiscount, 25);
  assert.equal(pricing.firstOrderDiscount, 0);
  assert.equal(pricing.grandTotal, 253);
});

test('browser and server use the same centralized engine for every matrix case', () => {
  for (const quantity of [1, 2, 3]) {
    for (const firstOrderEligible of [false, true]) {
      const input = { items: basket(quantity), firstOrderEligible };
      assert.deepEqual(calculateBrowserPricing(input), calculateOrderPricing(input));
    }
  }
});
