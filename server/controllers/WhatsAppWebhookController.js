import { whatsAppWebhookService } from '../services/WhatsAppWebhookService.js';
import { whatsAppHealthService } from '../services/WhatsAppHealthService.js';
import { ok } from '../utils/apiResponse.js';
import { incomingMessageController } from './IncomingMessageController.js';

export function verifyWhatsAppWebhook(request, response) {
  const challenge = whatsAppWebhookService.verify(request.query);
  response.status(200).type('text/plain').send(challenge);
}

export async function receiveWhatsAppWebhook(request, response) {
  const result = await incomingMessageController.receive(request.body);
  ok(response, result, 'Webhook acknowledged.');
}

export async function whatsappHealth(request, response) {
  ok(response, await whatsAppHealthService.check(), 'WhatsApp integration diagnostics.');
}
