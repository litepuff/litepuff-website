import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifyShiprocketWebhook } from '../middleware/verifyShiprocketWebhook.js';
import { ShiprocketWebhookService } from '../services/shiprocketWebhookService.js';
import { recoverPendingShipments, ShiprocketProvider } from '../services/shippingService.js';

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
  const order = {
    OrderID: 'order-2',
    OrderNumber: 'LP-2',
    CreatedAt: '2026-07-27T10:00:00.000Z',
    PaymentMethod: 'Razorpay',
    GrandTotal: 499,
    Shipping: 0,
    email: 'customer@example.test',
    shippingAddress: {
      name: 'Customer',
      phone: '9999999999',
      addressLine: 'Test address',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110030',
    },
    items: [{ productId: 'product-1', productName: 'Makhana', quantity: 1, price: 499 }],
  };
  await assert.rejects(
    () => provider.create(order, { courierId: 10, courier: 'Courier' }),
    (error) => error.safeToFallback === false && error.code === 'SHIPROCKET_CREATE_AMBIGUOUS',
  );
});

test('Shiprocket order payload supports the lowercase checkout item shape', async () => {
  const provider = new ShiprocketProvider();
  provider.findByExternalOrderId = async () => null;
  let payload;
  provider.call = async (path, options) => {
    if (path === '/orders/create/adhoc') {
      payload = JSON.parse(options.body);
      return { order_id: 8001, shipment_id: 9001, status: 'NEW' };
    }
    return {};
  };
  provider.assignAwb = async () => ({ awb: 'AWB2', courier: 'Courier', status: 'AWB Assigned' });
  provider.requestPickup = async () => ({ pickupStatus: 'Pickup Scheduled', pickupDate: '2026-07-28' });
  provider.generateLabel = async () => 'https://example.test/label.pdf';
  provider.generateManifest = async () => 'https://example.test/manifest.pdf';

  await provider.create({
    OrderID: 'order-3',
    OrderNumber: 'LP-3',
    CreatedAt: '2026-07-27T10:00:00.000Z',
    PaymentMethod: 'Razorpay',
    GrandTotal: 499,
    Shipping: 0,
    email: 'customer@example.test',
    shippingAddress: {
      name: 'Customer',
      phone: '9999999999',
      addressLine: 'Test address',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110030',
    },
    items: [{ productId: 'product-1', productName: 'Makhana', quantity: 1, price: 499 }],
  }, { courierId: 10, courier: 'Courier', cost: 50, estimatedDays: 3 });

  assert.equal(payload.order_items[0].name, 'Makhana');
  assert.equal(payload.order_items[0].sku, 'product-1');
  assert.equal(payload.order_items[0].units, 1);
  assert.equal(payload.order_items[0].selling_price, 499);
});

test('pending shipment recovery is paid-order-only, idempotent and reports reconciled duplicates', async () => {
  const data = {
    ORDERS: [
      { OrderID: 'order-1', OrderNumber: 'LP-1', AddressID: 'address-1', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
      { OrderID: 'order-2', OrderNumber: 'LP-2', AddressID: 'address-2', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
      { OrderID: 'order-3', OrderNumber: 'LP-3', AddressID: 'address-3', PaymentStatus: 'Pending', OrderStatus: 'Confirmed' },
      { OrderID: 'order-4', OrderNumber: 'LP-4', AddressID: 'address-4', PaymentStatus: 'Paid', OrderStatus: 'Cancelled' },
      { OrderID: 'order-5', OrderNumber: 'LP-5', AddressID: 'address-5', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
    ],
    PAYMENTS: [
      { OrderID: 'order-1', Status: 'Paid' },
      { OrderID: 'order-2', Status: 'Paid' },
      { OrderID: 'order-3', Status: 'Pending' },
      { OrderID: 'order-4', Status: 'Paid' },
      { OrderID: 'order-5', Status: 'Paid' },
    ],
    SHIPMENTS: [
      { ShipmentID: 'shipment-order-1', OrderID: 'order-1', ShippingStatus: 'Retry Pending', AWBNumber: '', ProviderShipmentID: '' },
      { ShipmentID: 'shipment-order-2', OrderID: 'order-2', ShippingStatus: 'Retry Pending', AWBNumber: '', ProviderShipmentID: 'remote-2' },
      { ShipmentID: 'shipment-order-3', OrderID: 'order-3', ShippingStatus: 'Retry Pending', AWBNumber: '', ProviderShipmentID: '' },
      { ShipmentID: 'shipment-order-4', OrderID: 'order-4', ShippingStatus: 'Retry Pending', AWBNumber: '', ProviderShipmentID: '' },
      { ShipmentID: 'shipment-order-5', OrderID: 'order-5', ShippingStatus: 'Retry Pending', AWBNumber: 'EXISTING-AWB', ProviderShipmentID: 'remote-5' },
    ],
    ADDRESSES: [1, 2, 3, 4, 5].map((number) => ({
      AddressID: `address-${number}`,
      FullName: 'Customer',
      Phone: '9999999999',
      AddressLine1: 'Address',
      City: 'Delhi',
      State: 'Delhi',
      Pincode: '110030'
    })),
    ORDER_ITEMS: [1, 2, 3, 4, 5].map((number) => ({
      OrderID: `order-${number}`,
      ProductID: 'product-1',
      ProductName: 'Makhana',
      Quantity: 1,
      Price: 499
    })),
  };
  const createCalls = [];
  const report = await recoverPendingShipments(
    { correlationId: 'recovery-test', limit: 25 },
    {
      sheets: { async getRows(name) { return data[name].map((row) => ({ ...row })); } },
      provider: {
        configured: () => true,
        configurationErrors: () => [],
        findByExternalOrderId: async (orderNumber) => orderNumber === 'LP-2' ? { providerShipmentId: 'remote-2' } : null
      },
      createShipment: async (order, provider, context) => {
        createCalls.push({ orderId: order.OrderID, provider, context });
        return {
          ShipmentID: `shipment-${order.OrderID}`,
          ProviderShipmentID: order.OrderID === 'order-2' ? 'remote-2' : 'remote-1',
          AWBNumber: order.OrderID === 'order-2' ? 'AWB-2' : 'AWB-1',
          CourierName: 'Courier',
          ShippingStatus: 'Pickup Requested',
          PickupStatus: 'Pickup Scheduled'
        };
      },
      log: silent
    }
  );

  assert.deepEqual(createCalls.map((call) => call.orderId), ['order-1', 'order-2']);
  assert.ok(createCalls.every((call) => call.provider === 'shiprocket' && call.context.allowFallback === false));
  assert.equal(report.counts.recovered, 1);
  assert.equal(report.counts.duplicates, 1);
  assert.equal(report.counts.skipped, 3);
  assert.equal(report.counts.failed, 0);
});
