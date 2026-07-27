import { whatsAppMessagingService } from './WhatsAppMessagingService.js';
import { WHATSAPP_TEMPLATES } from './WhatsAppTemplateService.js';

export async function sendWhatsAppTemplate({ to, template, parameters = [] }) {
  const result = await whatsAppMessagingService.sendTemplate({ to, template: 'custom', name: template, parameters });
  return { messageId: result.messageId, status: result.status };
}

const sendLifecycleTemplate = (to, template, variables) =>
  whatsAppMessagingService.sendTemplate({ to, template, variables });

export const sendOrderConfirmed = ({ to, orderNumber, amount }) =>
  sendLifecycleTemplate(to, WHATSAPP_TEMPLATES.ORDER_CONFIRMATION, { orderNumber, total: amount });

export const sendPaymentSuccess = ({ to, orderNumber, amount }) =>
  sendLifecycleTemplate(to, WHATSAPP_TEMPLATES.PAYMENT_SUCCESS, { orderNumber, amount });

export const sendPaymentFailed = ({ to, orderNumber }) =>
  sendLifecycleTemplate(to, WHATSAPP_TEMPLATES.PAYMENT_FAILED, { orderNumber });

export const sendOrderShipped = ({ to, orderNumber, status, trackingUrl }) =>
  sendLifecycleTemplate(to, WHATSAPP_TEMPLATES.ORDER_SHIPPED, { orderNumber, status, trackingUrl });

export const sendOrderDelivered = ({ to, orderNumber }) =>
  sendLifecycleTemplate(to, WHATSAPP_TEMPLATES.DELIVERED, { orderNumber });
