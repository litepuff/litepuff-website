import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('homepage hero preserves the source artwork ratio and eager LCP loading', async () => {
  const source = await read('src/components/Hero.jsx');
  assert.match(source, /aspect-\[1672\/941\]/);
  assert.match(source, /object-contain/);
  assert.match(source, /fetchPriority="high"/);
  assert.match(source, /loading="eager"/);
});

test('Contact uses shared support configuration and exposes persistent form states', async () => {
  const source = await read('src/pages/Contact.jsx');
  assert.match(source, /siteConfig\.email/);
  assert.match(source, /siteConfig\.phone/);
  assert.match(source, /siteConfig\.instagram/);
  assert.match(source, /role=\{status\.type === 'error' \? 'alert' : 'status'\}/);
});

test('invoice authorization happens before PDF materialization', async () => {
  const source = await read('server/controllers/productionController.js');
  const readIndex = source.indexOf('getInvoiceData(request.params.id)');
  const accessIndex = source.indexOf('canAccessOrder(request, invoiceData.order)');
  const generateIndex = source.indexOf('generateInvoice(request.params.id, invoiceData)');
  assert.ok(readIndex >= 0 && accessIndex > readIndex && generateIndex > accessIndex);
});

test('invoice output distinguishes COD from Razorpay and includes persisted combo details', async () => {
  const source = await read('server/services/invoiceService.js');
  assert.match(source, /item\.ComboName/);
  assert.match(source, /item\.ComboType/);
  assert.match(source, /cod \? 'Cash on Delivery' : 'Razorpay'/);
  assert.doesNotMatch(source, /\|\| 'Paid'/);
});

test('public content requests never attach the stored admin bearer token', async () => {
  const source = await read('src/services/contentService.js');
  assert.doesNotMatch(source, /adminToken/);
  assert.doesNotMatch(source, /Authorization/);
});

test('footer contact actions use the shared contact configuration without corrupted text', async () => {
  const source = await read('src/components/Footer.jsx');
  assert.match(source, /siteConfig\.phone/);
  assert.match(source, /siteConfig\.email/);
  assert.match(source, /siteConfig\.instagram/);
  assert.doesNotMatch(source, /Ã|Â|â€|â€™/);
});

test('admin order payment disclosure never labels COD as Razorpay by default', async () => {
  const source = await read('src/pages/admin/AdminOrdersPage.jsx');
  assert.match(source, /method\.includes\('cash'\)/);
  assert.match(source, /'Cash on Delivery' : 'Razorpay'/);
});
