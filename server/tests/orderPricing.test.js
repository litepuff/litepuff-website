import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../services/orderService.js';
import { calculateOrderPricing as calculateBrowserPricing } from '../../src/utils/orderPricing.js';

const basket = (quantity) => [{ originalPrice: 249, price: 249, quantity }];

const matrix = {
  1: { online: 278, discount: 50, prepaid: 228, cod: 249, shipping: 29 },
  2: { online: 498, discount: 100, prepaid: 398, cod: 498, shipping: 0 },
  3: { online: 747, discount: 149, prepaid: 598, cod: 747, shipping: 0 },
};

for (const quantity of [1, 2, 3]) {
  test(`${quantity} product online total without coupon is correct`, () => {
    const pricing = calculateOrderPricing({ items: basket(quantity), paymentMethod: 'online' });
    assert.equal(pricing.subtotal, 249 * quantity);
    assert.equal(pricing.couponDiscount, 0);
    assert.equal(pricing.shipping, matrix[quantity].shipping);
    assert.equal(pricing.grandTotal, matrix[quantity].online);
  });

  test(`${quantity} product prepaid coupon total is correct`, () => {
    const pricing = calculateOrderPricing({
      items: basket(quantity),
      couponCode: 'TEST15',
      couponDiscount: matrix[quantity].discount,
      paymentMethod: 'online',
    });
    assert.equal(pricing.couponDiscount, matrix[quantity].discount);
    assert.equal(pricing.grandTotal, matrix[quantity].prepaid);
    assert.equal(pricing.offerStatus, 'applied');
  });

  test(`${quantity} product COD ignores coupon and includes shipping`, () => {
    const pricing = calculateOrderPricing({
      items: basket(quantity),
      couponCode: 'TEST15',
      couponDiscount: matrix[quantity].discount,
      paymentMethod: 'cod',
    });
    assert.equal(pricing.couponDiscount, 0);
    assert.equal(pricing.shipping, 0);
    assert.equal(pricing.shippingIncluded, true);
    assert.equal(pricing.grandTotal, matrix[quantity].cod);
  });
}

test('switching from prepaid to COD removes the coupon immediately', () => {
  const prepaid = calculateOrderPricing({ items: basket(1), couponCode: 'TEST15', couponDiscount: 50, paymentMethod: 'online' });
  const cod = calculateOrderPricing({ items: basket(1), couponCode: 'TEST15', couponDiscount: 50, paymentMethod: 'cod' });
  assert.equal(prepaid.grandTotal, 228);
  assert.equal(cod.grandTotal, 249);
  assert.equal(cod.offerStatus, 'unavailable_for_cod');
});

test('browser and server use the identical centralized engine', () => {
  for (const quantity of [1, 2, 3]) {
    for (const paymentMethod of ['online', 'cod']) {
      const input = { items: basket(quantity), couponCode: 'TEST15', couponDiscount: matrix[quantity].discount, paymentMethod };
      assert.deepEqual(calculateBrowserPricing(input), calculateOrderPricing(input));
    }
  }
});
