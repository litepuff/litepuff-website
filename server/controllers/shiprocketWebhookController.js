import { shiprocketWebhookService } from '../services/shiprocketWebhookService.js';

export async function receiveShiprocketWebhook(request, response) {
  const result = await shiprocketWebhookService.process(request.body, { correlationId: request.id });
  response.status(200).json({ success: true, ...result });
}
