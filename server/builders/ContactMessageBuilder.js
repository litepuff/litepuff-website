import { AppError } from '../utils/AppError.js';

export class ContactMessageBuilder {
  build({ to, contacts }) {
    if (!Array.isArray(contacts) || !contacts.length || contacts.length > 10 || contacts.some((contact) => !contact?.name?.formatted_name)) throw new AppError('WhatsApp contacts payload is invalid.', { status: 422, code: 'WHATSAPP_CONTACT_INVALID', expose: true });
    return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'contacts', contacts };
  }
}
export const contactMessageBuilder = new ContactMessageBuilder();
