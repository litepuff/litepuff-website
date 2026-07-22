import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const RATE_CODES = new Set([4, 17, 32, 80007, 130429, 131048]);
const TEMPLATE_CODES = new Set([132000, 132001, 132015, 132016]);
const mapping = (metaCode, status) => {
  if (metaCode === 190) return { status: 503, code: 'WHATSAPP_ACCESS_TOKEN_INVALID', message: 'WhatsApp authentication is unavailable.', retryable: false };
  if (metaCode === 131026) return { status: 422, code: 'WHATSAPP_PHONE_UNREACHABLE', message: 'This phone number cannot receive WhatsApp messages.', retryable: false };
  if (TEMPLATE_CODES.has(metaCode)) return { status: 503, code: metaCode === 132001 ? 'WHATSAPP_TEMPLATE_MISSING' : 'WHATSAPP_TEMPLATE_REJECTED', message: 'WhatsApp authentication template is unavailable.', retryable: false };
  if (RATE_CODES.has(metaCode) || status === 429) return { status: 429, code: 'WHATSAPP_RATE_LIMITED', message: 'WhatsApp delivery is temporarily rate limited.', retryable: true };
  return { status: status >= 500 ? 503 : 502, code: 'WHATSAPP_DELIVERY_FAILED', message: 'WhatsApp message could not be delivered.', retryable: status >= 500 };
};

export class MetaWhatsAppClient {
  constructor({ config = env, request = globalThis.fetch } = {}) { this.config = config; this.request = request; }
  configured() { return Boolean(this.config.whatsappAccessToken && this.config.whatsappPhoneNumberId && this.config.whatsappBusinessAccountId); }
  async sendTemplate({ to, template }) {
    if (!this.configured()) throw new AppError('WhatsApp Cloud API is not configured.', { status: 503, code: 'WHATSAPP_NOT_CONFIGURED' });
    try {
      const response = await this.request(`https://graph.facebook.com/${this.config.metaApiVersion}/${this.config.whatsappPhoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${this.config.whatsappAccessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: String(to).slice(1), type: 'template', template }), signal: AbortSignal.timeout(this.config.whatsappTimeoutMs) });
      let payload = {}; try { payload = await response.json(); } catch {}
      if (!response.ok) { const metaCode = Number(payload?.error?.code || 0); const mapped = mapping(metaCode, response.status); throw new AppError(mapped.message, { status: mapped.status, code: mapped.code, details: { retryable: mapped.retryable, metaCode: metaCode || undefined } }); }
      const messageId = payload?.messages?.[0]?.id; if (!messageId) throw new AppError('Meta did not accept the WhatsApp message.', { status: 502, code: 'WHATSAPP_INVALID_RESPONSE', details: { retryable: false } });
      return { messageId, status: payload?.messages?.[0]?.message_status || 'accepted' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'; throw new AppError(timedOut ? 'WhatsApp delivery timed out.' : 'WhatsApp network request failed.', { status: timedOut ? 504 : 503, code: timedOut ? 'WHATSAPP_TIMEOUT' : 'WHATSAPP_NETWORK_ERROR', details: { retryable: true } });
    }
  }
}
export const metaWhatsAppClient = new MetaWhatsAppClient();
