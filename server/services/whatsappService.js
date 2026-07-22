import { whatsAppMessagingService } from './WhatsAppMessagingService.js';

export async function sendWhatsAppTemplate({ to, template, parameters = [] }) {
  const result = await whatsAppMessagingService.sendTemplate({ to, template: 'custom', name: template, parameters });
  return { messageId: result.messageId, status: result.status };
}
