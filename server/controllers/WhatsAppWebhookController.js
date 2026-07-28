import { whatsAppWebhookService } from '../services/WhatsAppWebhookService.js';
import { whatsAppHealthService } from '../services/WhatsAppHealthService.js';
import { ok } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const maskRecipient = (value) => {
  const recipient = String(value || '');
  if (!recipient) return recipient;
  const prefixLength = recipient.length > 10 ? recipient.length - 10 : Math.min(2, recipient.length);
  return `${recipient.slice(0, prefixLength)}${'*'.repeat(Math.max(4, recipient.length - prefixLength - 4))}${recipient.slice(-4)}`;
};

function webhookDiagnosticPayload(rawBody) {
  let payload = rawBody;
  try {
    if (Buffer.isBuffer(rawBody)) payload = JSON.parse(rawBody.toString('utf8'));
    else if (typeof rawBody === 'string') payload = JSON.parse(rawBody);
  } catch {
    return '[UNPARSEABLE_WEBHOOK_BODY]';
  }
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit);
    if (typeof value === 'string') return value.replace(/\b\d{6}\b/g, '[REDACTED_OTP]');
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (/^(?:from|to|recipient_id|wa_id|display_phone_number)$/i.test(key)) return [key, maskRecipient(item)];
      if (/token|authorization|cookie|password|jwt|secret/i.test(key)) return [key, '[REDACTED]'];
      return [key, visit(item)];
    }));
  };
  return visit(payload);
}

function logWebhookEvents(payload) {
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      for (const status of value.statuses || []) {
        console.info('STATUS EVENT', {
          status: status.status || null,
          recipient: maskRecipient(status.recipient_id),
          conversationId: status.conversation?.id || null,
          pricing: status.pricing || null,
          errors: status.errors || [],
          messageId: status.id || null,
          timestamp: status.timestamp || null
        });
        if (status.status === 'delivered' || status.status === 'failed') {
          console.info('========================================');
          console.info('OTP TRACE END');
          console.info({ result: status.status, messageId: status.id || null, timestamp: status.timestamp || null });
          console.info('========================================');
        }
      }
      for (const message of value.messages || []) {
        console.info('MESSAGE EVENT', {
          type: message.type || null,
          from: maskRecipient(message.from),
          messageId: message.id || null,
          timestamp: message.timestamp || null
        });
      }
    }
  }
}

export function verifyWhatsAppWebhook(request, response) {
  const challenge = whatsAppWebhookService.verify(request.query);
  response.status(200).type('text/plain').send(challenge);
}

export async function receiveWhatsAppWebhook(request, response) {
  const diagnosticPayload = webhookDiagnosticPayload(request.body);
  console.info('========================================');
  console.info('WEBHOOK RECEIVED');
  console.info('========================================');
  console.info(JSON.stringify(diagnosticPayload, null, 2));
  logWebhookEvents(diagnosticPayload);
  logger.info('whatsapp.webhook.processing', { correlationId: request.id });
  const result = await whatsAppWebhookService.process(request.body, { correlationId: request.id });
  logger.info('whatsapp.webhook.processed', { correlationId: request.id, processed: result.processed, failed: result.failed });
  ok(response, result, 'Webhook acknowledged.');
}

export async function whatsappHealth(request, response) {
  ok(response, await whatsAppHealthService.check(), 'WhatsApp integration diagnostics.');
}
