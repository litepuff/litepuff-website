import crypto from 'crypto';
import { env } from '../../config/env.js';
import { OTP_DELIVERY_STATUSES, OTP_STATUSES } from '../../config/otp.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { googleSheetsService } from '../GoogleSheetsService.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

const number = (value) => Number(value || 0);
const time = (value) => new Date(value || 0).getTime();

export class OTPService {
  constructor({ sheets = googleSheetsService, config = env, clock = () => Date.now() } = {}) { this.sheets = sheets; this.config = config; this.clock = clock; this.cleanupTimer = null; }
  generateCode() { return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0'); }
  hash(code, otpId, identifier) { return crypto.createHmac('sha256', this.config.otpSecret).update(`${otpId}:${identifier}:${code}`).digest('hex'); }
  matches(code, record) { const actual = Buffer.from(this.hash(code, record.OTPID, record.Identifier), 'hex'); const expected = Buffer.from(String(record.OTPHash || ''), 'hex'); return actual.length === expected.length && crypto.timingSafeEqual(actual, expected); }
  async get(otpId) { return this.sheets.readOne(SHEET_NAMES.OTP_CHALLENGES, (row) => row.OTPID === otpId); }
  async activeFor(identifier, provider, purpose) { const { rows } = await this.sheets.readRows(SHEET_NAMES.OTP_CHALLENGES, { filter: (row) => row.Identifier === identifier && row.Provider === provider && row.Purpose === purpose && row.Status === OTP_STATUSES.ACTIVE, sort: { field: 'CreatedAt', direction: 'desc' } }); return rows; }
  async create({ identifier, provider, purpose, customerId = '' }) {
    await this.cleanupExpired();
    const now = this.clock(); const active = await this.activeFor(identifier, provider, purpose);
    const requestWindowMinutes = Number(this.config.otpRequestWindowMinutes || 10);
    const { rows: recent } = await this.sheets.readRows(SHEET_NAMES.OTP_CHALLENGES, { filter: (row) => row.Identifier === identifier && row.Provider === provider && row.Purpose === purpose && now - time(row.CreatedAt) < requestWindowMinutes * 60_000 });
    if (recent.length >= this.config.otpMaxResends + 1) throw new AppError('OTP request limit reached.', { status: 429, code: 'OTP_GENERATION_LIMIT' });
    const latest = active[0];
    if (latest && now - time(latest.LastSentAt) < this.config.otpCooldownSeconds * 1000) throw new AppError('Please wait before requesting another OTP.', { status: 429, code: 'OTP_COOLDOWN', details: { retryAfterSeconds: Math.ceil((this.config.otpCooldownSeconds * 1000 - (now - time(latest.LastSentAt))) / 1000) } });
    await Promise.all(active.map((row) => this.invalidate(row, 'superseded')));
    const otpId = crypto.randomUUID(); const code = this.generateCode(); const createdAt = new Date(now).toISOString(); const expiresAt = new Date(now + this.config.otpExpiresMinutes * 60_000).toISOString();
    const record = { OTPID: otpId, CustomerID: customerId, Identifier: identifier, Provider: provider, OTPHash: this.hash(code, otpId, identifier), Purpose: purpose, CreatedAt: createdAt, ExpiresAt: expiresAt, Attempts: 0, ResendCount: 0, Status: OTP_STATUSES.ACTIVE, LastSentAt: createdAt, LockedUntil: '', VerifiedAt: '', DeliveryStatus: OTP_DELIVERY_STATUSES.PENDING, ProviderMessageID: '' };
    await this.sheets.append(SHEET_NAMES.OTP_CHALLENGES, record); logger.info('auth.otp.generated', { otpId, provider, purpose });
    return { record, code };
  }
  async resend({ otpId, identifier, provider, purpose }) {
    const row = await this.requireUsable({ otpId, identifier, provider, purpose, checkExpiry: false }); const now = this.clock();
    if (time(row.ExpiresAt) <= now) { await this.expire(row); throw new AppError('OTP has expired.', { status: 410, code: 'OTP_EXPIRED' }); }
    if (now - time(row.LastSentAt) < this.config.otpCooldownSeconds * 1000) throw new AppError('Please wait before resending the OTP.', { status: 429, code: 'OTP_COOLDOWN' });
    if (number(row.ResendCount) >= this.config.otpMaxResends) throw new AppError('OTP resend limit reached.', { status: 429, code: 'OTP_RESEND_LIMIT' });
    const code = this.generateCode(); const sentAt = new Date(now).toISOString(); const updated = { ...row, OTPHash: this.hash(code, row.OTPID, row.Identifier), Attempts: 0, ResendCount: number(row.ResendCount) + 1, ExpiresAt: new Date(now + this.config.otpExpiresMinutes * 60_000).toISOString(), LastSentAt: sentAt, DeliveryStatus: OTP_DELIVERY_STATUSES.PENDING, ProviderMessageID: '' };
    await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, updated); logger.info('auth.otp.resent', { otpId, provider, purpose }); return { record: updated, code };
  }
  async requireUsable({ otpId, identifier, provider, purpose, checkExpiry = true }) {
    const row = await this.get(otpId); if (!row || row.Identifier !== identifier || row.Provider !== provider || row.Purpose !== purpose) throw new AppError('OTP challenge is invalid.', { status: 401, code: 'OTP_INVALID' });
    if (row.Status === OTP_STATUSES.VERIFIED) throw new AppError('OTP has already been used.', { status: 409, code: 'OTP_ALREADY_USED' });
    if (row.Status === OTP_STATUSES.LOCKED && time(row.LockedUntil) > this.clock()) throw new AppError('OTP verification is temporarily locked.', { status: 429, code: 'OTP_LOCKED' });
    if (row.Status === OTP_STATUSES.LOCKED) { row.Status = OTP_STATUSES.ACTIVE; row.Attempts = 0; row.LockedUntil = ''; await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, row); }
    if (row.Status !== OTP_STATUSES.ACTIVE) throw new AppError('OTP is no longer valid.', { status: 401, code: row.Status === OTP_STATUSES.EXPIRED ? 'OTP_EXPIRED' : 'OTP_INVALID' });
    if (checkExpiry && time(row.ExpiresAt) <= this.clock()) { await this.expire(row); throw new AppError('OTP has expired.', { status: 410, code: 'OTP_EXPIRED' }); }
    return row;
  }
  async verify({ otpId, identifier, provider, purpose, code }) {
    const row = await this.requireUsable({ otpId, identifier, provider, purpose });
    if (!this.matches(code, row)) {
      const attempts = number(row.Attempts) + 1; const locked = attempts >= this.config.otpMaxAttempts; const updated = { ...row, OTPHash: locked ? '' : row.OTPHash, Attempts: attempts, Status: locked ? OTP_STATUSES.INVALIDATED : row.Status, LockedUntil: '' };
      await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, updated); logger.warn('auth.otp.failed', { otpId, provider, purpose, attempts });
      throw new AppError(locked ? 'Too many incorrect attempts.' : 'OTP is incorrect.', { status: locked ? 429 : 401, code: locked ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_INCORRECT', details: { attemptsRemaining: Math.max(0, this.config.otpMaxAttempts - attempts) } });
    }
    const verifiedAt = new Date(this.clock()).toISOString(); await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, { ...row, OTPHash: '', Status: OTP_STATUSES.VERIFIED, VerifiedAt: verifiedAt }); logger.info('auth.otp.verified', { otpId, provider, purpose }); return { ...row, OTPHash: '', Status: OTP_STATUSES.VERIFIED, VerifiedAt: verifiedAt };
  }
  async invalidate(rowOrId, reason = 'invalidated') { const row = typeof rowOrId === 'string' ? await this.get(rowOrId) : rowOrId; if (!row || row.Status !== OTP_STATUSES.ACTIVE) return false; await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, { ...row, OTPHash: '', Status: OTP_STATUSES.INVALIDATED, DeliveryStatus: reason === 'delivery-failed' ? OTP_DELIVERY_STATUSES.FAILED : row.DeliveryStatus }); return true; }
  async expire(row) { await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, { ...row, OTPHash: '', Status: OTP_STATUSES.EXPIRED }); logger.info('auth.otp.expired', { otpId: row.OTPID, provider: row.Provider, purpose: row.Purpose }); }
  async cleanupExpired() { const now = this.clock(); const { rows } = await this.sheets.readRows(SHEET_NAMES.OTP_CHALLENGES, { filter: (row) => [OTP_STATUSES.ACTIVE, OTP_STATUSES.LOCKED].includes(row.Status) && time(row.ExpiresAt) <= now }); await Promise.all(rows.map((row) => this.expire(row))); return rows.length; }
  startCleanup() { if (this.cleanupTimer) return this.cleanupTimer; this.cleanupTimer = setInterval(() => this.cleanupExpired().catch((error) => logger.error('auth.otp.cleanup-failed', { code: error.code || 'OTP_CLEANUP_FAILED' })), this.config.otpCleanupIntervalMinutes * 60_000); this.cleanupTimer.unref?.(); return this.cleanupTimer; }
  async recordDelivery(otpId, { status, providerMessageId = '' }) { const row = await this.get(otpId); if (!row) return; await this.sheets.update(SHEET_NAMES.OTP_CHALLENGES, row._row, { ...row, DeliveryStatus: status, ProviderMessageID: providerMessageId }); }
}
export const otpService = new OTPService();
