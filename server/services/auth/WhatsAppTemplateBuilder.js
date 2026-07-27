import { whatsAppConfig } from '../../config/WhatsAppConfig.js';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService.js';
import { TemplateMessageBuilder } from '../../builders/TemplateMessageBuilder.js';
import { AppError } from '../../utils/AppError.js';

export const WHATSAPP_TEMPLATE_TYPES = Object.freeze({ AUTHENTICATION: 'authentication', ORDER_CONFIRMATION: 'order_confirmation', SHIPPING_UPDATE: 'shipping_update', MARKETING: 'marketing' });
export class WhatsAppTemplateBuilder {
  constructor(config = whatsAppConfig) { this.config = config; this.templates = new WhatsAppTemplateService({ config }); this.builder = new TemplateMessageBuilder(); }
  build(type, variables = {}) {
    const alias = type === WHATSAPP_TEMPLATE_TYPES.SHIPPING_UPDATE ? 'order_shipped' : type;
    const resolved = this.templates.resolve(alias, { variables });
    const language = type === WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION
      ? (this.config.whatsappAuthTemplateLanguage || this.config.whatsappTemplateLanguage)
      : this.config.whatsappTemplateLanguage;
    const template = this.builder.build({ to: '', name: resolved.name, language, parameters: resolved.parameters, buttonParameters: this.config.whatsappAuthCodeButton ? resolved.buttonParameters : [] }).template;
    if (type === WHATSAPP_TEMPLATE_TYPES.AUTHENTICATION) this.validateAuthentication(template);
    return template;
  }
  validateAuthentication(template) {
    const body = template.components?.find((component) => component.type === 'body');
    const button = template.components?.find((component) => component.type === 'button');
    const valid = template.name === this.config.whatsappAuthTemplate
      && template.language?.code === (this.config.whatsappAuthTemplateLanguage || this.config.whatsappTemplateLanguage)
      && body?.parameters?.length === 1
      && body.parameters[0]?.type === 'text'
      && button?.sub_type === 'url'
      && String(button?.index) === '0'
      && button?.parameters?.length === 1
      && button.parameters[0]?.text === body.parameters[0]?.text;
    if (!valid) throw new AppError('WhatsApp authentication template configuration is invalid.', {
      status: 503,
      code: 'WHATSAPP_AUTH_TEMPLATE_INVALID',
      details: { retryable: false },
      expose: true
    });
  }
  custom(name, parameters = []) { const resolved = this.templates.resolve('custom', { name, parameters }); return this.builder.build({ to: '', name: resolved.name, language: this.config.whatsappTemplateLanguage, parameters: resolved.parameters }).template; }
}
export const whatsAppTemplateBuilder = new WhatsAppTemplateBuilder();
