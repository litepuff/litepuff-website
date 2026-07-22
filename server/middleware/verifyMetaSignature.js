import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { verifyWebhookSignature } from '../utils/WebhookValidator.js';
import { logger } from '../utils/logger.js';
import { fail } from '../utils/apiResponse.js';

export function createVerifyMetaSignature(config = whatsAppConfig) {
  return function verifySignature(request, response, next) {
  if (!config.metaAppSecret) {
    logger.error('whatsapp.webhook.signature-disabled');
    return fail(response, 'WhatsApp webhook is not configured.', 503, {}, 'WHATSAPP_WEBHOOK_DISABLED');
  }
  const signature = request.get('x-hub-signature-256');
  if (!signature || !verifyWebhookSignature(request.body, signature, config.metaAppSecret)) {
    logger.warn('whatsapp.webhook.signature-rejected', { signaturePresent: Boolean(signature) });
    return fail(response, 'Invalid webhook signature.', 401, {}, 'WHATSAPP_SIGNATURE_INVALID');
  }
  logger.info('whatsapp.webhook.signature-verified');
  next();
  };
}

export const verifyMetaSignature = createVerifyMetaSignature();
