import test from 'node:test';
import assert from 'node:assert/strict';
import { WhatsAppMessagingService } from '../services/WhatsAppMessagingService.js';
import { WhatsAppTemplateService } from '../services/WhatsAppTemplateService.js';
import { WhatsAppMediaService } from '../services/WhatsAppMediaService.js';
import { WhatsAppValidationService } from '../services/WhatsAppValidationService.js';
import { WhatsAppDeliveryService } from '../services/WhatsAppDeliveryService.js';
import { WhatsAppRetryService } from '../services/WhatsAppRetryService.js';
import { WhatsAppQueueService, ImmediateQueueAdapter } from '../services/WhatsAppQueueService.js';
import { PhoneNumberValidator } from '../validators/PhoneNumberValidator.js';
import { TemplateValidator } from '../validators/TemplateValidator.js';
import { WhatsAppHealthService } from '../services/WhatsAppHealthService.js';
import { WhatsAppHealth } from '../health/WhatsAppHealth.js';
import { MetaClient } from '../config/MetaClient.js';

const silent = { info() {}, warn() {}, error() {} };
const config = { outboundConfigured: true, configured: true, webhookConfigured: true, metaAppSecret: 'secret', metaApiVersion: 'v23.0', whatsappPhoneNumberId: 'phone-id', whatsappBusinessAccountId: 'business-id', whatsappAccessToken: 'token', whatsappTimeoutMs: 1000, whatsappMaxRetries: 2, whatsappTemplateLanguage: 'en', whatsappAuthTemplate: 'litepuff_authentication', whatsappOrderTemplate: 'litepuff_order_confirmation', whatsappShippingTemplate: 'litepuff_shipping_update', whatsappMarketingTemplate: 'litepuff_marketing', publicState: () => ({ configured: true, outboundConfigured: true, webhookConfigured: true, apiVersion: 'v23.0', phoneNumberId: 'phone-id', businessAccountId: 'business-id', reason: null }) };

function fixture(client = { sendMessage: async () => ({ messageId: 'wamid.1', status: 'accepted' }) }) {
  const templates = new WhatsAppTemplateService({ config }); const deliveries = new WhatsAppDeliveryService(); const retries = new WhatsAppRetryService({ maxRetries: 2, wait: async () => {}, log: silent }); const queue = new WhatsAppQueueService({ adapter: new ImmediateQueueAdapter(), log: silent });
  const messaging = new WhatsAppMessagingService({ client, config, templates, media: new WhatsAppMediaService(), validation: new WhatsAppValidationService(), deliveries, retries, queue, log: silent });
  return { messaging, templates, deliveries, retries, queue };
}

test('template and text messages use the centralized Meta client payload path', async () => {
  const payloads = []; const f = fixture({ sendMessage: async (payload) => { payloads.push(payload); return { messageId: `wamid.${payloads.length}`, status: 'accepted' }; } });
  const template = await f.messaging.sendTemplate({ to: '+919876543210', template: 'order_confirmation', variables: { orderNumber: 'LP-1', total: '499' } });
  const text = await f.messaging.sendText({ to: '+919876543210', text: 'Your LitePuff order is ready.' });
  assert.equal(template.status, 'sent'); assert.equal(text.status, 'sent');
  assert.equal(payloads[0].type, 'template'); assert.equal(payloads[0].to, '919876543210'); assert.equal(payloads[0].template.name, 'litepuff_order_confirmation');
  assert.equal(payloads[1].type, 'text'); assert.equal(payloads[1].text.body, 'Your LitePuff order is ready.');
});

test('image and document messages support media IDs and public HTTPS URLs', async () => {
  const payloads = []; const f = fixture({ sendMessage: async (payload) => { payloads.push(payload); return { messageId: `wamid.${payloads.length}` }; } });
  await f.messaging.sendImage({ to: '+919876543210', mediaId: 'media-1', caption: 'LitePuff' });
  await f.messaging.sendDocument({ to: '+919876543210', url: 'https://litepuff.in/invoice.pdf', filename: 'invoice.pdf', caption: 'Invoice' });
  assert.deepEqual(payloads[0].image, { id: 'media-1', caption: 'LitePuff' });
  assert.equal(payloads[1].document.link, 'https://litepuff.in/invoice.pdf'); assert.equal(payloads[1].document.filename, 'invoice.pdf');
});

test('media, phone, and template validation reject unsafe payloads', async () => {
  const f = fixture(); const phones = new PhoneNumberValidator(); const templates = new TemplateValidator();
  assert.equal(phones.validate('+919876543210'), '+919876543210');
  assert.throws(() => phones.validate('9876543210'), (error) => error.code === 'WHATSAPP_PHONE_INVALID');
  assert.throws(() => templates.validateName('Bad Template'), (error) => error.code === 'WHATSAPP_TEMPLATE_INVALID');
  assert.throws(() => f.templates.resolve('order_confirmation', { variables: { orderNumber: 'LP-1' } }), (error) => error.code === 'WHATSAPP_TEMPLATE_PARAMETERS_INVALID');
  assert.throws(() => f.messaging.sendImage({ to: '+919876543210', url: 'http://unsafe.test/image.jpg' }), (error) => error.code === 'WHATSAPP_MEDIA_URL_INVALID');
  assert.throws(() => f.messaging.sendAudio({ to: '+919876543210', mediaId: 'audio', caption: 'invalid' }), (error) => error.code === 'WHATSAPP_MEDIA_METADATA_INVALID');
});

test('retry engine retries transient errors and never retries permanent errors', async () => {
  let transientAttempts = 0; const transient = fixture({ sendMessage: async () => { transientAttempts += 1; if (transientAttempts < 3) { const error = new Error('rate'); error.status = 429; error.code = 'WHATSAPP_RATE_LIMITED'; throw error; } return { messageId: 'wamid.ok' }; } });
  const sent = await transient.messaging.sendText({ to: '+919876543210', text: 'Retry me' }); assert.equal(sent.attempts, 3); assert.equal(transientAttempts, 3);
  let permanentAttempts = 0; const permanent = fixture({ sendMessage: async () => { permanentAttempts += 1; const error = new Error('bad token'); error.status = 503; error.code = 'WHATSAPP_ACCESS_TOKEN_INVALID'; error.details = { retryable: false }; throw error; } });
  await assert.rejects(() => permanent.messaging.sendText({ to: '+919876543210', text: 'Fail once' }), (error) => error.code === 'WHATSAPP_ACCESS_TOKEN_INVALID'); assert.equal(permanentAttempts, 1);
});

test('queue and delivery services expose adapter-neutral state and timestamps', async () => {
  const f = fixture(); const result = await f.messaging.sendLocation({ to: '+919876543210', latitude: 19.076, longitude: 72.8777, name: 'Mumbai' });
  assert.equal(f.queue.diagnostics().adapter, 'ImmediateQueueAdapter'); assert.equal(f.queue.diagnostics().processed, 1);
  assert.equal(f.deliveries.get(result.deliveryId).status, 'sent'); assert.ok(f.deliveries.get(result.deliveryId).queuedAt); assert.ok(f.deliveries.get(result.deliveryId).sentAt);
});

test('Meta error mapping distinguishes permission and media failures', async () => {
  const response = (code, status) => async () => ({ ok: false, status, json: async () => ({ error: { code } }) });
  const permission = new MetaClient({ config, request: response(10, 403), wait: async () => {} });
  await assert.rejects(() => permission.sendMessage({ type: 'text' }, { retries: 0 }), (error) => error.code === 'WHATSAPP_PERMISSION_DENIED');
  const media = new MetaClient({ config, request: response(131052, 400), wait: async () => {} });
  await assert.rejects(() => media.sendMessage({ type: 'image' }, { retries: 0 }), (error) => error.code === 'WHATSAPP_MEDIA_UPLOAD_FAILED');
});

test('WhatsApp health includes messaging, queue, retry, template, and delivery state', async () => {
  const f = fixture(); await f.messaging.sendText({ to: '+919876543210', text: 'Health' });
  const service = new WhatsAppHealthService({ config, client: { validateConnection: async () => ({ connected: true }) }, health: new WhatsAppHealth(), messaging: f.messaging, sessions: { activeCount: async () => 0 }, conversationState: { activeCount: async () => 0 } });
  const health = await service.check(); assert.equal(health.messagingEnabled, true); assert.equal(health.queueStatus.healthy, true); assert.equal(health.retryStatus.maxRetries, 2); assert.equal(health.templateCount, 16); assert.ok(health.lastSent);
});
