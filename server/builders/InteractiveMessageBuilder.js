import { AppError } from '../utils/AppError.js';

const TYPES = new Set(['button', 'cta_url', 'list', 'product', 'product_list', 'flow']);
export class InteractiveMessageBuilder {
  build({ to, type, body, action, header, footer }) {
    if (!TYPES.has(type) || !action || typeof action !== 'object') throw new AppError('WhatsApp interactive message is invalid.', { status: 422, code: 'WHATSAPP_INTERACTIVE_INVALID', expose: true });
    if (!body && !['product', 'product_list'].includes(type)) throw new AppError('WhatsApp interactive body is required.', { status: 422, code: 'WHATSAPP_INTERACTIVE_INVALID', expose: true });
    const interactive = { type, ...(header ? { header } : {}), ...(body ? { body: typeof body === 'string' ? { text: body } : body } : {}), ...(footer ? { footer: typeof footer === 'string' ? { text: footer } : footer } : {}), action };
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'interactive', interactive };
  }
}
export const interactiveMessageBuilder = new InteractiveMessageBuilder();
