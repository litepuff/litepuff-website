import { OTP_DELIVERY_STATUSES, OTP_PROVIDERS, OTP_PURPOSES } from '../../config/otp.js';
import { AUTH_ROLES } from '../../config/auth.js';
import { normalizePhoneE164, validateEmail, validateOtp } from '../../validation/domainValidation.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { customerBusinessService } from '../business/CustomerService.js';
import { emailOtpProvider } from './EmailOTPProvider.js';
import { jwtService } from './JwtService.js';
import { otpService } from './OTPService.js';
import { sessionService } from './SessionService.js';
import { whatsAppOtpProvider } from './WhatsAppOTPProvider.js';

const truthy = (value) => value === true || String(value).toLowerCase() === 'true';
const maskEmail = (email) => { const [name, domain] = email.split('@'); return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`; };
const maskPhone = (phone) => `${phone.slice(0, Math.min(3, phone.length - 4))}${'*'.repeat(Math.max(4, phone.length - 7))}${phone.slice(-4)}`;

export class AuthService {
  constructor({ customers = customerBusinessService, otps = otpService, emailProvider = emailOtpProvider, whatsAppProvider = whatsAppOtpProvider, sessions = sessionService, jwt = jwtService } = {}) { this.customers = customers; this.otps = otps; this.emailProvider = emailProvider; this.whatsAppProvider = whatsAppProvider; this.sessions = sessions; this.jwt = jwt; }
  async requestEmailOtp({ email, purpose }) {
    const identifier = validateEmail(email); if (!Object.values(OTP_PURPOSES).includes(purpose)) throw new AppError('OTP purpose is invalid.', { status: 422, code: 'VALIDATION_ERROR', details: { field: 'purpose' } });
    const existing = await this.customers.findByEmail(identifier);
    if (purpose === OTP_PURPOSES.SIGNUP && existing) throw new AppError('An account with this email already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
    if (purpose === OTP_PURPOSES.LOGIN) { if (!existing) throw new AppError('Customer account was not found.', { status: 404, code: 'CUSTOMER_NOT_FOUND' }); await this.customers.requireActive(existing.CustomerID); }
    const challenge = await this.otps.create({ identifier, provider: OTP_PROVIDERS.EMAIL, purpose, customerId: existing?.CustomerID || '' });
    try { const delivery = await this.emailProvider.send({ identifier, code: challenge.code, purpose }); await this.otps.recordDelivery(challenge.record.OTPID, { status: OTP_DELIVERY_STATUSES.SENT, providerMessageId: delivery.providerMessageId }); }
    catch (error) { await this.otps.recordDelivery(challenge.record.OTPID, { status: OTP_DELIVERY_STATUSES.FAILED }); await this.otps.invalidate(challenge.record.OTPID, 'delivery-failed'); throw error; }
    return { otpId: challenge.record.OTPID, purpose, provider: OTP_PROVIDERS.EMAIL, destination: maskEmail(identifier), expiresAt: challenge.record.ExpiresAt };
  }
  signup(input) { return this.requestEmailOtp({ ...input, purpose: OTP_PURPOSES.SIGNUP }); }
  login(input) { return this.requestEmailOtp({ ...input, purpose: OTP_PURPOSES.LOGIN }); }
  async resendEmailOtp({ otpId, email, purpose }) {
    const identifier = validateEmail(email); const challenge = await this.otps.resend({ otpId: String(otpId || ''), identifier, provider: OTP_PROVIDERS.EMAIL, purpose });
    try { const delivery = await this.emailProvider.send({ identifier, code: challenge.code, purpose }); await this.otps.recordDelivery(otpId, { status: OTP_DELIVERY_STATUSES.SENT, providerMessageId: delivery.providerMessageId }); }
    catch (error) { await this.otps.recordDelivery(otpId, { status: OTP_DELIVERY_STATUSES.FAILED }); await this.otps.invalidate(otpId, 'delivery-failed'); throw error; }
    return { otpId, purpose, provider: OTP_PROVIDERS.EMAIL, destination: maskEmail(identifier), expiresAt: challenge.record.ExpiresAt, resendCount: challenge.record.ResendCount };
  }
  async verifyEmailOtp({ otpId, email, otp, purpose, firstName = '', lastName = '', marketingConsent = false }, metadata = {}) {
    const identifier = validateEmail(email); const code = validateOtp(otp); await this.otps.verify({ otpId: String(otpId || ''), identifier, provider: OTP_PROVIDERS.EMAIL, purpose, code });
    let customer = await this.customers.findByEmail(identifier);
    if (purpose === OTP_PURPOSES.SIGNUP) {
      if (customer) throw new AppError('An account with this email already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
      customer = await this.customers.createCustomer({ email: identifier, firstName, lastName, marketingConsent: truthy(marketingConsent), provider: OTP_PROVIDERS.EMAIL, emailVerified: true, role: AUTH_ROLES.CUSTOMER }); logger.info('auth.customer.signup', { provider: OTP_PROVIDERS.EMAIL });
    } else if (purpose === OTP_PURPOSES.LOGIN) {
      if (!customer) throw new AppError('Customer account was not found.', { status: 404, code: 'CUSTOMER_NOT_FOUND' }); await this.customers.requireActive(customer.CustomerID);
      if (!truthy(customer.EmailVerified)) await this.customers.updateCustomer(customer.CustomerID, { emailVerified: true }); await this.customers.updateLoginTimestamp(customer.CustomerID); customer = await this.customers.requireActive(customer.CustomerID); logger.info('auth.customer.login', { provider: OTP_PROVIDERS.EMAIL });
    } else throw new AppError('OTP purpose is invalid.', { status: 422, code: 'VALIDATION_ERROR', details: { field: 'purpose' } });
    const tokens = await this.sessions.createSession(customer, metadata); return { tokens, customer: this.customers.publicIdentity(customer), session: { id: tokens.sessionId, expiresAt: tokens.expiresAt } };
  }
  async requestWhatsAppOtp({ phone, purpose }) {
    const identifier = normalizePhoneE164(phone); if (!Object.values(OTP_PURPOSES).includes(purpose)) throw new AppError('OTP purpose is invalid.', { status: 422, code: 'VALIDATION_ERROR', details: { field: 'purpose' } });
    const existing = await this.customers.findByPhone(identifier);
    if (purpose === OTP_PURPOSES.SIGNUP && existing) throw new AppError('An account with this phone number already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
    if (purpose === OTP_PURPOSES.LOGIN) { if (!existing) throw new AppError('Customer account was not found.', { status: 404, code: 'CUSTOMER_NOT_FOUND' }); await this.customers.requireActive(existing.CustomerID); }
    const challenge = await this.otps.create({ identifier, provider: OTP_PROVIDERS.WHATSAPP, purpose, customerId: existing?.CustomerID || '' });
    try { const delivery = await this.whatsAppProvider.send({ identifier, code: challenge.code, purpose }); await this.otps.recordDelivery(challenge.record.OTPID, { status: OTP_DELIVERY_STATUSES.SENT, providerMessageId: delivery.providerMessageId }); }
    catch (error) { await this.otps.recordDelivery(challenge.record.OTPID, { status: OTP_DELIVERY_STATUSES.FAILED }); await this.otps.invalidate(challenge.record.OTPID, 'delivery-failed'); throw error; }
    return { otpId: challenge.record.OTPID, purpose, provider: OTP_PROVIDERS.WHATSAPP, destination: maskPhone(identifier), expiresAt: challenge.record.ExpiresAt };
  }
  signupWhatsApp(input) { return this.requestWhatsAppOtp({ ...input, purpose: OTP_PURPOSES.SIGNUP }); }
  loginWhatsApp(input) { return this.requestWhatsAppOtp({ ...input, purpose: OTP_PURPOSES.LOGIN }); }
  async resendWhatsAppOtp({ otpId, phone, purpose }) {
    const identifier = normalizePhoneE164(phone); const challenge = await this.otps.resend({ otpId: String(otpId || ''), identifier, provider: OTP_PROVIDERS.WHATSAPP, purpose });
    try { const delivery = await this.whatsAppProvider.send({ identifier, code: challenge.code, purpose }); await this.otps.recordDelivery(otpId, { status: OTP_DELIVERY_STATUSES.SENT, providerMessageId: delivery.providerMessageId }); }
    catch (error) { await this.otps.recordDelivery(otpId, { status: OTP_DELIVERY_STATUSES.FAILED }); await this.otps.invalidate(otpId, 'delivery-failed'); throw error; }
    return { otpId, purpose, provider: OTP_PROVIDERS.WHATSAPP, destination: maskPhone(identifier), expiresAt: challenge.record.ExpiresAt, resendCount: challenge.record.ResendCount };
  }
  async verifyWhatsAppOtp({ otpId, phone, otp, purpose, firstName = '', lastName = '', email = '', marketingConsent = false }, metadata = {}) {
    const identifier = normalizePhoneE164(phone); const code = validateOtp(otp); await this.otps.verify({ otpId: String(otpId || ''), identifier, provider: OTP_PROVIDERS.WHATSAPP, purpose, code });
    let customer = await this.customers.findByPhone(identifier);
    if (purpose === OTP_PURPOSES.SIGNUP) {
      if (customer) throw new AppError('An account with this phone number already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
      customer = await this.customers.createCustomer({ phone: identifier, email: email ? validateEmail(email) : '', firstName, lastName, marketingConsent: truthy(marketingConsent), provider: OTP_PROVIDERS.WHATSAPP, phoneVerified: true, role: AUTH_ROLES.CUSTOMER }); logger.info('auth.customer.signup', { provider: OTP_PROVIDERS.WHATSAPP });
    } else if (purpose === OTP_PURPOSES.LOGIN) {
      if (!customer) throw new AppError('Customer account was not found.', { status: 404, code: 'CUSTOMER_NOT_FOUND' }); await this.customers.requireActive(customer.CustomerID);
      if (!truthy(customer.PhoneVerified)) await this.customers.updateCustomer(customer.CustomerID, { phoneVerified: true }); await this.customers.updateLoginTimestamp(customer.CustomerID); customer = await this.customers.requireActive(customer.CustomerID); logger.info('auth.customer.login', { provider: OTP_PROVIDERS.WHATSAPP });
    } else throw new AppError('OTP purpose is invalid.', { status: 422, code: 'VALIDATION_ERROR', details: { field: 'purpose' } });
    const tokens = await this.sessions.createSession(customer, metadata); return { tokens, customer: this.customers.publicIdentity(customer), session: { id: tokens.sessionId, expiresAt: tokens.expiresAt } };
  }
  async refresh(refreshToken) { if (!refreshToken) throw new AppError('Refresh token is required.', { status: 401, code: 'REFRESH_TOKEN_REQUIRED' }); const payload = this.jwt.verifyRefresh(refreshToken); await this.customers.requireActive(payload.customerId); return this.sessions.refreshSession(refreshToken); }
  async logout({ sessionId, refreshToken }) { let resolved = sessionId; if (!resolved && refreshToken) try { resolved = this.jwt.verifyRefresh(refreshToken).sessionId; } catch {} if (resolved) await this.sessions.terminateSession(resolved, 'logout'); logger.info('auth.logout', { sessionResolved: Boolean(resolved) }); }
  logoutAll(customerId) { return this.sessions.terminateAllSessions(customerId); }
}
export const authService = new AuthService();
