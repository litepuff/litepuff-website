import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifyShiprocketWebhook } from '../middleware/verifyShiprocketWebhook.js';
import { ShiprocketWebhookService } from '../services/shiprocketWebhookService.js';
import { ShiprocketProvider } from '../services/shippingService.js';

const silent = { info() {}, warn() {}, error() {} };

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const sheetStore = () => {
  const data = {
    SHIPMENTS: [{ _row: 2, ShipmentID: 'shipment-order-1', OrderID: 'order-1', Provider: 'shiprocket', ProviderShipmentID: '7001', AWBNumber: 'AWB1', TrackingNumber: 'AWB1', ShippingStatus: 'In Transit', PickupStatus: 'Picked Up', LatestEventAt: '2026-07-27T08:00:00.000Z', WebhookEventId: '' }],
    ORDERS: [{ _row: 2, OrderID: 'order-1', OrderNumber: 'LP-1', OrderStatus: 'Shipped', EstimatedDelivery: '2026-07-30' }],
    ORDER_TRACKING: [],
  };
  return {
    data,
    api: {
      async getRows(name) { return data[name].map((row) => ({ ...row })); },
      async updateRow(name, rowNumber, record) {
        const index = data[name].findIndex((row) => row._row === rowNumber);
        data[name][index] = { ...record, _row: rowNumber };
      },
      async appendRow(name, record) {
        if (!data[name].some((row) => row.TrackingID === record.TrackingID)) data[name].push({ ...record, _row: data[name].length + 2 });
      },
    },
  };
};

test('Shiprocket webhook token validation fails closed and uses the configured token', () => {
  const middleware = createVerifyShiprocketWebhook('expected-token');
  const denied = response();
  middleware({ id: 'request-1', get: () => 'wrong-token' }, denied, () => assert.fail('must not continue'));
  assert.equal(denied.statusCode, 401);
  let continued = false;
  middleware({ id: 'request-2', get: () => 'expected-token' }, response(), () => { continued = true; });
  assert.equal(continued, true);
});

test('delivered webhook updates shipment, order and tracking exactly once', async () => {
  const store = sheetStore();
  const service = new ShiprocketWebhookService({ sheets: store.api, log: silent });
  const payload = { event_id: 'evt-delivered', shipment_id: '7001', awb: 'AWB1', current_status: 'Delivered', current_status_id: 7, current_timestamp: '2026-07-27T09:00:00Z', courier_name: 'Courier' };
  const first = await service.process(payload, { correlationId: 'request-1' });
  const replay = await service.process(payload, { correlationId: 'request-2' });
  assert.equal(first.replay, false);
  assert.equal(replay.replay, true);
  assert.equal(store.data.SHIPMENTS[0].ShippingStatus, 'Delivered');
  assert.equal(store.data.SHIPMENTS[0].DeliveryDate, '2026-07-27T09:00:00.000Z');
  assert.equal(store.data.ORDERS[0].OrderStatus, 'Delivered');
  assert.equal(store.data.ORDER_TRACKING.length, 1);
});

test('cancelled, NDR and RTO webhooks use conservative order status mappings', async () => {
  for (const [eventId, status, expectedOrder] of [
    ['evt-cancelled', 'Cancelled', 'Cancelled'],
    ['evt-ndr', 'NDR', 'Shipped'],
    ['evt-rto', 'RTO Initiated', 'Returned'],
  ]) {
    const store = sheetStore();
    const service = new ShiprocketWebhookService({ sheets: store.api, log: silent });
    await service.process({ event_id: eventId, shipment_id: '7001', awb: 'AWB1', current_status: status, current_timestamp: '2026-07-27T09:00:00Z' });
    assert.equal(store.data.ORDERS[0].OrderStatus, expectedOrder);
    assert.equal(store.data.ORDER_TRACKING.length, 1);
  }
});

test('Shiprocket provider reconciles an existing shipment without creating another order', async () => {
  const provider = new ShiprocketProvider();
  let createCalls = 0;
  provider.shipment = async () => ({ providerShipmentId: '7001', awb: 'AWB1', courier: 'Courier', status: 'AWB Assigned' });
  provider.call = async (path) => {
    if (path === '/orders/create/adhoc') createCalls += 1;
    return {};
  };
  provider.requestPickup = async () => ({ pickupStatus: 'Pickup Scheduled', pickupDate: '2026-07-28' });
  provider.generateLabel = async () => 'https://example.test/label.pdf';
  provider.generateManifest = async () => 'https://example.test/manifest.pdf';
  const stages = [];
  const result = await provider.create(
    { OrderNumber: 'LP-1' },
    { courierId: 10, courier: 'Courier' },
    { ProviderShipmentID: '7001', AWBNumber: 'AWB1', TrackingNumber: 'AWB1', PickupStatus: 'Pending' },
    async (_, stage) => stages.push(stage),
  );
  assert.equal(createCalls, 0);
  assert.equal(result.awb, 'AWB1');
  assert.ok(stages.includes('shipment-reconciled'));
  assert.ok(stages.includes('pickup-requested'));
  assert.ok(stages.includes('label-generated'));
  assert.ok(stages.includes('manifest-generated'));
});

test('ambiguous Shiprocket create failure is marked unsafe for carrier fallback', async () => {
  const provider = new ShiprocketProvider();
  provider.findByExternalOrderId = async () => null;
  provider.call = async () => { throw new TypeError('timeout'); };
  await assert.rejects(
    () => provider.create({ OrderNumber: 'LP-2' }, { courierId: 10, courier: 'Courier' }),
    (error) => error.safeToFallback === false && error.code === 'SHIPROCKET_CREATE_AMBIGUOUS',
  );
});
