import test from 'node:test';
import assert from 'node:assert/strict';
import { OTPService } from '../services/auth/OTPService.js';
import { EmailOTPProvider, emailOtpTemplate } from '../services/auth/EmailOTPProvider.js';
import { AuthService } from '../services/auth/AuthService.js';
import { CustomerService } from '../services/business/CustomerService.js';
import { JwtService } from '../services/auth/JwtService.js';
import { RefreshTokenService } from '../services/auth/RefreshTokenService.js';
import { SessionService } from '../services/auth/SessionService.js';

class MemorySheets {
  constructor(seed = {}) { this.data = structuredClone(seed); }
  async readRows(sheet, options = {}) { let rows = [...(this.data[sheet] || [])]; if (options.filter) rows = rows.filter(options.filter); if (options.sort) rows.sort((a, b) => String(a[options.sort.field]).localeCompare(String(b[options.sort.field])) * (options.sort.direction === 'desc' ? -1 : 1)); return { rows, pagination: { total: rows.length } }; }
  async readOne(sheet, predicate) { return (this.data[sheet] || []).find(predicate) || null; }
  async append(sheet, record) { const row = { ...record, _row: (this.data[sheet]?.length || 0) + 2 }; (this.data[sheet] ||= []).push(row); return row; }
  async update(sheet, rowNumber, record) { const index = this.data[sheet].findIndex((row) => row._row === rowNumber); this.data[sheet][index] = { ...record, _row: rowNumber }; return this.data[sheet][index]; }
  async delete(sheet, rowNumber) { this.data[sheet] = this.data[sheet].filter((row) => row._row !== rowNumber); }
}

const config = { jwtSecret: 'a'.repeat(64), jwtRefreshSecret: 'b'.repeat(64), cookieSecret: 'c'.repeat(64), otpSecret: 'd'.repeat(64), accessTokenMinutes: 15, refreshTokenDays: 30, otpExpiresMinutes: 10, otpCooldownSeconds: 60, otpMaxAttempts: 3, otpMaxResends: 2, otpLockMinutes: 15, nodeEnv: 'test', supportEmail: 'support@litepuff.in' };
const build = ({ now = Date.parse('2026-07-20T10:00:00Z'), customers: seedCustomers = [] } = {}) => {
  let current = now; const sheets = new MemorySheets({ CUSTOMERS: seedCustomers, OTP_CHALLENGES: [], SESSIONS: [] }); const otps = new OTPService({ sheets, config, clock: () => current }); const customers = new CustomerService({ sheets }); const jwt = new JwtService(config); const refreshTokens = new RefreshTokenService({ jwt, pepper: config.cookieSecret }); const sessions = new SessionService({ sheets, jwt, refreshTokens, config }); const deliveries = [];
  const emailProvider = new EmailOTPProvider({ config, deliver: async (message) => { deliveries.push(message); return { messageId: `mail-${deliveries.length}` }; }, retries: 0 }); const auth = new AuthService({ customers, otps, emailProvider, sessions, jwt });
  return { sheets, otps, customers, sessions, auth, deliveries, advance: (milliseconds) => { current += milliseconds; } };
};

test('OTP generation is six-digit, hashed at rest, verified once, and replay protected', async () => { const fixture = build(); fixture.otps.generateCode = () => '042731'; const challenge = await fixture.otps.create({ identifier: 'person@example.com', provider: 'email', purpose: 'signup' }); assert.equal(challenge.code, '042731'); assert.notEqual(challenge.record.OTPHash, challenge.code); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].OTPHash.includes(challenge.code), false); await fixture.otps.verify({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'signup', code: challenge.code }); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].OTPHash, ''); await assert.rejects(() => fixture.otps.verify({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'signup', code: challenge.code }), (error) => error.code === 'OTP_ALREADY_USED'); });
test('OTP attempts invalidate verification without storing submitted codes', async () => { const fixture = build(); const challenge = await fixture.otps.create({ identifier: 'person@example.com', provider: 'email', purpose: 'login' }); for (let count = 1; count < config.otpMaxAttempts; count += 1) await assert.rejects(() => fixture.otps.verify({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'login', code: '000000' }), (error) => error.code === 'OTP_INCORRECT'); await assert.rejects(() => fixture.otps.verify({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'login', code: '000000' }), (error) => error.code === 'OTP_ATTEMPTS_EXCEEDED'); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].Status, 'invalidated'); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].OTPHash, ''); await assert.rejects(() => fixture.otps.verify({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'login', code: challenge.code }), (error) => error.code === 'OTP_INVALID'); });
test('OTP expiry cleanup invalidates hashes and resend enforces cooldown', async () => { const fixture = build(); const challenge = await fixture.otps.create({ identifier: 'person@example.com', provider: 'email', purpose: 'login' }); await assert.rejects(() => fixture.otps.resend({ otpId: challenge.record.OTPID, identifier: 'person@example.com', provider: 'email', purpose: 'login' }), (error) => error.code === 'OTP_COOLDOWN'); fixture.advance(11 * 60_000); assert.equal(await fixture.otps.cleanupExpired(), 1); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].Status, 'expired'); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].OTPHash, ''); });
test('OTP request windows remain isolated per persistent identifier', async () => {
  const fixture = build();
  for (let count = 0; count < config.otpMaxResends + 1; count += 1) {
    await fixture.otps.create({ identifier: 'customer-a@example.com', provider: 'email', purpose: 'login' });
    fixture.advance(config.otpCooldownSeconds * 1000);
  }
  await assert.rejects(
    () => fixture.otps.create({ identifier: 'customer-a@example.com', provider: 'email', purpose: 'login' }),
    (error) => error.code === 'OTP_GENERATION_LIMIT' && error.details.retryAfterSeconds > 0
  );
  const unaffected = await fixture.otps.create({ identifier: 'customer-b@example.com', provider: 'email', purpose: 'login' });
  assert.equal(unaffected.record.Identifier, 'customer-b@example.com');
});
test('Email provider renders a responsive branded template and retries delivery failures', async () => { let attempts = 0; const provider = new EmailOTPProvider({ config, retries: 2, deliver: async () => { attempts += 1; if (attempts < 3) throw new Error('temporary'); return { messageId: 'mail-ok' }; } }); const result = await provider.send({ identifier: 'person@example.com', code: '123456', purpose: 'login' }); assert.equal(attempts, 3); assert.equal(result.providerMessageId, 'mail-ok'); const template = emailOtpTemplate({ code: '123456', expiresMinutes: 10, purpose: 'login' }); assert.match(template.html, /LITEPUFF/); assert.match(template.html, /123456/); assert.doesNotMatch(template.html, /OTPHash|JWT_SECRET/); });
test('AuthService completes signup and login through the same OTP engine', async () => { const fixture = build(); fixture.otps.generateCode = () => fixture.deliveries.length ? '654321' : '123456'; const signup = await fixture.auth.signup({ email: 'new@example.com' }); assert.equal(signup.destination, 'ne*@example.com'); assert.equal(fixture.deliveries.length, 1); const signedUp = await fixture.auth.verifyEmailOtp({ otpId: signup.otpId, email: 'new@example.com', otp: '123456', purpose: 'signup', firstName: 'New' }); assert.equal(signedUp.customer.emailVerified, true); assert.ok(signedUp.tokens.accessToken); assert.equal(fixture.sheets.data.SESSIONS.length, 1); fixture.advance(61_000); const login = await fixture.auth.login({ email: 'new@example.com' }); await fixture.auth.verifyEmailOtp({ otpId: login.otpId, email: 'new@example.com', otp: '654321', purpose: 'login' }); assert.equal(fixture.sheets.data.SESSIONS.length, 2); assert.ok(fixture.sheets.data.CUSTOMERS[0].LastLogin); await assert.rejects(() => fixture.auth.signup({ email: 'new@example.com' }), (error) => error.code === 'DUPLICATE_CUSTOMER'); });
test('AuthService invalidates an OTP when email delivery fails', async () => { const fixture = build(); fixture.auth.emailProvider = new EmailOTPProvider({ config, retries: 0, deliver: async () => { throw new Error('smtp down'); } }); await assert.rejects(() => fixture.auth.signup({ email: 'new@example.com' }), (error) => error.code === 'EMAIL_DELIVERY_FAILED'); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].Status, 'invalidated'); assert.equal(fixture.sheets.data.OTP_CHALLENGES[0].OTPHash, ''); });
