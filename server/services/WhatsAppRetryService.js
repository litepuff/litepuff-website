import { whatsAppConfig } from '../config/WhatsAppConfig.js';
import { logger } from '../utils/logger.js';

const NEVER_RETRY_CODES = new Set(['WHATSAPP_ACCESS_TOKEN_INVALID', 'WHATSAPP_TEMPLATE_MISSING', 'WHATSAPP_TEMPLATE_REJECTED', 'WHATSAPP_TEMPLATE_INVALID', 'WHATSAPP_PHONE_INVALID', 'WHATSAPP_PERMISSION_DENIED', 'WHATSAPP_NOT_CONFIGURED']);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class WhatsAppRetryService {
  constructor({ maxRetries = whatsAppConfig.whatsappMaxRetries, wait = delay, log = logger } = {}) { this.maxRetries = maxRetries; this.wait = wait; this.log = log; this.activeRetries = 0; this.exhausted = 0; }
  retryable(error) { if (typeof error?.details?.retryable === 'boolean') return error.details.retryable; if (NEVER_RETRY_CODES.has(error?.code)) return false; const status = Number(error?.status || error?.statusCode); return error?.code === 'WHATSAPP_TIMEOUT' || error?.code === 'WHATSAPP_NETWORK_ERROR' || status === 429 || status >= 500; }
  async execute(operation, { deliveryId, onRetry } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      try { const result = await operation(attempt); if (attempt > 1) this.log.info('whatsapp.retry.succeeded', { deliveryId, attempt }); return { result, attempts: attempt }; }
      catch (error) {
        lastError = error;
        if (!this.retryable(error) || attempt > this.maxRetries) { error.deliveryAttempts = attempt; if (this.retryable(error)) { this.exhausted += 1; this.log.error('whatsapp.retry.exhausted', { deliveryId, attempts: attempt, code: error.code }); } throw error; }
        this.activeRetries += 1; onRetry?.(attempt + 1); this.log.warn('whatsapp.retry.started', { deliveryId, nextAttempt: attempt + 1, code: error.code });
        try { await this.wait(Math.min(250 * (2 ** (attempt - 1)), 2000)); } finally { this.activeRetries -= 1; }
      }
    }
    throw lastError;
  }
  diagnostics() { return { enabled: this.maxRetries > 0, maxRetries: this.maxRetries, activeRetries: this.activeRetries, exhausted: this.exhausted }; }
}
export const whatsAppRetryService = new WhatsAppRetryService();
