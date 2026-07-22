import { env } from '../../config/env.js';
import { sendMail } from '../emailService.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

const escape = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function emailOtpTemplate({ code, expiresMinutes, purpose, logoUrl = env.emailLogoUrl }) {
  const title = purpose === 'signup' ? 'Welcome to LitePuff' : 'Your LitePuff sign-in code';
  const logo = logoUrl ? `<img src="${escape(logoUrl)}" alt="LitePuff" width="132" style="display:block;max-width:132px;height:auto">` : '<div style="font-weight:800;letter-spacing:4px;color:#c5943c;font-size:15px">LITEPUFF</div>';
  return { subject: 'Your LitePuff verification code', html: `<!doctype html><html><body style="margin:0;background:#f7f3ea;font-family:Arial,sans-serif;color:#173b2c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e9e1d2;border-radius:22px"><tr><td style="padding:34px">${logo}<h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:28px 0 12px">${title}</h1><p style="color:#596b62;font-size:16px;line-height:1.6">Hello, use this six-digit code to continue securely:</p><div style="margin:24px 0;padding:20px;text-align:center;background:#f7f3ea;border-radius:14px;font-size:34px;letter-spacing:10px;font-weight:800;color:#173b2c">${escape(code)}</div><p style="color:#596b62;font-size:14px;line-height:1.6">This code expires in ${Number(expiresMinutes)} minutes. Never share it with anyone. LitePuff will never ask for this code by phone or message.</p><p style="color:#596b62;font-size:14px;line-height:1.6">If you did not request this, you can safely ignore this email. Need help? Contact ${escape(env.supportEmail || 'LitePuff support')}.</p><div style="border-top:1px solid #e9e1d2;margin-top:28px;padding-top:18px;font-size:12px;color:#849087">LitePuff · Premium, mindful snacking</div></td></tr></table></td></tr></table></body></html>` };
}
export class EmailOTPProvider {
  constructor({ deliver = sendMail, config = env, retries = 2 } = {}) { this.deliver = deliver; this.config = config; this.retries = retries; this.name = 'email'; }
  async send({ identifier, code, purpose }) {
    const message = emailOtpTemplate({ code, purpose, expiresMinutes: this.config.otpExpiresMinutes, logoUrl: this.config.emailLogoUrl }); let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) try { const result = await this.deliver({ to: identifier, ...message }); if (result?.skipped) throw new Error('Email transport is not configured.'); logger.info('auth.otp.sent', { provider: this.name, purpose, deliveryAttempt: attempt + 1 }); return { providerMessageId: result?.messageId || '', status: 'sent' }; } catch (error) { lastError = error; }
    logger.error('auth.otp.delivery-failed', { provider: this.name, purpose, code: 'EMAIL_DELIVERY_FAILED' }); throw new AppError('Verification email could not be delivered.', { status: 503, code: 'EMAIL_DELIVERY_FAILED', details: { retryable: true }, cause: lastError });
  }
}
export const emailOtpProvider = new EmailOTPProvider();
