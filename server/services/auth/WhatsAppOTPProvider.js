import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { metaWhatsAppClient } from './MetaWhatsAppClient.js';
import { WHATSAPP_TEMPLATE_TYPES, whatsAppTemplateBuilder } from './WhatsAppTemplateBuilder.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
export class WhatsAppOTPProvider {
  constructor({ client = metaWhatsAppClient, templates = whatsAppTemplateBuilder, config = env, wait = delay } = {}) { this.client = client; this.templates = templates; this.config = config; this.wait = wait; this.name = 'whatsapp'; }
  async send({ identifier, code, purpose }) {
    const template = this.templates.build(WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION, { code, expiresMinutes: this.config.otpExpiresMinutes, purpose }); let lastError;
    for (let attempt = 0; attempt <= this.config.whatsappMaxRetries; attempt += 1) {
      try { const result = await this.client.sendTemplate({ to: identifier, template }); logger.info('auth.otp.sent', { provider: this.name, purpose, deliveryAttempt: attempt + 1, deliveryStatus: result.status }); return { providerMessageId: result.messageId, status: result.status }; }
      catch (error) { lastError = error; const retryable = error?.details?.retryable === true; if (!retryable || attempt >= this.config.whatsappMaxRetries) break; logger.warn('auth.otp.delivery-retry', { provider: this.name, purpose, deliveryAttempt: attempt + 1, code: error.code || 'WHATSAPP_DELIVERY_FAILED' }); await this.wait(Math.min(250 * (2 ** attempt), 2000)); }
    }
    logger.error('auth.otp.delivery-failed', { provider: this.name, purpose, code: lastError?.code || 'WHATSAPP_DELIVERY_FAILED' }); if (lastError instanceof AppError) throw lastError; throw new AppError('WhatsApp verification message could not be delivered.', { status: 503, code: 'WHATSAPP_DELIVERY_FAILED', details: { retryable: true } });
  }
}
export const whatsAppOtpProvider = new WhatsAppOTPProvider();
