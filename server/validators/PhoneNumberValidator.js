import { AppError } from '../utils/AppError.js';

const E164 = /^\+[1-9]\d{7,14}$/;

export class PhoneNumberValidator {
  validate(value) {
    const phone = typeof value === 'string' ? value.trim() : '';
    if (!E164.test(phone)) throw new AppError('WhatsApp phone number must use E.164 format.', { status: 422, code: 'WHATSAPP_PHONE_INVALID', details: { field: 'to', format: '+919876543210' }, expose: true });
    return phone;
  }

  toMeta(value) { return this.validate(value).slice(1); }
}

export const phoneNumberValidator = new PhoneNumberValidator();
