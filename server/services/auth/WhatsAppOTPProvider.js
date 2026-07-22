import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { WHATSAPP_TEMPLATE_TYPES } from './WhatsAppTemplateBuilder.js';
import { whatsAppMessagingService } from '../WhatsAppMessagingService.js';

export class WhatsAppOTPProvider {
  constructor({ messaging = whatsAppMessagingService, otpExpiresMinutes = env.otpExpiresMinutes } = {}) { this.messaging = messaging; this.otpExpiresMinutes = otpExpiresMinutes; this.name = 'whatsapp'; }
  async send({ identifier, code, purpose }) {
    try { const result = await this.messaging.sendTemplate({ to: identifier, template: WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION, variables: { code, expiresMinutes: this.otpExpiresMinutes } }); logger.info('auth.otp.sent', { provider: this.name, purpose, deliveryStatus: result.status }); return { providerMessageId: result.messageId, status: result.status }; }
    catch (error) { logger.error('auth.otp.delivery-failed', { provider: this.name, purpose, code: error.code || 'WHATSAPP_DELIVERY_FAILED' }); if (error instanceof AppError) throw error; throw new AppError('WhatsApp verification message could not be delivered.', { status: 503, code: 'WHATSAPP_DELIVERY_FAILED', details: { retryable: true } }); }
  }
}
export const whatsAppOtpProvider = new WhatsAppOTPProvider();
