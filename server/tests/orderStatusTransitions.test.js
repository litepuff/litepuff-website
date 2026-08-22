import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrderTransitions, canTransitionOrder } from '../domain/orderStatusTransitions.js';

test('order status graph permits fulfilment paths and rejects regressions', () => {
  assert.equal(canTransitionOrder('Confirmed', 'Packed'), true);
  assert.equal(canTransitionOrder('Confirmed', 'Ready for Dispatch'), true);
  assert.equal(canTransitionOrder('Out for Delivery', 'Delivered'), true);
  assert.equal(canTransitionOrder('Delivered', 'Shipped'), false);
  assert.equal(canTransitionOrder('Cancelled', 'Confirmed'), false);
  assert.deepEqual(allowedOrderTransitions('Delivered'), []);
});

test('repeating the current order status is idempotent', () => {
  assert.equal(canTransitionOrder('Shipped', 'Shipped'), true);
});
