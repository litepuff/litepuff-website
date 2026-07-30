import assert from 'node:assert/strict';
import test from 'node:test';
import { MetaConversionService } from '../services/meta/MetaConversionService.js';

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('Meta CAPI skips safely when configuration is incomplete', async () => {
  const service = new MetaConversionService({
    accessToken: '',
    pixelId: '',
    apiVersion: '',
    fetchImpl: async () => {
      throw new Error('fetch must not be called');
    },
  });
  const result = await service.pageView({ eventId: 'page-1' });
  assert.equal(result.skipped, true);
});

test('Meta CAPI sends a deduplicated Purchase payload', async () => {
  const calls = [];
  const service = new MetaConversionService({
    accessToken: 'token',
    pixelId: 'pixel',
    apiVersion: 'v23.0',
    testEventCode: 'TEST123',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(200, { events_received: 1, fbtrace_id: 'trace' });
    },
  });
  const result = await service.purchase({
    eventId: 'purchase-rzp_1',
    eventSourceUrl: 'https://litepuff.in/order-success/order-1',
    userData: {
      externalId: 'customer-1',
      email: 'Customer@Example.com ',
      phone: '+91 98765 43210',
      firstName: 'Aditi',
      lastName: 'Sharma',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      zip: '110001',
    },
    hashedUserData: { em: 'a'.repeat(64) },
    customData: {
      order_id: 'order-1',
      currency: 'INR',
      value: 249,
      content_ids: ['product-1'],
    },
  });
  const body = JSON.parse(calls[0].options.body);
  assert.equal(result.sent, true);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v23.0/pixel/events');
  assert.equal(body.data[0].event_name, 'Purchase');
  assert.equal(body.data[0].event_id, 'purchase-rzp_1');
  assert.equal(body.data[0].custom_data.order_id, 'order-1');
  assert.equal(body.test_event_code, 'TEST123');
  assert.notEqual(body.data[0].user_data.external_id[0], 'customer-1');
  assert.equal(body.data[0].user_data.em[0], 'a'.repeat(64));
  for (const field of ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'country', 'zp']) {
    assert.match(body.data[0].user_data[field][0], /^[a-f0-9]{64}$/);
  }
  assert.equal(JSON.stringify(body).includes('Customer@Example.com'), false);
  assert.equal(JSON.stringify(body).includes('98765'), false);
});

test('Meta CAPI retries temporary errors and stops after success', async () => {
  let attempts = 0;
  const service = new MetaConversionService({
    accessToken: 'token',
    pixelId: 'pixel',
    apiVersion: 'v23.0',
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? response(503, { error: { message: 'temporary' } })
        : response(200, { events_received: 1 });
    },
  });
  const result = await service.addToCart({
    eventId: 'cart-1',
    userData: { clientIp: '203.0.113.1', clientUserAgent: 'test' },
  });
  assert.equal(result.sent, true);
  assert.equal(attempts, 2);
});

test('Meta CAPI does not retry permanent validation errors', async () => {
  let attempts = 0;
  const service = new MetaConversionService({
    accessToken: 'token',
    pixelId: 'pixel',
    apiVersion: 'v23.0',
    fetchImpl: async () => {
      attempts += 1;
      return response(400, { error: { code: 100, message: 'invalid' } });
    },
  });
  const result = await service.viewContent({
    eventId: 'view-1',
    userData: { clientIp: '203.0.113.1', clientUserAgent: 'test' },
  });
  assert.equal(result.sent, false);
  assert.equal(attempts, 1);
});
