import test from 'node:test';
import assert from 'node:assert/strict';
import { MetaConversionService } from '../services/meta/MetaConversionService.js';
import { PurchaseQueueService } from '../services/meta/PurchaseQueueService.js';
import {
  isCapturedRazorpayPayment,
  isCodPurchaseOrder,
  isValidCapturedPayment,
  purchaseEventId,
} from '../services/meta/PurchasePolicy.js';
import { verifyRazorpaySignature } from '../services/paymentGatewayService.js';
import { ShiprocketWebhookService } from '../services/shiprocketWebhookService.js';
import { isMetaTrackingAttemptSuccessful } from '../../src/analytics/metaEvents.js';

const silent = { info() {}, warn() {}, error() {} };

class MemorySheets {
  constructor(seed = {}) {
    this.data = structuredClone(seed);
    for (const name of ['ORDERS', 'ORDER_ITEMS', 'PAYMENTS', 'CUSTOMERS', 'ADDRESSES', 'NOTIFICATIONS']) {
      this.data[name] ||= [];
    }
  }
  async getRows(name) { return (this.data[name] || []).map((row) => ({ ...row })); }
  async appendRow(name, record) {
    if ((this.data[name] || []).some((row) => row.NotificationID && row.NotificationID === record.NotificationID)) return;
    (this.data[name] ||= []).push({ ...record, _row: this.data[name].length + 2 });
  }
  async updateRow(name, rowNumber, record) {
    const index = this.data[name].findIndex((row) => row._row === rowNumber);
    this.data[name][index] = { ...record, _row: rowNumber };
  }
}

const onlineSeed = () => ({
  ORDERS: [{ _row: 2, OrderID: 'order-1', CustomerID: 'customer-1', AddressID: 'address-1', PaymentMethod: 'upi', PaymentStatus: 'Paid', OrderStatus: 'Confirmed', GrandTotal: 499 }],
  ORDER_ITEMS: [
    { _row: 2, OrderID: 'order-1', ProductID: 'sku-1', ProductName: 'Mint Makhana', Price: 199, Quantity: 2 },
    { _row: 3, OrderID: 'order-1', ProductID: 'sku-2', ProductName: 'Cheese Makhana', Price: 101, Quantity: 1 },
  ],
  PAYMENTS: [{ _row: 2, PaymentID: 'payment-1', OrderID: 'order-1', CustomerID: 'customer-1', Status: 'Paid', Amount: 499, Currency: 'INR', Remarks: '{}' }],
  CUSTOMERS: [{ _row: 2, CustomerID: 'customer-1', Email: 'customer@example.com', Phone: '9876543210', FirstName: 'Lite', LastName: 'Puff' }],
  ADDRESSES: [{ _row: 2, AddressID: 'address-1', Phone: '9876543210', City: 'Delhi', State: 'Delhi', Country: 'India', Pincode: '110001' }],
  NOTIFICATIONS: [],
});

const gateway = (status = 'captured', overrides = {}) => ({
  order_id: 'rzp-order-1', amount: 49900, currency: 'INR', status, ...overrides,
});
const validationInput = (status = 'captured', overrides = {}) => ({
  payment: { RazorpayOrderID: 'rzp-order-1', Amount: 499, Currency: 'INR' },
  snapshot: { razorpayOrderId: 'rzp-order-1' },
  gatewayPayment: gateway(status, overrides),
});

test('captured Razorpay payment is eligible; authorized, pending, failed and cancelled are not', () => {
  assert.equal(isValidCapturedPayment(validationInput('captured')), true);
  for (const status of ['authorized', 'pending', 'failed', 'cancelled']) {
    assert.equal(isCapturedRazorpayPayment({ status }), false);
    assert.equal(isValidCapturedPayment(validationInput(status)), false);
  }
});

test('amount, currency and order mismatches reject Razorpay finalization', () => {
  assert.equal(isValidCapturedPayment(validationInput('captured', { amount: 49800 })), false);
  assert.equal(isValidCapturedPayment(validationInput('captured', { currency: 'USD' })), false);
  assert.equal(isValidCapturedPayment(validationInput('captured', { order_id: 'other' })), false);
});

test('invalid Razorpay signature is rejected', () => {
  assert.equal(verifyRazorpaySignature({ razorpayOrderId: 'order', razorpayPaymentId: 'payment', razorpaySignature: 'invalid' }), false);
});

test('browser Pixel unavailable is non-blocking and deterministic retries keep the same event ID', () => {
  assert.equal(isMetaTrackingAttemptSuccessful({ tracked: false }), false);
  assert.equal(isMetaTrackingAttemptSuccessful({ tracked: true }), true);
  assert.equal(purchaseEventId('order-1'), purchaseEventId('order-1'));
});

test('COD Purchase policy only accepts Delivered', () => {
  for (const status of ['Confirmed', 'Shipped', 'Out for Delivery', 'Cancelled', 'Returned', 'Refunded']) {
    assert.equal(isCodPurchaseOrder({ PaymentMethod: 'Cash on Delivery', OrderStatus: status }), false);
  }
  assert.equal(isCodPurchaseOrder({ PaymentMethod: 'Cash on Delivery', OrderStatus: 'Delivered' }), true);
});

test('online Purchase is durable, has complete parameters and a stable event ID', async () => {
  const sheets = new MemorySheets(onlineSeed());
  const calls = [];
  const service = new PurchaseQueueService({
    sheets,
    meta: { purchase: async (event) => { calls.push(event); return { sent: true, response: { fbtrace_id: 'trace-1' } }; } },
    clientUrl: 'https://litepuff.in',
    log: silent,
  });
  const attribution = { fbp: 'fb.1.1.1', fbc: 'fb.1.1.click', clientIp: '203.0.113.1', clientUserAgent: 'Browser' };
  const result = await service.enqueueAndDeliver('order-1', attribution);
  assert.equal(result.sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].eventId, 'purchase-order-1');
  assert.deepEqual(calls[0].customData.content_ids, ['sku-1', 'sku-2']);
  assert.equal(calls[0].customData.content_type, 'product');
  assert.equal(calls[0].customData.content_name, 'Mint Makhana, Cheese Makhana');
  assert.equal(calls[0].customData.num_items, 3);
  assert.equal(calls[0].customData.value, 499);
  assert.equal(calls[0].customData.currency, 'INR');
  assert.equal(calls[0].userData.fbp, attribution.fbp);
  assert.equal(calls[0].userData.clientIp, attribution.clientIp);
  assert.equal(sheets.data.NOTIFICATIONS[0].Status, 'sent');
});

test('same order retries and duplicate producers create one logical Purchase', async () => {
  const sheets = new MemorySheets(onlineSeed());
  let calls = 0;
  const service = new PurchaseQueueService({ sheets, meta: { purchase: async () => { calls += 1; return { sent: true }; } }, log: silent });
  await Promise.all([service.enqueueAndDeliver('order-1'), service.enqueueAndDeliver('order-1')]);
  await service.enqueueAndDeliver('order-1');
  assert.equal(sheets.data.NOTIFICATIONS.length, 1);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(sheets.data.NOTIFICATIONS[0].Metadata).eventId, purchaseEventId('order-1'));
});

test('temporary Meta failure remains pending and a restarted worker eventually sends it', async () => {
  const sheets = new MemorySheets(onlineSeed());
  const first = new PurchaseQueueService({ sheets, meta: { purchase: async () => ({ sent: false, status: 503 }) }, log: silent });
  await first.enqueueAndDeliver('order-1');
  assert.equal(sheets.data.NOTIFICATIONS[0].Status, 'retry_pending');
  sheets.data.NOTIFICATIONS[0].NextAttemptAt = '2000-01-01T00:00:00.000Z';
  let sent = 0;
  const restarted = new PurchaseQueueService({ sheets, meta: { purchase: async () => { sent += 1; return { sent: true }; } }, log: silent });
  await restarted.retryPending();
  assert.equal(sent, 1);
  assert.equal(sheets.data.NOTIFICATIONS[0].Status, 'sent');
  assert.equal(JSON.parse(sheets.data.NOTIFICATIONS[0].Metadata).eventId, 'purchase-order-1');
});

test('missing Meta credentials do not throw and leave Purchase retryable', async () => {
  const sheets = new MemorySheets(onlineSeed());
  const meta = new MetaConversionService({ accessToken: '', pixelId: '', apiVersion: 'v23.0', fetchImpl: async () => assert.fail('must not call') });
  const service = new PurchaseQueueService({ sheets, meta, log: silent });
  const result = await service.enqueueAndDeliver('order-1');
  assert.equal(result.sent, false);
  assert.equal(sheets.data.NOTIFICATIONS[0].Status, 'retry_pending');
});

test('authenticated non-stale Shiprocket Delivered transition queues one COD Purchase', async () => {
  const data = {
    SHIPMENTS: [{ _row: 2, ShipmentID: 'shipment-cod', OrderID: 'order-cod', ProviderShipmentID: 'ship-1', AWBNumber: 'AWB1', LatestEventAt: '2026-01-01T00:00:00.000Z', WebhookEventId: '' }],
    ORDERS: [{ _row: 2, OrderID: 'order-cod', OrderNumber: 'LP-COD', PaymentMethod: 'Cash on Delivery', PaymentStatus: 'Pending', OrderStatus: 'Out for Delivery' }],
    ORDER_TRACKING: [],
    PAYMENTS: [{ _row: 2, OrderID: 'order-cod', Remarks: '{}' }],
  };
  const sheets = {
    async getRows(name) { return (data[name] || []).map((row) => ({ ...row })); },
    async updateRow(name, row, record) { data[name][data[name].findIndex((item) => item._row === row)] = { ...record, _row: row }; },
    async appendRow(name, record) { data[name].push({ ...record, _row: data[name].length + 2 }); },
  };
  const queued = [];
  const service = new ShiprocketWebhookService({ sheets, log: silent, queuePurchase: async (...args) => queued.push(args) });
  const payload = { event_id: 'delivered-1', shipment_id: 'ship-1', awb: 'AWB1', current_status: 'Delivered', current_timestamp: '2026-01-02T00:00:00.000Z' };
  await service.process(payload);
  await service.process(payload);
  assert.equal(queued.length, 1);
  assert.equal(queued[0][0], 'order-cod');
  assert.equal(data.ORDERS[0].OrderStatus, 'Delivered');
});
