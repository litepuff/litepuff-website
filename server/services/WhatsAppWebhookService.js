import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { whatsAppHealth } from '../health/WhatsAppHealth.js';
import { logger } from '../utils/logger.js';
import { parseWebhookPayload, validateVerificationQuery, validateWebhookPayload } from '../utils/WebhookValidator.js';
import { AppError } from '../utils/AppError.js';
import { webhookEventProcessor } from './WebhookEventProcessor.js';

export class WhatsAppWebhookService {
  constructor({ config = whatsAppConfig, health = whatsAppHealth, log = logger, processor = webhookEventProcessor } = {}) { this.config = config; this.health = health; this.log = log; this.processor = processor; }

  verify(query) {
    const verification = validateVerificationQuery(query);
    if (!this.config.whatsappVerifyToken) throw new AppError('WhatsApp webhook verification is unavailable.', { status: 503, code: 'WHATSAPP_WEBHOOK_DISABLED', expose: true });
    if (!verification.validShape || verification.token !== this.config.whatsappVerifyToken) {
      this.log.warn('whatsapp.webhook.verification-failed', { mode: verification.mode || null });
      throw new AppError('Webhook verification failed.', { status: 403, code: 'WHATSAPP_WEBHOOK_VERIFICATION_FAILED', expose: true });
    }
    this.log.info('whatsapp.webhook.verification-succeeded');
    return verification.challenge;
  }

  async process(rawBody) {
    const payload = parseWebhookPayload(rawBody);
    if (!validateWebhookPayload(payload)) throw new AppError('Malformed WhatsApp webhook payload.', { status: 400, code: 'WHATSAPP_WEBHOOK_PAYLOAD_INVALID', expose: true });
    const result = await this.processor.process(payload);
    this.health.webhookReceived();
    this.log.info('whatsapp.webhook.received', { entryCount: payload.entry.length, eventCounts: result.eventCounts, processed: result.processed, failed: result.failed });
    return { received: true, ...result };
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
