import test from 'node:test';
import assert from 'node:assert/strict';
import adminRoutes from '../routes/adminRoutes.js';
import { comboSize, groupOrderItems } from '../../src/utils/orderItems.js';

test('persisted combo order items reconstruct exact flavours including duplicates', () => {
  const grouped = groupOrderItems([
    { id: 'i1', type: 'combo', comboId: 'combo-1', comboType: 'COMBO_3', comboName: 'Build Your Own Combo', productId: 'mint-pudina-makhana', productName: 'Mint Pudina Makhana', quantity: 1, total: 186.33 },
    { id: 'i2', type: 'combo', comboId: 'combo-1', comboType: 'COMBO_3', comboName: 'Build Your Own Combo', productId: 'peri-peri-makhana', productName: 'Peri Peri Makhana', quantity: 2, total: 372.67 },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(comboSize(grouped[0]), 3);
  assert.deepEqual(grouped[0].comboProducts.map(({ productId, quantity }) => ({ productId, quantity })), [
    { productId: 'mint-pudina-makhana', quantity: 1 },
    { productId: 'peri-peri-makhana', quantity: 2 },
  ]);
  assert.equal(Number(grouped[0].total.toFixed(2)), 559);
});

test('admin report and backup CTAs have protected API routes', () => {
  const routes = adminRoutes.stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
  assert.ok(routes.includes('GET /reports/:type'));
  assert.ok(routes.includes('POST /backups'));
  assert.ok(routes.includes('GET /backups'));
  assert.equal(routes.some((route) => route.includes('/refund')), false);
});
