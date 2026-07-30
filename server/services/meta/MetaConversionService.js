import crypto from 'crypto';
import { normalizeEnvironmentValue } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const SUPPORTED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
]);
const TEMPORARY_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 5_000;

const clean = (value) => String(value ?? '').trim();
const compact = (value) => Object.fromEntries(
  Object.entries(value || {}).filter(([, item]) => (
    item !== undefined &&
    item !== null &&
    item !== '' &&
    (!Array.isArray(item) || item.length > 0)
  )),
);
const hash = (value) => {
  const normalized = clean(value).toLowerCase();
  return normalized
    ? crypto.createHash('sha256').update(normalized).digest('hex')
    : undefined;
};
const validHash = (value) => /^[a-f0-9]{64}$/.test(clean(value).toLowerCase())
  ? clean(value).toLowerCase()
  : undefined;
const normalizeUserValue = (field, value) => {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return '';
  if (field === 'ph') return normalized.replace(/\D/g, '');
  if (field === 'country') {
    if (normalized === 'india') return 'in';
    return normalized.replace(/[^a-z]/g, '').slice(0, 2);
  }
  if (field === 'ct' || field === 'st') return normalized.replace(/[^a-z0-9]/g, '');
  if (field === 'zp') return normalized.replace(/[\s-]/g, '');
  return normalized;
};
const sleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

export class MetaConversionService {
  constructor({
    accessToken = process.env.META_ACCESS_TOKEN,
    pixelId = process.env.META_PIXEL_ID,
    apiVersion = process.env.META_API_VERSION,
    testEventCode = process.env.META_TEST_EVENT_CODE,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.accessToken = normalizeEnvironmentValue(accessToken);
    this.pixelId = normalizeEnvironmentValue(pixelId);
    this.apiVersion = normalizeEnvironmentValue(apiVersion);
    this.testEventCode = normalizeEnvironmentValue(testEventCode);
    this.fetch = fetchImpl;
  }

  get configured() {
    return Boolean(
      this.accessToken &&
      this.pixelId &&
      /^v\d+\.\d+$/.test(this.apiVersion) &&
      typeof this.fetch === 'function',
    );
  }

  endpoint() {
    return `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`;
  }

  userData(input = {}, hashedInput = {}) {
    const matched = (field, value) => {
      const resolved = validHash(hashedInput[field]) || (
        value ? hash(normalizeUserValue(field, value)) : undefined
      );
      return resolved ? [resolved] : undefined;
    };
    return compact({
      em: matched('em', input.email),
      ph: matched('ph', input.phone),
      fn: matched('fn', input.firstName),
      ln: matched('ln', input.lastName),
      ct: matched('ct', input.city),
      st: matched('st', input.state),
      country: matched('country', input.country),
      zp: matched('zp', input.zip ?? input.pincode),
      external_id: input.externalId ? [hash(input.externalId)] : undefined,
      client_ip_address: clean(input.clientIp),
      client_user_agent: clean(input.clientUserAgent),
      fbp: clean(input.fbp),
      fbc: clean(input.fbc),
    });
  }

  async send(event = {}, context = {}) {
    const eventName = clean(event.eventName);
    const eventId = clean(event.eventId);
    if (!this.configured) {
      logger.info('meta.capi.skipped', {
        correlationId: context.correlationId,
        eventName,
        eventId,
        reason: 'configuration_incomplete',
      });
      return { sent: false, skipped: true, reason: 'configuration_incomplete' };
    }
    if (!SUPPORTED_EVENTS.has(eventName) || !eventId) {
      logger.warn('meta.capi.rejected', {
        correlationId: context.correlationId,
        eventName,
        eventId,
        reason: !eventId ? 'event_id_missing' : 'event_not_supported',
      });
      return { sent: false, skipped: true, reason: 'invalid_event' };
    }

    const payload = compact({
      data: [{
        event_name: eventName,
        event_time: Number(event.eventTime) || Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: clean(event.eventSourceUrl),
        user_data: this.userData(event.userData, event.hashedUserData),
        custom_data: compact(event.customData),
      }],
      test_event_code: this.testEventCode,
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      timeout.unref?.();
      try {
        const response = await this.fetch(this.endpoint(), {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          logger.info('meta.capi.sent', {
            correlationId: context.correlationId,
            eventName,
            eventId,
            attempt,
            eventsReceived: body.events_received,
            traceId: body.fbtrace_id,
            testEvent: Boolean(this.testEventCode),
          });
          return { sent: true, response: body };
        }

        const temporary = TEMPORARY_STATUS.has(response.status);
        logger[temporary ? 'warn' : 'error']('meta.capi.failed', {
          correlationId: context.correlationId,
          eventName,
          eventId,
          attempt,
          status: response.status,
          code: body?.error?.code,
          subcode: body?.error?.error_subcode,
          error: body?.error?.message || 'Meta CAPI request failed.',
          temporary,
        });
        if (!temporary || attempt === MAX_ATTEMPTS) {
          return { sent: false, status: response.status, response: body };
        }
      } catch (error) {
        const temporary = error?.name === 'AbortError' || error instanceof TypeError;
        logger[temporary ? 'warn' : 'error']('meta.capi.failed', {
          correlationId: context.correlationId,
          eventName,
          eventId,
          attempt,
          code: error?.code,
          error: error?.message || String(error),
          temporary,
        });
        if (!temporary || attempt === MAX_ATTEMPTS) {
          return { sent: false, error: error?.message || String(error) };
        }
      } finally {
        clearTimeout(timeout);
      }
      await sleep(250 * (2 ** (attempt - 1)));
    }
    return { sent: false };
  }

  pageView(event, context) {
    return this.send({ ...event, eventName: 'PageView' }, context);
  }

  viewContent(event, context) {
    return this.send({ ...event, eventName: 'ViewContent' }, context);
  }

  addToCart(event, context) {
    return this.send({ ...event, eventName: 'AddToCart' }, context);
  }

  initiateCheckout(event, context) {
    return this.send({ ...event, eventName: 'InitiateCheckout' }, context);
  }

  purchase(event, context) {
    return this.send({ ...event, eventName: 'Purchase' }, context);
  }
}

export const metaConversionService = new MetaConversionService();
