import test from 'node:test';
import assert from 'node:assert/strict';
import { ConversationRepository } from '../repositories/ConversationRepository.js';
import { SessionRepository } from '../repositories/SessionRepository.js';
import { CustomerSessionService } from '../services/CustomerSessionService.js';
import { ConversationStateService } from '../services/ConversationStateService.js';
import { ConversationRouter } from '../services/ConversationRouter.js';
import { ConversationEngine } from '../services/ConversationEngine.js';
import { IncomingMessageService } from '../services/IncomingMessageService.js';
import { MessageParserService } from '../services/MessageParserService.js';
import { WebhookEventRouter } from '../services/WebhookEventRouter.js';
import { WebhookEventProcessor } from '../services/WebhookEventProcessor.js';
import { WhatsAppWebhookService } from '../services/WhatsAppWebhookService.js';
import { WhatsAppDeliveryService } from '../services/WhatsAppDeliveryService.js';

class MemorySheets {
  constructor() { this.data = { WHATSAPP_CONVERSATIONS: [], WHATSAPP_SESSIONS: [], WHATSAPP_MESSAGES: [], ORDERS: [] }; }
  async readOne(sheet, predicate) { return this.data[sheet].find(predicate) || null; }
  async readRows(sheet, options = {}) { let rows = [...this.data[sheet]]; if (options.filter) rows = rows.filter(options.filter); return { rows, pagination: { total: rows.length } }; }
  async append(sheet, row) { const stored = { ...row, _row: this.data[sheet].length + 2 }; this.data[sheet].push(stored); return stored; }
  async update(sheet, rowNumber, row) { const index = this.data[sheet].findIndex((item) => item._row === rowNumber); this.data[sheet][index] = { ...row, _row: rowNumber }; return this.data[sheet][index]; }
}
const silent = { info() {}, warn() {}, error() {} };
const message = (type, content = {}) => ({ id: `wamid.${type}`, from: '919876543210', timestamp: '1784692800', type, [type]: content });

function fixture() {
  let now = Date.parse('2026-07-22T10:00:00Z'); const clock = () => new Date(now); const sheets = new MemorySheets();
  const conversations = new ConversationRepository({ sheets, clock }); const sessionRepo = new SessionRepository({ sheets, clock });
  const sessions = new CustomerSessionService({ sessions: sessionRepo, conversations, timeoutMinutes: 30, clock });
  const state = new ConversationStateService({ conversations, clock }); const engine = new ConversationEngine({ router: new ConversationRouter({ log: silent }), state });
  const health = { incomingMessage() {}, eventReceived() {}, webhookReceived() {} };
  const incoming = new IncomingMessageService({ customers: { findByPhone: async () => null }, sheets, sessions, engine, health, log: silent });
  const parser = new MessageParserService(); const deliveries = new WhatsAppDeliveryService({ clock });
  const router = new WebhookEventRouter({ parser, incoming, deliveries, health, log: silent }); const processor = new WebhookEventProcessor({ router, log: silent });
  const webhooks = new WhatsAppWebhookService({ config: { whatsappVerifyToken: 'verify' }, health, log: silent, processor });
  return { sheets, conversations, sessionRepo, sessions, state, engine, incoming, parser, deliveries, router, processor, webhooks, advance: (milliseconds) => { now += milliseconds; } };
}

async function processMessage(f, input) { const parsed = f.parser.parseMessage(input, { metadata: { phone_number_id: 'phone-id' } }); return f.incoming.process(parsed); }

test('incoming text is normalized, classified, routed, and stored', async () => { const f = fixture(); const result = await processMessage(f, message('text', { body: 'Hello LitePuff' })); assert.equal(result.intent, 'greeting'); assert.equal(result.handler, 'text'); assert.equal(f.sheets.data.WHATSAPP_CONVERSATIONS[0].LastMessageType, 'text'); });
test('incoming image routes to image handler and media intent', async () => { const f = fixture(); const result = await processMessage(f, message('image', { id: 'media-image', mime_type: 'image/jpeg' })); assert.equal(result.handler, 'image'); assert.equal(result.intent, 'media_upload'); });
test('incoming audio routes to audio handler', async () => { const f = fixture(); assert.equal((await processMessage(f, message('audio', { id: 'media-audio' }))).handler, 'audio'); });
test('incoming video routes to video handler', async () => { const f = fixture(); assert.equal((await processMessage(f, message('video', { id: 'media-video' }))).handler, 'video'); });
test('incoming document routes to document handler', async () => { const f = fixture(); assert.equal((await processMessage(f, message('document', { id: 'media-doc', filename: 'invoice.pdf' }))).handler, 'document'); });
test('interactive button replies are normalized and routed', async () => { const f = fixture(); const input = message('interactive', { type: 'button_reply', button_reply: { id: 'track_order', title: 'Track order' } }); assert.equal((await processMessage(f, input)).handler, 'button_reply'); });
test('interactive list replies are normalized and routed', async () => { const f = fixture(); const input = message('interactive', { type: 'list_reply', list_reply: { id: 'support', title: 'Support' } }); assert.equal((await processMessage(f, input)).handler, 'list_reply'); });
test('incoming location routes to location handler', async () => { const f = fixture(); assert.equal((await processMessage(f, message('location', { latitude: 19.076, longitude: 72.8777 }))).handler, 'location'); });
test('incoming contacts and reactions are accepted and routed', async () => { const f = fixture(); assert.equal((await processMessage(f, message('contacts', [{ name: { formatted_name: 'LitePuff' } }]))).handler, 'contacts'); const reaction = await processMessage(f, message('reaction', { message_id: 'wamid.x', emoji: '👍' })); assert.equal(reaction.handler, 'reaction'); });
test('unknown message types are logged and ignored safely', async () => { const f = fixture(); const result = await processMessage(f, message('future_type', {})); assert.equal(result.handler, 'unknown'); assert.equal(result.intent, 'unknown'); });
test('malformed webhook payload is rejected safely', async () => { const f = fixture(); await assert.rejects(() => f.webhooks.process(Buffer.from('{bad')), (error) => error.code === 'WHATSAPP_WEBHOOK_PAYLOAD_INVALID'); });
test('active sessions resume and expired sessions create a new conversation', async () => { const f = fixture(); const first = await processMessage(f, message('text', { body: 'Hi' })); f.advance(5 * 60_000); const second = await processMessage(f, { ...message('text', { body: 'Order status' }), id: 'wamid.second' }); assert.equal(second.sessionId, first.sessionId); assert.equal(second.resumed, true); f.advance(31 * 60_000); const third = await processMessage(f, { ...message('text', { body: 'Help' }), id: 'wamid.third' }); assert.notEqual(third.sessionId, first.sessionId); assert.equal(third.resumed, false); assert.equal(f.sheets.data.WHATSAPP_SESSIONS[0].Status, 'expired'); });
test('delivery events update sent messages to delivered, read, failed, and retrying', async () => { const f = fixture(); const delivery = f.deliveries.create('text'); f.deliveries.markSent(delivery.deliveryId, 'wamid.outbound', 1); for (const status of ['delivered', 'read', 'failed', 'retry']) await f.router.route({ field: 'messages', value: { statuses: [{ id: 'wamid.outbound', recipient_id: '919876543210', status, timestamp: '1784692800' }] } }); assert.equal(f.deliveries.get(delivery.deliveryId).status, 'retrying'); });
test('webhook processor isolates unknown and malformed events while acknowledging valid payload', async () => { const f = fixture(); const payload = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'future', value: {} }, { field: 'messages', value: { messages: [{ type: 'text' }] } }] }] }; const result = await f.webhooks.process(Buffer.from(JSON.stringify(payload))); assert.equal(result.received, true); assert.equal(result.eventCounts.unknown, 1); assert.equal(result.failed, 1); });
