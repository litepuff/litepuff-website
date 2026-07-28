import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { WHATSAPP_TEMPLATE_TYPES } from './WhatsAppTemplateBuilder.js';
import { whatsAppMessagingService } from '../WhatsAppMessagingService.js';

const maskRecipient = (value) => {
  const recipient = String(value || '');
  const prefixLength = recipient.length > 10 ? recipient.length - 10 : Math.min(2, recipient.length);
  return `${recipient.slice(0, prefixLength)}${'*'.repeat(Math.max(4, recipient.length - prefixLength - 4))}${recipient.slice(-4)}`;
};

export class WhatsAppOTPProvider {
  constructor({ messaging = whatsAppMessagingService, otpExpiresMinutes = env.otpExpiresMinutes } = {}) { this.messaging = messaging; this.otpExpiresMinutes = otpExpiresMinutes; this.name = 'whatsapp'; }
  async send({ identifier, code, purpose }) {
    console.info('========================================');
    console.info('OTP TRACE START');
    console.info('========================================');
    console.info({ event: 'OTP Generated', provider: this.name, purpose, otp: '[REDACTED]' });
    console.info({ event: 'Recipient Normalized', recipient: maskRecipient(identifier) });
    try {
      const result = await this.messaging.sendTemplate({ to: identifier, template: WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION, variables: { code } });
      console.info({ event: 'Meta Response', messageId: result.messageId || null, deliveryStatus: result.status || null });
      logger.info('auth.otp.sent', { provider: this.name, purpose, deliveryStatus: result.status });
      return { providerMessageId: result.messageId, status: result.status };
    }
    catch (error) {
      console.error({ event: 'Meta Response', deliveryStatus: 'failed', errorCode: error.code || 'WHATSAPP_DELIVERY_FAILED' });
      console.error('========================================');
      console.error('OTP TRACE END');
      console.error({ result: 'failed-before-provider-acceptance' });
      console.error('========================================');
      logger.error('auth.otp.delivery-failed', { provider: this.name, purpose, code: error.code || 'WHATSAPP_DELIVERY_FAILED' });
      if (error instanceof AppError) throw error;
      throw new AppError('WhatsApp verification message could not be delivered.', { status: 503, code: 'WHATSAPP_DELIVERY_FAILED', details: { retryable: true } });
    }
  }
}
export const whatsAppOtpProvider = new WhatsAppOTPProvider();
