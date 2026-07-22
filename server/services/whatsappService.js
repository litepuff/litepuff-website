import { metaWhatsAppClient } from './auth/MetaWhatsAppClient.js';
import { whatsAppTemplateBuilder } from './auth/WhatsAppTemplateBuilder.js';

export async function sendWhatsAppTemplate({ to, template, parameters = [] }) {
  return metaWhatsAppClient.sendTemplate({ to, template: whatsAppTemplateBuilder.custom(template, parameters) });
}
