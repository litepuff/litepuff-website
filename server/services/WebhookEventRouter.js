import { messageParserService } from './MessageParserService.js';
import { incomingMessageService } from './IncomingMessageService.js';
import { whatsAppDeliveryService, WHATSAPP_DELIVERY_STATUS } from './WhatsAppDeliveryService.js';
import { whatsAppHealth } from '../health/WhatsAppHealth.js';
import { logger } from '../utils/logger.js';
import { messageRepository } from '../repositories/MessageRepository.js';

const DELIVERY_STATUS = Object.freeze({ sent: WHATSAPP_DELIVERY_STATUS.SENT, delivered: WHATSAPP_DELIVERY_STATUS.DELIVERED, read: WHATSAPP_DELIVERY_STATUS.READ, failed: WHATSAPP_DELIVERY_STATUS.FAILED, retry: WHATSAPP_DELIVERY_STATUS.RETRYING, retrying: WHATSAPP_DELIVERY_STATUS.RETRYING });

export class WebhookEventRouter {
  constructor({ parser = messageParserService, incoming = incomingMessageService, deliveries = whatsAppDeliveryService, health = whatsAppHealth, log = logger, messages = null } = {}) { this.parser = parser; this.incoming = incoming; this.deliveries = deliveries; this.health = health; this.log = log; this.messages = messages; }
  async route(change = {}) {
    const value = change.value || {};
    if (change.field === 'message_template_status_update') { const event = this.parser.parseTemplateStatus(value); this.health.eventReceived?.(event.eventType); return [{ type: event.eventType, status: event.status }]; }
    const results = [];
    for (const status of Array.isArray(value.statuses) ? value.statuses : []) { const event = this.parser.parseStatus(status); const mapped = DELIVERY_STATUS[event.status]; if (mapped) { this.deliveries.updateByProviderMessageId(event.messageId, mapped); if (this.messages) await this.messages.updateDelivery(event.messageId, mapped); } this.health.eventReceived?.(event.eventType); results.push({ type: event.eventType, status: event.status, tracked: Boolean(mapped) }); }
    for (const message of Array.isArray(value.messages) ? value.messages : []) { const event = this.parser.parseMessage(message, value); const processed = await this.incoming.process(event); this.health.eventReceived?.(event.messageType); results.push({ type: event.messageType, processed }); }
    for (const error of Array.isArray(value.errors) ? value.errors : []) { const event = this.parser.parseError(error, value); this.health.eventReceived?.(event.eventType); this.log.warn('whatsapp.webhook.provider-error', { errorCode: event.errorCode }); results.push({ type: event.eventType, errorCode: event.errorCode }); }
    if (!results.length && Array.isArray(value.contacts) && value.contacts.length) { this.health.eventReceived?.('contacts'); results.push({ type: 'contacts', count: value.contacts.length }); }
    if (!results.length) { this.health.eventReceived?.('unknown'); this.log.warn('whatsapp.webhook.unknown-event', { field: change.field || null }); results.push({ type: 'unknown', ignored: true }); }
    return results;
  }
}
export const webhookEventRouter = new WebhookEventRouter({ messages: messageRepository });
