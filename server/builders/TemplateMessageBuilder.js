import { templateValidator } from '../validators/TemplateValidator.js';

const text = (value) => ({ type: 'text', text: String(value) });

export class TemplateMessageBuilder {
  constructor({ validator = templateValidator } = {}) { this.validator = validator; }
  build({ to, name, language, parameters = [], components, buttonParameters = [] }) {
    this.validator.validateName(name);
    const resolved = components ? [...this.validator.validateComponents(components)] : [{ type: 'body', parameters: this.validator.validateParameters(parameters).map(text) }];
    if (buttonParameters.length) resolved.push({ type: 'button', sub_type: 'url', index: '0', parameters: this.validator.validateParameters(buttonParameters).map(text) });
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template', template: { name, language: { code: language }, components: resolved } };
  }
}

export const templateMessageBuilder = new TemplateMessageBuilder();
