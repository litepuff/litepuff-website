import crypto from 'crypto';

export const WEBHOOK_EVENT_TYPES = Object.freeze({
  MESSAGES: 'messages',
  MESSAGE_STATUS: 'message_status',
  MESSAGE_TEMPLATE_STATUS: 'message_template_status',
  ERRORS: 'errors',
  CONTACTS: 'contacts',
  INTERACTIVE: 'interactive',
  MESSAGE_REACTION: 'message_reaction',
  UNKNOWN: 'unknown'
});

export function validateVerificationQuery(query = {}) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  return {
    validShape: mode === 'subscribe' && typeof token === 'string' && token.length > 0 && typeof challenge === 'string' && challenge.length > 0,
    mode,
    token,
    challenge
  };
}

export function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!Buffer.isBuffer(rawBody) || !appSecret || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) return false;
  const receivedHex = signatureHeader.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export function parseWebhookPayload(rawBody) {
  if (Buffer.isBuffer(rawBody)) {
    try { return JSON.parse(rawBody.toString('utf8')); } catch { return null; }
  }
  return rawBody && typeof rawBody === 'object' ? rawBody : null;
}

export function validateWebhookPayload(payload) {
  return Boolean(payload && payload.object === 'whatsapp_business_account' && Array.isArray(payload.entry));
}

export function classifyWebhookChange(change = {}) {
  const value = change.value || {};
  if (change.field === 'message_template_status_update') return WEBHOOK_EVENT_TYPES.MESSAGE_TEMPLATE_STATUS;
  if (Array.isArray(value.errors) && value.errors.length) return WEBHOOK_EVENT_TYPES.ERRORS;
  if (Array.isArray(value.statuses) && value.statuses.length) return WEBHOOK_EVENT_TYPES.MESSAGE_STATUS;
  const messages = Array.isArray(value.messages) ? value.messages : [];
  if (messages.some((message) => message?.type === 'interactive')) return WEBHOOK_EVENT_TYPES.INTERACTIVE;
  if (messages.some((message) => message?.type === 'reaction')) return WEBHOOK_EVENT_TYPES.MESSAGE_REACTION;
  if (messages.length) return WEBHOOK_EVENT_TYPES.MESSAGES;
  if (Array.isArray(value.contacts) && value.contacts.length) return WEBHOOK_EVENT_TYPES.CONTACTS;
  return WEBHOOK_EVENT_TYPES.UNKNOWN;
}
