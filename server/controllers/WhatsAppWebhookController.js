import { whatsAppWebhookService } from '../services/WhatsAppWebhookService.js';
import { whatsAppHealthService } from '../services/WhatsAppHealthService.js';
import { ok } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export function verifyWhatsAppWebhook(request, response) {
  const challenge = whatsAppWebhookService.verify(request.query);
  response.status(200).type('text/plain').send(challenge);
}

export async function receiveWhatsAppWebhook(request, response) {
  logger.info('whatsapp.webhook.processing', { correlationId: request.id });
  const result = await whatsAppWebhookService.process(request.body, { correlationId: request.id });
  logger.info('whatsapp.webhook.processed', { correlationId: request.id, processed: result.processed, failed: result.failed });
  ok(response, result, 'Webhook acknowledged.');
}

export async function whatsappHealth(request, response) {
  ok(response, await whatsAppHealthService.check(), 'WhatsApp integration diagnostics.');
}
