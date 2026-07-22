import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

export const WHATSAPP_TEMPLATE_TYPES = Object.freeze({ AUTHENTICATION: 'authentication', ORDER_CONFIRMATION: 'order_confirmation', SHIPPING_UPDATE: 'shipping_update', MARKETING: 'marketing' });
const text = (value) => ({ type: 'text', text: String(value) });
const body = (values) => ({ type: 'body', parameters: values.map(text) });

export class WhatsAppTemplateBuilder {
  constructor(config = env) { this.config = config; }
  build(type, variables = {}) {
    const definitions = {
      [WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION]: () => ({ name: this.config.whatsappAuthTemplate, components: [body([variables.code, variables.expiresMinutes]), ...(this.config.whatsappAuthCodeButton ? [{ type: 'button', sub_type: 'url', index: '0', parameters: [text(variables.code)] }] : [])] }),
      [WHATSAPP_TEMPLATE_TYPES.ORDER_CONFIRMATION]: () => ({ name: this.config.whatsappOrderTemplate, components: [body([variables.orderNumber, variables.total])] }),
      [WHATSAPP_TEMPLATE_TYPES.SHIPPING_UPDATE]: () => ({ name: this.config.whatsappShippingTemplate, components: [body([variables.orderNumber, variables.status, variables.trackingUrl])] }),
      [WHATSAPP_TEMPLATE_TYPES.MARKETING]: () => ({ name: this.config.whatsappMarketingTemplate, components: [body([variables.firstName, variables.message])] })
    };
    const definition = definitions[type]; if (!definition) throw new AppError('WhatsApp template type is not supported.', { status: 422, code: 'WHATSAPP_TEMPLATE_TYPE_INVALID' });
    const template = definition(); if (!template.name) throw new AppError('WhatsApp template is not configured.', { status: 503, code: 'WHATSAPP_TEMPLATE_NOT_CONFIGURED' });
    return { name: template.name, language: { code: this.config.whatsappTemplateLanguage }, components: template.components };
  }
  custom(name, parameters = []) { if (!name) throw new AppError('WhatsApp template is required.', { status: 422, code: 'WHATSAPP_TEMPLATE_REQUIRED' }); return { name, language: { code: this.config.whatsappTemplateLanguage }, components: [body(parameters)] }; }
}
export const whatsAppTemplateBuilder = new WhatsAppTemplateBuilder();
