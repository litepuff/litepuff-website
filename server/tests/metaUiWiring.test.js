import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (relativePath) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('Shop search emits the existing Meta Search event through the shared hook', async () => {
  const source = await read('src/pages/Shop.jsx');
  assert.match(source, /const \{ trackSearch, trackViewCategory \} = useMetaTracking\(\)/);
  assert.match(source, /query\.length < 2/);
  assert.match(source, /trackSearch\(query\)/);
});

test('Meta Purchase remains tied to the verified checkout response and deterministic order ID', async () => {
  const source = await read('src/pages/Checkout.jsx');
  assert.match(source, /verifyRazorpayPayment/);
  assert.match(source, /trackPurchase\(/);
  assert.match(source, /`purchase-\$\{orderId\}`/);
});
