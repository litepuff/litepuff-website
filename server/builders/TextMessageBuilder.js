import { AppError } from '../utils/AppError.js';

export class TextMessageBuilder {
  build({ to, text, previewUrl = false }) {
    if (typeof text !== 'string' || !text.trim() || text.length > 4096) throw new AppError('WhatsApp text message is invalid.', { status: 422, code: 'WHATSAPP_TEXT_INVALID', expose: true });
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text.trim(), preview_url: Boolean(previewUrl) } };
  }
}
export const textMessageBuilder = new TextMessageBuilder();
