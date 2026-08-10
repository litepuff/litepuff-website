import test from 'node:test';
import assert from 'node:assert/strict';
import { getMetaCatalogId, getMetaCatalogIds, getMetaContents } from '../../src/analytics/metaCatalog.js';

const products = [
  { id: 'peri-peri-makhana', metaCatalogId: 'ylq23re47d', quantity: 1, price: 249 },
  { id: 'cheese-makhana', metaCatalogId: '50ta2tmgg3', quantity: 2, price: 249 },
  { id: 'cream-onion-makhana', metaCatalogId: 'aj2tqtd7gb', quantity: 1, price: 249 },
  { id: 'mint-pudina-makhana', metaCatalogId: 'jsvvhrmhkv', quantity: 3, price: 249 },
  { id: 'salt-pepper-makhana', metaCatalogId: 'uti8mwrq0k', quantity: 1, price: 249 },
];

test('all five products resolve to their exact Meta Commerce Content IDs', () => {
  assert.deepEqual(getMetaCatalogIds(products), [
    'ylq23re47d', '50ta2tmgg3', 'aj2tqtd7gb', 'jsvvhrmhkv', 'uti8mwrq0k',
  ]);
  assert.equal(getMetaCatalogId(products[0]), 'ylq23re47d');
  assert.equal(products[0].id, 'peri-peri-makhana');
});

test('commerce contents use Meta IDs, quantities and existing prices', () => {
  const contents = getMetaContents(products);
  assert.deepEqual(contents.map((item) => item.id), getMetaCatalogIds(products));
  assert.equal(contents[1].quantity, 2);
  assert.equal(contents[1].item_price, 249);
});

test('missing MetaCatalogID never falls back to ProductID or slug', () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(getMetaCatalogId({ id: 'internal-id', productId: 'internal-id', slug: 'internal-slug' }), '');
    assert.deepEqual(getMetaCatalogIds([{ ProductID: 'legacy-product' }]), []);
  } finally {
    console.warn = originalWarn;
  }
});
