import { phoneNumberValidator } from '../validators/PhoneNumberValidator.js';
import { AppError } from '../utils/AppError.js';

export class WhatsAppValidationService {
  constructor({ phones = phoneNumberValidator } = {}) { this.phones = phones; }
  recipient(value) { return this.phones.toMeta(value); }
  payload(value) {
    if (!value || typeof value !== 'object' || value.messaging_product !== 'whatsapp' || !value.to || !value.type) throw new AppError('WhatsApp message payload is invalid.', { status: 422, code: 'WHATSAPP_PAYLOAD_INVALID', expose: true });
    return value;
  }
}
export const whatsAppValidationService = new WhatsAppValidationService();
