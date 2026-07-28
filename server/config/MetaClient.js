import { whatsAppConfig } from './WhatsAppConfig.js';
import { AppError } from '../utils/AppError.js';

const RATE_CODES = new Set([4, 17, 32, 80007, 130429, 131048]);
const TEMPLATE_CODES = new Set([132000, 132001, 132015, 132016]);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseBody(body) {
  if (typeof body !== 'string') return body || {};
  try { return JSON.parse(body); } catch { return body; }
}

function maskToken(token) {
  const value = String(token || '');
  return value ? `${value.slice(0, 4)}************${value.slice(-4)}` : '[NOT_CONFIGURED]';
}

function maskRecipient(value) {
  const recipient = String(value || '');
  if (!recipient) return '[missing]';
  const prefixLength = recipient.length > 10 ? recipient.length - 10 : Math.min(2, recipient.length);
  return `${recipient.slice(0, prefixLength)}${'*'.repeat(Math.max(4, recipient.length - prefixLength - 4))}${recipient.slice(-4)}`;
}

function safeMessage(message, config) {
  const copy = typeof message === 'object' && message !== null ? structuredClone(message) : message;
  if (!copy || typeof copy !== 'object') return copy;
  if (copy.to) copy.to = maskRecipient(copy.to);
  if (copy.template?.name === config.whatsappAuthTemplate) {
    for (const component of copy.template.components || []) {
      for (const parameter of component.parameters || []) {
        if ('text' in parameter) parameter.text = '[REDACTED_OTP]';
      }
    }
  }
  return copy;
}

function safeMetaPayload(payload) {
  const copy = typeof payload === 'object' && payload !== null ? structuredClone(payload) : payload;
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (/^(?:to|from|recipient_id|wa_id|input)$/i.test(key)) return [key, maskRecipient(item)];
      if (/token|authorization|cookie|password|jwt|secret/i.test(key)) return [key, '[REDACTED]'];
      return [key, visit(item)];
    }));
  };
  return visit(copy);
}

function logOutgoingRequest({ config, path, options }) {
  if (String(options.method || 'GET').toUpperCase() !== 'POST' || !path.endsWith('/messages')) return;
  const message = parseBody(options.body);
  const template = message?.template || {};
  const body = template.components?.find((component) => component.type === 'body');
  const button = template.components?.find((component) => component.type === 'button');
  const authentication = template.name === config.whatsappAuthTemplate;
  console.info('========================================');
  console.info('WHATSAPP REQUEST');
  console.info('========================================');
  console.info({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: config.metaApiVersion,
    phoneNumberId: config.whatsappPhoneNumberId,
    wabaId: config.whatsappBusinessAccountId,
    endpoint: `https://graph.facebook.com/${config.metaApiVersion}/${path}`,
    template: template.name || null,
    language: template.language?.code || null,
    recipient: maskRecipient(message?.to),
    recipientAfterNormalization: maskRecipient(String(message?.to || '').replace(/^\+/, '')),
    authorization: maskToken(config.whatsappAccessToken),
    bodyParameterCount: body?.parameters?.length || 0,
    buttonParameterCount: button?.parameters?.length || 0,
    payload: safeMessage(message, config)
  });
  if (authentication) {
    const issues = [];
    if (template.language?.code !== (config.whatsappAuthTemplateLanguage || config.whatsappTemplateLanguage)) issues.push('Resolved language differs from the configured Authentication template language.');
    if (body?.type !== 'body') issues.push('Authentication template requires a body component.');
    if ((body?.parameters?.length || 0) !== 1) issues.push(`Approved Authentication template expects 1 body parameter, but the request contains ${body?.parameters?.length || 0}.`);
    if (button?.type !== 'button' || button?.sub_type !== 'url' || String(button?.index) !== '0') issues.push('Authentication copy-code button must be button/url/index 0.');
    if ((button?.parameters?.length || 0) !== 1) issues.push(`Authentication copy-code button expects 1 parameter, but the request contains ${button?.parameters?.length || 0}.`);
    if (body?.parameters?.[0]?.text !== button?.parameters?.[0]?.text) issues.push('Body verification code and copy-code button value do not match.');
    console.info(`Authentication Payload Audit: ${issues.length ? 'MISMATCH' : 'MATCH'}`);
    issues.forEach((issue) => console.info(`Authentication Payload Issue: ${issue}`));
  }
  console.info('========================================');
}

function logMetaResponse(response, payload) {
  console.info('========================================');
  console.info('META RESPONSE');
  console.info('========================================');
  console.info({
    timestamp: new Date().toISOString(),
    status: response.status,
    data: safeMetaPayload(payload),
    messageId: payload?.messages?.[0]?.id || null
  });
  console.info('========================================');
}

function logMetaError(response, payload, rawPayload, { config, path, options }) {
  const meta = payload?.error || {};
  const message = parseBody(options.body);
  console.error('========================================');
  console.error('META ERROR');
  console.error('========================================');
  console.error({
    timestamp: new Date().toISOString(),
    endpoint: `https://graph.facebook.com/${config.metaApiVersion}/${path}`,
    status: response.status,
    response: safeMetaPayload(payload),
    rawResponse: rawPayload || JSON.stringify(payload),
    metaCode: meta.code ?? null,
    metaSubcode: meta.error_subcode ?? null,
    type: meta.type ?? null,
    message: meta.message ?? null,
    details: meta.error_data ?? meta.details ?? null,
    fbtraceId: meta.fbtrace_id ?? null,
    payload: safeMessage(message, config)
  });
  console.error('========================================');
}

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
        logOutgoingRequest({ config: this.config, path, options });
        const response = await this.request(this.endpoint(path), {
          ...options,
          headers: { Authorization: `Bearer ${this.config.whatsappAccessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
          signal: AbortSignal.timeout(this.config.whatsappTimeoutMs)
        });
        let payload = {};
        let rawPayload = '';
        try {
          if (typeof response.text === 'function') {
            rawPayload = await response.text();
            payload = rawPayload ? JSON.parse(rawPayload) : {};
          } else {
            payload = await response.json();
            rawPayload = JSON.stringify(payload);
          }
        } catch {}
        if (!response.ok) {
          logMetaError(response, payload, rawPayload, { config: this.config, path, options });
          const mapped = mapMetaError(Number(payload?.error?.code || 0), response.status);
          const error = new AppError(mapped.message, { status: mapped.status, code: mapped.code, details: { retryable: mapped.retryable, metaCode: Number(payload?.error?.code || 0) || undefined }, expose: true });
          if (!mapped.retryable || attempt >= retries) throw error;
          lastError = error;
        } else {
          logMetaResponse(response, payload);
          return payload;
        }
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
