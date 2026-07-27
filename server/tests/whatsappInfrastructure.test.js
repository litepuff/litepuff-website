import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { WhatsAppConfig } from '../config/WhatsAppConfig.js';
import { WhatsAppWebhookService } from '../services/WhatsAppWebhookService.js';
import { WhatsAppHealthService } from '../services/WhatsAppHealthService.js';
import { WhatsAppHealth } from '../health/WhatsAppHealth.js';
import { createVerifyMetaSignature } from '../middleware/verifyMetaSignature.js';
import { verifyWebhookSignature } from '../utils/WebhookValidator.js';

const source = (overrides = {}) => ({
  WHATSAPP_ACCESS_TOKEN: 'access', WHATSAPP_PHONE_NUMBER_ID: 'phone-id', WHATSAPP_BUSINESS_ACCOUNT_ID: 'business-id',
  WHATSAPP_VERIFY_TOKEN: 'verify-value', META_APP_ID: 'app-id', META_APP_SECRET: 'app-secret', META_API_VERSION: 'v23.0',
  WHATSAPP_OTP_TEMPLATE: 'otp_verification', ORDER_CONFIRMED_TEMPLATE: 'order_confirmed',
  ORDER_SHIPPED_TEMPLATE: 'order_shipped', ORDER_DELIVERED_TEMPLATE: 'order_delivered',
  PAYMENT_SUCCESS_TEMPLATE: 'payment_success', PAYMENT_FAILED_TEMPLATE: 'payment_failed',
  WHATSAPP_TIMEOUT_MS: '1000', WHATSAPP_MAX_RETRIES: '2', WHATSAPP_TEMPLATE_LANGUAGE: 'en_US', ...overrides
});
const silent = { info() {}, warn() {}, error() {} };

test('WhatsApp configuration validates required and invalid values without throwing', () => {
  const valid = new WhatsAppConfig(source());
  assert.equal(valid.configured, true);
  assert.equal(valid.publicState().reason, null);
  assert.equal(valid.whatsappAuthTemplate, 'otp_verification');
  assert.equal(valid.whatsappOrderTemplate, 'order_confirmed');
  assert.equal(valid.whatsappShippingTemplate, 'order_shipped');
  assert.equal(valid.whatsappDeliveredTemplate, 'order_delivered');
  assert.equal(valid.whatsappPaymentSuccessTemplate, 'payment_success');
  assert.equal(valid.whatsappPaymentFailedTemplate, 'payment_failed');
  const missing = new WhatsAppConfig({});
  assert.equal(missing.configured, false);
  assert.ok(missing.validation.missing.includes('WHATSAPP_VERIFY_TOKEN'));
  const invalid = new WhatsAppConfig(source({ META_API_VERSION: '23', WHATSAPP_TIMEOUT_MS: 'zero' }));
  assert.equal(invalid.configured, false);
  assert.deepEqual([...invalid.validation.invalid].sort(), ['META_API_VERSION', 'WHATSAPP_TIMEOUT_MS']);
});

test('Meta verification returns the exact challenge and rejects invalid inputs', () => {
  const service = new WhatsAppWebhookService({ config: new WhatsAppConfig(source()), health: new WhatsAppHealth(), log: silent });
  assert.equal(service.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-value', 'hub.challenge': '12345' }), '12345');
  assert.throws(() => service.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' }), (error) => error.status === 403);
  assert.throws(() => service.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-value' }), (error) => error.code === 'WHATSAPP_WEBHOOK_VERIFICATION_FAILED');
  const disabled = new WhatsAppWebhookService({ config: new WhatsAppConfig(source({ WHATSAPP_VERIFY_TOKEN: '' })), health: new WhatsAppHealth(), log: silent });
  assert.throws(() => disabled.verify({}), (error) => error.code === 'WHATSAPP_WEBHOOK_DISABLED');
});

test('signature verification uses SHA-256 and rejects tampered bodies', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
  const signature = `sha256=${crypto.createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
  assert.equal(verifyWebhookSignature(body, signature, 'app-secret'), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), signature, 'app-secret'), false);
  assert.equal(verifyWebhookSignature(body, '', 'app-secret'), false);
});

test('signature middleware fails closed for missing and invalid headers', () => {
  const body = Buffer.from('{}');
  const config = { metaAppSecret: 'app-secret' };
  const middleware = createVerifyMetaSignature(config);
  const response = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  middleware({ body, get: () => undefined }, response, () => assert.fail('must not continue'));
  assert.equal(response.statusCode, 401);
  middleware({ body, get: () => 'sha256=bad' }, response, () => assert.fail('must not continue'));
  assert.equal(response.statusCode, 401);
  const signature = `sha256=${crypto.createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
  let continued = false;
  middleware({ body, get: () => signature }, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('webhook service safely classifies unknown events and rejects malformed payloads', async () => {
  const health = new WhatsAppHealth(() => new Date('2026-07-22T00:00:00Z'));
  const service = new WhatsAppWebhookService({ config: new WhatsAppConfig(source()), health, log: silent });
  const result = await service.process(Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'future_event', value: {} }] }] })));
  assert.deepEqual(result.eventCounts, { unknown: 1 });
  assert.equal(health.lastWebhookReceived, '2026-07-22T00:00:00.000Z');
  await assert.rejects(() => service.process(Buffer.from('{bad')), (error) => error.code === 'WHATSAPP_WEBHOOK_PAYLOAD_INVALID');
});

test('health service reports connected and disabled configurations safely', async () => {
  const health = new WhatsAppHealth();
  const enabled = new WhatsAppHealthService({ config: new WhatsAppConfig(source()), client: { validateConnection: async () => ({ connected: true }) }, health, sessions: { activeCount: async () => 0 }, conversationState: { activeCount: async () => 0 } });
  assert.equal((await enabled.check()).connected, true);
  const disabled = new WhatsAppHealthService({ config: new WhatsAppConfig({}), client: { validateConnection: async () => assert.fail('must not probe') }, health: new WhatsAppHealth() });
  const diagnostic = await disabled.check();
  assert.equal(diagnostic.configured, false);
  assert.match(diagnostic.reason, /Missing/);
});
