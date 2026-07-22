import { whatsAppConfig } from '../../config/WhatsAppConfig.js';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService.js';
import { TemplateMessageBuilder } from '../../builders/TemplateMessageBuilder.js';

export const WHATSAPP_TEMPLATE_TYPES = Object.freeze({ AUTHENTICATION: 'authentication', ORDER_CONFIRMATION: 'order_confirmation', SHIPPING_UPDATE: 'shipping_update', MARKETING: 'marketing' });
export class WhatsAppTemplateBuilder {
  constructor(config = whatsAppConfig) { this.config = config; this.templates = new WhatsAppTemplateService({ config }); this.builder = new TemplateMessageBuilder(); }
  build(type, variables = {}) {
    const alias = type === WHATSAPP_TEMPLATE_TYPES.SHIPPING_UPDATE ? 'order_shipped' : type;
    const resolved = this.templates.resolve(alias, { variables });
    return this.builder.build({ to: '', name: resolved.name, language: this.config.whatsappTemplateLanguage, parameters: resolved.parameters, buttonParameters: this.config.whatsappAuthCodeButton ? resolved.buttonParameters : [] }).template;
  }
  custom(name, parameters = []) { const resolved = this.templates.resolve('custom', { name, parameters }); return this.builder.build({ to: '', name: resolved.name, language: this.config.whatsappTemplateLanguage, parameters: resolved.parameters }).template; }
}
export const whatsAppTemplateBuilder = new WhatsAppTemplateBuilder();
