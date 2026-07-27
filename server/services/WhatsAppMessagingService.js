import { metaClient } from '../config/MetaClient.js';
import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { templateMessageBuilder } from '../builders/TemplateMessageBuilder.js';
import { textMessageBuilder } from '../builders/TextMessageBuilder.js';
import { locationMessageBuilder } from '../builders/LocationMessageBuilder.js';
import { interactiveMessageBuilder } from '../builders/InteractiveMessageBuilder.js';
import { contactMessageBuilder } from '../builders/ContactMessageBuilder.js';
import { whatsAppTemplateService } from './WhatsAppTemplateService.js';
import { whatsAppMediaService } from './WhatsAppMediaService.js';
import { whatsAppValidationService } from './WhatsAppValidationService.js';
import { whatsAppDeliveryService, WHATSAPP_DELIVERY_STATUS } from './WhatsAppDeliveryService.js';
import { whatsAppRetryService } from './WhatsAppRetryService.js';
import { whatsAppQueueService } from './WhatsAppQueueService.js';
import { logger } from '../utils/logger.js';

export class WhatsAppMessagingService {
  constructor({ client = metaClient, config = whatsAppConfig, templates = whatsAppTemplateService, media = whatsAppMediaService, validation = whatsAppValidationService, deliveries = whatsAppDeliveryService, retries = whatsAppRetryService, queue = whatsAppQueueService, log = logger } = {}) {
    this.client = client; this.config = config; this.templates = templates; this.media = media; this.validation = validation; this.deliveries = deliveries; this.retries = retries; this.queue = queue; this.log = log;
  }

  async dispatch(type, payload) {
    this.validation.payload(payload);
    const delivery = this.deliveries.create(type);
    const logContext = {
      recipient: payload.to ? `***${String(payload.to).slice(-4)}` : undefined,
      template: payload.template?.name || undefined
    };
    return this.queue.enqueue(async () => {
      try {
        const { result, attempts } = await this.retries.execute(() => this.client.sendMessage(payload, { retries: 0 }), { deliveryId: delivery.deliveryId, onRetry: (attempt) => this.deliveries.markRetrying(delivery.deliveryId, attempt) });
        const sent = this.deliveries.markSent(delivery.deliveryId, result.messageId, attempts);
        this.log.info('whatsapp.message.sent', { deliveryId: delivery.deliveryId, messageId: result.messageId, messageType: type, status: sent.status, attempts, ...logContext });
        return { deliveryId: delivery.deliveryId, messageId: result.messageId, status: sent.status, queuedAt: sent.queuedAt, sentAt: sent.sentAt, attempts };
      } catch (error) {
        const failed = this.deliveries.markFailed(delivery.deliveryId, error, error.deliveryAttempts || this.deliveries.get(delivery.deliveryId)?.attempts || 1);
        this.log.error('whatsapp.message.failed', { deliveryId: delivery.deliveryId, messageType: type, code: error.code || 'WHATSAPP_DELIVERY_FAILED', attempts: failed?.attempts, ...logContext });
        throw error;
      }
    }, { type });
  }

  recipient(to) { return this.validation.recipient(to); }
  sendTemplate({ to, template, variables = {}, name, parameters = [], components }) { const recipient = this.recipient(to); const resolved = this.templates.resolve(template, { variables, name, parameters }); const payload = templateMessageBuilder.build({ to: recipient, name: resolved.name, language: this.config.whatsappTemplateLanguage, parameters: resolved.parameters, buttonParameters: resolved.buttonParameters, components }); return this.dispatch('template', payload); }
  sendText({ to, text, previewUrl }) { return this.dispatch('text', textMessageBuilder.build({ to: this.recipient(to), text, previewUrl })); }
  sendImage(input) { return this.sendMedia('image', input); }
  sendDocument(input) { return this.sendMedia('document', input); }
  sendVideo(input) { return this.sendMedia('video', input); }
  sendAudio(input) { return this.sendMedia('audio', input); }
  sendSticker(input) { return this.sendMedia('sticker', input); }
  sendMedia(type, input) { return this.dispatch(type, this.media.build(type, { ...input, to: this.recipient(input.to) })); }
  sendLocation(input) { return this.dispatch('location', locationMessageBuilder.build({ ...input, to: this.recipient(input.to) })); }
  sendContact(input) { return this.dispatch('contacts', contactMessageBuilder.build({ ...input, to: this.recipient(input.to) })); }
  sendInteractive(input) { return this.dispatch('interactive', interactiveMessageBuilder.build({ ...input, to: this.recipient(input.to) })); }
  delivery(deliveryId) { return this.deliveries.get(deliveryId); }
  updateDelivery(providerMessageId, status) { if (!Object.values(WHATSAPP_DELIVERY_STATUS).includes(status)) return null; return this.deliveries.updateByProviderMessageId(providerMessageId, status); }
  diagnostics() { return { enabled: this.config.outboundConfigured, queue: this.queue.diagnostics(), retry: this.retries.diagnostics(), templateCount: this.templates.count(), ...this.deliveries.diagnostics() }; }
}

export const whatsAppMessagingService = new WhatsAppMessagingService();
