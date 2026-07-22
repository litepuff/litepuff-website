import { whatsAppConfig } from './WhatsAppConfig.js';
import { AppError } from '../utils/AppError.js';

const RATE_CODES = new Set([4, 17, 32, 80007, 130429, 131048]);
const TEMPLATE_CODES = new Set([132000, 132001, 132015, 132016]);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function mapMetaError(metaCode, status) {
  if (metaCode === 190) return { status: 503, code: 'WHATSAPP_ACCESS_TOKEN_INVALID', message: 'WhatsApp authentication is unavailable.', retryable: false };
  if ([10, 200, 299].includes(metaCode) || status === 403) return { status: 403, code: 'WHATSAPP_PERMISSION_DENIED', message: 'WhatsApp request permission was denied.', retryable: false };
  if (metaCode === 131026) return { status: 422, code: 'WHATSAPP_PHONE_UNREACHABLE', message: 'This phone number cannot receive WhatsApp messages.', retryable: false };
  if ([131052, 131053].includes(metaCode)) return { status: 422, code: 'WHATSAPP_MEDIA_UPLOAD_FAILED', message: 'WhatsApp media could not be processed.', retryable: false };
  if (TEMPLATE_CODES.has(metaCode)) return { status: 503, code: metaCode === 132001 ? 'WHATSAPP_TEMPLATE_MISSING' : 'WHATSAPP_TEMPLATE_REJECTED', message: 'WhatsApp template is unavailable.', retryable: false };
  if (RATE_CODES.has(metaCode) || status === 429) return { status: 429, code: 'WHATSAPP_RATE_LIMITED', message: 'WhatsApp delivery is temporarily rate limited.', retryable: true };
  if (status === 400) return { status: 400, code: 'WHATSAPP_REQUEST_INVALID', message: 'WhatsApp rejected the request.', retryable: false };
  if (status === 401) return { status: 503, code: 'WHATSAPP_ACCESS_TOKEN_INVALID', message: 'WhatsApp authentication is unavailable.', retryable: false };
  if (status === 404) return { status: 404, code: 'WHATSAPP_RESOURCE_NOT_FOUND', message: 'WhatsApp resource was not found.', retryable: false };
  return { status: 503, code: 'WHATSAPP_DELIVERY_FAILED', message: 'WhatsApp request failed.', retryable: true };
}

export class MetaClient {
  constructor({ config = whatsAppConfig, request = globalThis.fetch, wait = delay } = {}) {
    this.config = config;
    this.request = request;
    this.wait = wait;
    this.handlesRetries = true;
  }

  configured() { return Boolean(this.config.outboundConfigured ?? (this.config.whatsappAccessToken && this.config.whatsappPhoneNumberId && this.config.whatsappBusinessAccountId)); }
  endpoint(path = '') { return `https://graph.facebook.com/${this.config.metaApiVersion}/${path}`; }

  async execute(path, options = {}, { retries = this.config.whatsappMaxRetries } = {}) {
    if (!this.configured()) throw new AppError('WhatsApp Cloud API is not configured.', { status: 503, code: 'WHATSAPP_NOT_CONFIGURED', expose: true });
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await this.request(this.endpoint(path), {
          ...options,
          headers: { Authorization: `Bearer ${this.config.whatsappAccessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
          signal: AbortSignal.timeout(this.config.whatsappTimeoutMs)
        });
        let payload = {}; try { payload = await response.json(); } catch {}
        if (!response.ok) {
          const mapped = mapMetaError(Number(payload?.error?.code || 0), response.status);
          const error = new AppError(mapped.message, { status: mapped.status, code: mapped.code, details: { retryable: mapped.retryable, metaCode: Number(payload?.error?.code || 0) || undefined }, expose: true });
          if (!mapped.retryable || attempt >= retries) throw error;
          lastError = error;
        } else return payload;
      } catch (error) {
        if (error instanceof AppError && !error.details?.retryable) throw error;
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        lastError = error instanceof AppError ? error : new AppError(timedOut ? 'WhatsApp request timed out.' : 'WhatsApp network request failed.', { status: timedOut ? 504 : 503, code: timedOut ? 'WHATSAPP_TIMEOUT' : 'WHATSAPP_NETWORK_ERROR', details: { retryable: true }, expose: true });
        if (attempt >= retries) throw lastError;
      }
      await this.wait(Math.min(250 * (2 ** attempt), 2000));
    }
    throw lastError;
  }

  async sendTemplate({ to, template }) {
    const payload = await this.execute(`${this.config.whatsappPhoneNumberId}/messages`, { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: String(to).replace(/^\+/, ''), type: 'template', template }) });
    const messageId = payload?.messages?.[0]?.id;
    if (!messageId) throw new AppError('Meta did not accept the WhatsApp message.', { status: 502, code: 'WHATSAPP_INVALID_RESPONSE', details: { retryable: false }, expose: true });
    return { messageId, status: payload.messages[0].message_status || 'accepted' };
  }

  async sendMessage(message, { retries = this.config.whatsappMaxRetries } = {}) {
    const payload = await this.execute(`${this.config.whatsappPhoneNumberId}/messages`, { method: 'POST', body: JSON.stringify(message) }, { retries });
    const accepted = payload?.messages?.[0];
    if (!accepted?.id) throw new AppError('Meta did not accept the WhatsApp message.', { status: 502, code: 'WHATSAPP_INVALID_RESPONSE', details: { retryable: false }, expose: true });
    return { messageId: accepted.id, status: accepted.message_status || 'accepted' };
  }

  async validateConnection() {
    const payload = await this.execute(`${this.config.whatsappPhoneNumberId}?fields=id,display_phone_number,verified_name`, { method: 'GET' }, { retries: 0 });
    return { connected: payload?.id === this.config.whatsappPhoneNumberId, phoneNumberId: payload?.id || null, displayPhoneNumber: payload?.display_phone_number || null, verifiedName: payload?.verified_name || null };
  }
}

export const metaClient = new MetaClient();
