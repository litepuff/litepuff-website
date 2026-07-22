import { whatsAppWebhookService } from '../services/WhatsAppWebhookService.js';

export class IncomingMessageController {
  constructor({ webhooks = whatsAppWebhookService } = {}) { this.webhooks = webhooks; }
  receive(rawBody) { return this.webhooks.process(rawBody); }
}
export const incomingMessageController = new IncomingMessageController();
