import { AppError } from '../utils/AppError.js';

const NAME = /^[a-z0-9_]{1,512}$/;
const safeScalar = (value) => ['string', 'number'].includes(typeof value) && String(value).length <= 1024;

export class TemplateValidator {
  validateName(name) {
    if (typeof name !== 'string' || !NAME.test(name)) throw new AppError('WhatsApp template name is invalid.', { status: 422, code: 'WHATSAPP_TEMPLATE_INVALID', details: { field: 'template' }, expose: true });
    return name;
  }

  validateParameters(parameters = []) {
    if (!Array.isArray(parameters) || parameters.length > 20 || parameters.some((value) => !safeScalar(value))) throw new AppError('WhatsApp template parameters are invalid.', { status: 422, code: 'WHATSAPP_TEMPLATE_PARAMETERS_INVALID', expose: true });
    return parameters.map((value) => String(value));
  }

  validateComponents(components) {
    if (!Array.isArray(components) || !components.length || components.length > 10 || components.some((component) => !['header', 'body', 'button'].includes(component?.type) || (component.parameters && !Array.isArray(component.parameters)))) throw new AppError('WhatsApp template components are invalid.', { status: 422, code: 'WHATSAPP_TEMPLATE_PARAMETERS_INVALID', expose: true });
    return components;
  }

  requireVariables(variables, required = []) {
    const missing = required.filter((key) => variables?.[key] === undefined || variables?.[key] === null || variables?.[key] === '');
    if (missing.length) throw new AppError('WhatsApp template variables are missing.', { status: 422, code: 'WHATSAPP_TEMPLATE_PARAMETERS_INVALID', details: { missing }, expose: true });
    return required.map((key) => variables[key]);
  }
}

export const templateValidator = new TemplateValidator();
