import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export function createVerifyShiprocketWebhook(expectedToken = env.shiprocketWebhookToken) {
  return function verifyWebhook(request, response, next) {
  const supplied = request.get('x-api-key');
  if (!expectedToken) {
    logger.error('shipping.webhook.disabled', { correlationId: request.id });
    return response.status(503).json({ success: false, code: 'SHIPPING_WEBHOOK_DISABLED', message: 'Shipping webhook is not configured.' });
  }
  if (!supplied || !safeEqual(supplied, expectedToken)) {
    logger.warn('shipping.webhook.unauthorized', { correlationId: request.id, tokenPresent: Boolean(supplied) });
    return response.status(401).json({ success: false, code: 'SHIPPING_WEBHOOK_UNAUTHORIZED', message: 'Invalid shipping webhook token.' });
  }
  next();
  };
}

export const verifyShiprocketWebhook = createVerifyShiprocketWebhook();
