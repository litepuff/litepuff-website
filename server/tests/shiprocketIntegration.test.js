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

test('Shiprocket AWB assignment retries once without courier id when the selected courier is not serviceable', async () => {
  const provider = new ShiprocketProvider();
  const requests = [];
  provider.call = async (path, options) => {
    assert.equal(path, '/courier/assign/awb');
    requests.push(JSON.parse(options.body));
    if (requests.length === 1) {
      throw Object.assign(new Error('Given courier not serviceable'), {
        providerStatus: 400,
        providerBody: { message: 'Given courier not serviceable' },
      });
    }
    return { response: { data: { awb_code: 'AWB-AUTO', courier_name: 'Auto Courier', awb_assign_status: 1 } } };
  };

  const result = await provider.assignAwb(7001, 10, {
    pickupPincode: '110030',
    deliveryPincode: '560001',
    weight: 0.5,
    paymentMethod: 'Prepaid',
  });

  assert.deepEqual(requests, [
    { shipment_id: 7001, courier_id: 10 },
    { shipment_id: 7001 },
  ]);
  assert.equal(result.awb, 'AWB-AUTO');
  assert.equal(result.courier, 'Auto Courier');
});

test('Shiprocket AWB assignment does not retry other provider failures', async () => {
  const provider = new ShiprocketProvider();
  let calls = 0;
  provider.call = async () => {
    calls += 1;
    throw Object.assign(new Error('Invalid shipment'), {
      providerStatus: 400,
      providerBody: { message: 'Invalid shipment' },
    });
  };

  await assert.rejects(() => provider.assignAwb(7001, 10), /Invalid shipment/);
  assert.equal(calls, 1);
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
  assert.equal(payload.billing_customer_name, 'Customer');
  assert.equal(payload.billing_last_name, '.');
  assert.equal(payload.shipping_customer_name, 'Customer');
  assert.equal(payload.shipping_last_name, '.');
});

test('Shiprocket payload safely splits multi-word customer names', async () => {
  const provider = new ShiprocketProvider();
  provider.findByExternalOrderId = async () => null;
  let payload;
  provider.call = async (path, options) => {
    if (path === '/orders/create/adhoc') {
      payload = JSON.parse(options.body);
      return { order_id: 8101, shipment_id: 9101, status: 'NEW' };
    }
    return {};
  };
  provider.assignAwb = async () => ({ awb: 'AWB-NAME', courier: 'Courier', status: 'AWB Assigned' });
  provider.requestPickup = async () => ({ pickupStatus: 'Pickup Scheduled', pickupDate: '2026-07-28' });
  provider.generateLabel = async () => 'https://example.test/label.pdf';
  provider.generateManifest = async () => 'https://example.test/manifest.pdf';

  await provider.create({
    OrderID: 'order-name',
    OrderNumber: 'LP-NAME',
    CreatedAt: '2026-07-27T10:00:00.000Z',
    PaymentMethod: 'Razorpay',
    GrandTotal: 499,
    Shipping: 0,
    email: 'customer@example.test',
    shippingAddress: {
      name: '  Rahul   Kumar Singh  ',
      phone: '9999999999',
      addressLine: 'Test address',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110030',
    },
    items: [{ productId: 'product-1', productName: 'Makhana', quantity: 1, price: 499 }],
  }, { courierId: 10, courier: 'Courier', cost: 50, estimatedDays: 3 });

  assert.equal(payload.billing_customer_name, 'Rahul');
  assert.equal(payload.billing_last_name, 'Kumar Singh');
  assert.equal(payload.shipping_customer_name, 'Rahul');
  assert.equal(payload.shipping_last_name, 'Kumar Singh');
});

test('pending shipment recovery is paid-order-only, idempotent and reports reconciled duplicates', async () => {
  const data = {
    ORDERS: [
      { OrderID: 'order-1', OrderNumber: 'LP-1', AddressID: 'address-1', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
      { OrderID: 'order-2', OrderNumber: 'LP-2', AddressID: 'address-2', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
      { OrderID: 'order-3', OrderNumber: 'LP-3', AddressID: 'address-3', PaymentMethod: 'Cash on Delivery', PaymentStatus: 'Pending', OrderStatus: 'Confirmed' },
      { OrderID: 'order-4', OrderNumber: 'LP-4', AddressID: 'address-4', PaymentStatus: 'Paid', OrderStatus: 'Cancelled' },
      { OrderID: 'order-5', OrderNumber: 'LP-5', AddressID: 'address-5', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' },
    ],
    PAYMENTS: [
      { OrderID: 'order-1', Status: 'Paid' },
      { OrderID: 'order-2', Status: 'Paid' },
      { OrderID: 'order-3', PaymentMethod: 'Cash on Delivery', Status: 'Pending' },
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

  assert.deepEqual(createCalls.map((call) => call.orderId), ['order-1', 'order-2', 'order-3']);
  assert.ok(createCalls.every((call) => call.provider === 'shiprocket' && call.context.allowFallback === false));
  assert.equal(report.counts.recovered, 2);
  assert.equal(report.counts.duplicates, 1);
  assert.equal(report.counts.skipped, 2);
  assert.equal(report.counts.failed, 0);
});

test('Shiprocket 422 diagnostics preserve complete validation errors and redact only credentials', async () => {
  const provider = new ShiprocketProvider();
  provider.authenticate = async () => 'test-token';
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    message: 'Oops! Invalid Data.',
    status_code: 422,
    errors: {
      billing_pincode: ['The billing pincode must be 6 digits.'],
      pickup_location: ['The selected pickup location is invalid.'],
      order_items: {
        0: {
          sku: ['The sku field is required.'],
          weight: ['The weight must be greater than zero.']
        }
      }
    },
    password: 'must-not-leak',
    api_token: 'must-not-leak',
    request_reference: 'validation-reference'
  }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    await assert.rejects(
      () => provider.call('/orders/create/adhoc', { method: 'POST', body: '{}' }),
      (error) => {
        assert.equal(error.providerStatus, 422);
        assert.equal(error.providerBody.message, 'Oops! Invalid Data.');
        assert.equal(error.providerBody.request_reference, 'validation-reference');
        assert.equal(error.providerBody.password, '[REDACTED]');
        assert.equal(error.providerBody.api_token, '[REDACTED]');
        assert.deepEqual(error.validationErrors.billing_pincode, ['The billing pincode must be 6 digits.']);
        assert.ok(error.validationFields.includes('billing_pincode'));
        assert.ok(error.validationFields.includes('pickup_location'));
        assert.ok(error.validationFields.includes('order_items.0.sku'));
        assert.ok(error.validationFields.includes('order_items.0.weight'));
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('recovery report returns complete Shiprocket validation diagnostics', async () => {
  const providerBody = {
    message: 'Oops! Invalid Data.',
    status_code: 422,
    errors: { billing_pincode: ['Invalid pincode.'], sku: ['SKU is required.'] }
  };
  const error = Object.assign(new Error('Oops! Invalid Data.'), {
    code: 'SHIPROCKET_VALIDATION_FAILED',
    providerStatus: 422,
    providerCode: 422,
    providerBody,
    validationErrors: providerBody.errors,
    validationFields: ['billing_pincode', 'sku'],
    retryable: false
  });
  const rows = {
    ORDERS: [{ OrderID: 'order-validation', OrderNumber: 'LP-VALIDATION', AddressID: 'address-validation', PaymentStatus: 'Paid', OrderStatus: 'Confirmed' }],
    PAYMENTS: [{ OrderID: 'order-validation', Status: 'Paid' }],
    SHIPMENTS: [{ ShipmentID: 'shipment-order-validation', OrderID: 'order-validation', ShippingStatus: 'Retry Pending', AWBNumber: '', ProviderShipmentID: '' }],
    ADDRESSES: [{ AddressID: 'address-validation', FullName: 'Customer', Phone: '9999999999', AddressLine1: 'Address', City: 'Delhi', State: 'Delhi', Pincode: '110030' }],
    ORDER_ITEMS: [{ OrderID: 'order-validation', ProductID: 'product-1', ProductName: 'Makhana', Quantity: 1, Price: 499 }]
  };
  const report = await recoverPendingShipments(
    { correlationId: 'validation-report-test' },
    {
      sheets: { async getRows(name) { return rows[name].map((row) => ({ ...row })); } },
      provider: {
        configured: () => true,
        configurationErrors: () => [],
        findByExternalOrderId: async () => null
      },
      createShipment: async () => { throw error; },
      log: silent
    }
  );

  assert.equal(report.counts.failed, 1);
  assert.deepEqual(report.failed[0].providerBody, providerBody);
  assert.deepEqual(report.failed[0].validationErrors, providerBody.errors);
  assert.deepEqual(report.failed[0].validationFields, ['billing_pincode', 'sku']);
});

test('local Shiprocket payload validation returns exact invalid field names', async () => {
  const provider = new ShiprocketProvider();
  provider.findByExternalOrderId = async () => null;
  await assert.rejects(
    () => provider.create({
      OrderID: 'order-invalid-fields',
      OrderNumber: '',
      CreatedAt: 123,
      PaymentMethod: 'Razorpay',
      GrandTotal: 0,
      Shipping: -1,
      shippingAddress: {
        name: '',
        phone: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: '123'
      },
      items: [{ productId: '', productName: '', quantity: 0, price: -1 }]
    }, { courierId: 10, courier: 'Courier' }),
    (error) => {
      assert.equal(error.code, 'SHIPROCKET_ORDER_PAYLOAD_INVALID');
      for (const field of [
        'order_id',
        'order_date',
        'billing_phone',
        'billing_address',
        'billing_city',
        'billing_state',
        'billing_pincode',
        'shipping_charges',
        'sub_total',
        'order_items[0].name',
        'order_items[0].sku',
        'order_items[0].units',
        'order_items[0].selling_price'
      ]) assert.ok(error.validationFields.includes(field), field);
      assert.ok(!error.validationFields.includes('package_dimensions_or_weight'));
      return true;
    }
  );
});
