import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPricing } from '../../shared/orderPricing.js';
import { DEFAULT_OFFER_CONFIG, singleOfferPrice } from '../../shared/offerConfig.js';
import { normalizeOfferConfig, comboDefinition } from '../services/offerService.js';
import { getMetaCatalogIds } from '../../src/analytics/metaCatalog.js';

test('single product offer dynamically applies 15 percent with currency precision', () => {
  assert.equal(singleOfferPrice(249), 211.65);
  assert.equal(singleOfferPrice(300), 255);
});

test('combo definitions have authoritative fixed prices and item counts', () => {
  const config = normalizeOfferConfig({ combo2: { price: 379 }, combo3: { price: 559 } });
  assert.deepEqual(comboDefinition(config, 'COMBO_2'), { enabled: true, price: 379, requiredItems: 2, freeDelivery: true });
  assert.deepEqual(comboDefinition(config, 'COMBO_3'), { enabled: true, price: 559, requiredItems: 3, freeDelivery: true });
});

test('pricing supports a combo, free delivery, and individual products together', () => {
  const pricing = calculateOrderPricing({ items: [
    { quantity: 2, originalPrice: 249, price: 189.5, total: 379, freeDelivery: true },
    { quantity: 1, originalPrice: 249, price: 211.65, total: 211.65 },
  ], paymentMethod: 'online' });
  assert.equal(pricing.subtotal, 747);
  assert.equal(pricing.sellingSubtotal, 590.65);
  assert.equal(pricing.productDiscount, 156.35);
  assert.equal(pricing.shipping, 0);
  assert.equal(pricing.grandTotal, 590.65);
});

test('COD preserves authoritative offer prices while shipping remains included', () => {
  const pricing = calculateOrderPricing({ items: [{ quantity: 3, originalPrice: 249, price: 186.33, total: 559, freeDelivery: true }], paymentMethod: 'cod' });
  assert.equal(pricing.grandTotal, 559);
  assert.equal(pricing.shipping, 0);
});

test('combo analytics expand to actual selected catalogue products including duplicates', () => {
  const combo = { type: 'combo', items: [
    { metaCatalogId: 'ylq23re47d' }, { metaCatalogId: 'ylq23re47d' }, { metaCatalogId: '50ta2tmgg3' },
  ] };
  assert.deepEqual(getMetaCatalogIds([combo]), ['ylq23re47d', 'ylq23re47d', '50ta2tmgg3']);
});

test('offer defaults remain a single shared definition', () => {
  assert.equal(DEFAULT_OFFER_CONFIG.singleDiscountPercent, 15);
  assert.equal(DEFAULT_OFFER_CONFIG.combo2.price, 379);
  assert.equal(DEFAULT_OFFER_CONFIG.combo3.price, 559);
});
