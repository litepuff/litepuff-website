import test from 'node:test';
import assert from 'node:assert/strict';
import { findEligibleReviewOrder } from '../controllers/productReviewController.js';
import { NotificationService } from '../services/NotificationService.js';
import { ShiprocketWebhookService } from '../services/shiprocketWebhookService.js';

const silent = { info() {}, warn() {}, error() {} };

test('review eligibility requires ownership, the purchased product, and delivery', () => {
  const orders = [
    { OrderID: 'pending', CustomerID: 'customer-1', OrderStatus: 'Shipped' },
    { OrderID: 'other', CustomerID: 'customer-2', OrderStatus: 'Delivered' },
    { OrderID: 'delivered', CustomerID: 'customer-1', OrderStatus: 'Delivered' },
  ];
  const items = [
    { OrderID: 'pending', ProductID: 'mint' },
    { OrderID: 'other', ProductID: 'mint' },
    { OrderID: 'delivered', ProductID: 'peri-peri' },
  ];
  assert.equal(findEligibleReviewOrder({ orders, items, customerId: 'customer-1', productId: 'mint' }), null);
  assert.equal(findEligibleReviewOrder({ orders, items, customerId: 'customer-2', productId: 'mint' })?.OrderID, 'other');
  assert.equal(findEligibleReviewOrder({ orders, items, customerId: 'customer-1', productId: 'PERI-PERI' })?.OrderID, 'delivered');
});

test('post-delivery review request is created exactly once and never for undelivered orders', async () => {
  const rows = [];
  const service = new NotificationService({ reviewNotificationStore: {
    async getRows() { return rows.map((row) => ({ ...row })); },
    async appendRow(_sheet, row) { rows.push({ ...row, _row: rows.length + 2 }); },
  } });
  assert.equal((await service.requestReview({ OrderID: 'order-1', CustomerID: 'customer-1', OrderStatus: 'Shipped' })).skipped, true);
  await service.requestReview({ OrderID: 'order-1', CustomerID: 'customer-1', OrderStatus: 'Delivered' });
  const replay = await service.requestReview({ OrderID: 'order-1', CustomerID: 'customer-1', OrderStatus: 'Delivered' });
  assert.equal(replay.duplicate, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Type, 'review_request');
});

test('out-of-order Shiprocket events cannot regress delivered order or shipment state', async () => {
  const data = {
    SHIPMENTS: [{ _row: 2, ShipmentID: 'shipment-1', OrderID: 'order-1', ProviderShipmentID: 'ship-1', AWBNumber: 'awb-1', ShippingStatus: 'Out for Delivery', LatestEventAt: '2026-08-22T10:00:00.000Z' }],
    ORDERS: [{ _row: 2, OrderID: 'order-1', CustomerID: 'customer-1', OrderStatus: 'Out for Delivery' }],
    ORDER_TRACKING: [],
  };
  const sheets = {
    async getRows(name) { return (data[name] || []).map((row) => ({ ...row })); },
    async updateRow(name, rowNumber, record) { data[name][data[name].findIndex((row) => row._row === rowNumber)] = { ...record, _row: rowNumber }; },
    async appendRow(name, record) { data[name].push({ ...record, _row: data[name].length + 2 }); },
  };
  const notifier = { calls: [], async orderStatus(order, status) { this.calls.push({ order, status }); } };
  const service = new ShiprocketWebhookService({ sheets, log: silent, notifier });
  await service.process({ event_id: 'delivered', shipment_id: 'ship-1', current_status: 'Delivered', current_timestamp: '2026-08-22T11:00:00.000Z' });
  await service.process({ event_id: 'late-in-transit', shipment_id: 'ship-1', current_status: 'In Transit', current_timestamp: '2026-08-22T09:00:00.000Z' });
  assert.equal(data.ORDERS[0].OrderStatus, 'Delivered');
  assert.equal(data.SHIPMENTS[0].ShippingStatus, 'Delivered');
  assert.deepEqual(notifier.calls.map((call) => call.status), ['Delivered']);
});

test('RTO delivered is not represented as successful customer delivery', async () => {
  const data = {
    SHIPMENTS: [{ _row: 2, ShipmentID: 'shipment-1', OrderID: 'order-1', ProviderShipmentID: 'ship-1', AWBNumber: 'awb-1', ShippingStatus: 'RTO Initiated', LatestEventAt: '2026-08-22T10:00:00.000Z', DeliveryDate: '' }],
    ORDERS: [{ _row: 2, OrderID: 'order-1', CustomerID: 'customer-1', OrderStatus: 'Returned' }],
    ORDER_TRACKING: [],
  };
  const sheets = {
    async getRows(name) { return (data[name] || []).map((row) => ({ ...row })); },
    async updateRow(name, rowNumber, record) { data[name][data[name].findIndex((row) => row._row === rowNumber)] = { ...record, _row: rowNumber }; },
    async appendRow(name, record) { data[name].push({ ...record, _row: data[name].length + 2 }); },
  };
  await new ShiprocketWebhookService({ sheets, log: silent }).process({ event_id: 'rto-delivered', shipment_id: 'ship-1', current_status: 'RTO Delivered', current_timestamp: '2026-08-22T11:00:00.000Z' });
  assert.equal(data.ORDERS[0].OrderStatus, 'Returned');
  assert.equal(data.SHIPMENTS[0].ShippingStatus, 'RTO Delivered');
  assert.equal(data.SHIPMENTS[0].DeliveryDate, '');
});
