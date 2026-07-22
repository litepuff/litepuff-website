import crypto from 'crypto';
import { env } from '../../config/env.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { SESSION_STATUSES } from '../../config/auth.js';
import { googleSheetsService } from '../GoogleSheetsService.js';
import { jwtService } from './JwtService.js';
import { refreshTokenService } from './RefreshTokenService.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

export class SessionService {
  constructor({ sheets = googleSheetsService, jwt = jwtService, refreshTokens = refreshTokenService, config = env } = {}) { this.sheets = sheets; this.jwt = jwt; this.refreshTokens = refreshTokens; this.config = config; }
  async createSession(customer, metadata = {}) {
    const sessionId = crypto.randomUUID(); const now = new Date(); const identity = { customerId: customer.CustomerID, role: customer.Role || 'customer', sessionId };
    const refresh = this.refreshTokens.generate(identity); const expiresAt = new Date(now.getTime() + this.config.refreshTokenDays * 86_400_000).toISOString();
    await this.sheets.append(SHEET_NAMES.SESSIONS, { SessionID: sessionId, CustomerID: identity.customerId, Role: identity.role, RefreshTokenHash: refresh.hash, Status: SESSION_STATUSES.ACTIVE, CreatedAt: now.toISOString(), LastActivity: now.toISOString(), ExpiresAt: expiresAt, UserAgent: String(metadata.userAgent || '').slice(0, 240), IPAddress: String(metadata.ipAddress || '').slice(0, 64), TerminatedAt: '', TerminationReason: '', TrustedAt: metadata.trusted === false ? '' : now.toISOString() });
    logger.info('auth.session.created', { sessionId });
    return { sessionId, accessToken: this.jwt.signAccess(identity), refreshToken: refresh.token, expiresAt };
  }
  getSession(id) { return this.sheets.readOne(SHEET_NAMES.SESSIONS, (row) => row.SessionID === id); }
  async requireActive(id) { const session = await this.getSession(id); if (!session) throw new AppError('Session was not found.', { status: 401, code: 'SESSION_NOT_FOUND' }); if (session.Status !== SESSION_STATUSES.ACTIVE || session.TerminatedAt) throw new AppError('Session has been terminated.', { status: 401, code: 'SESSION_TERMINATED' }); if (new Date(session.ExpiresAt).getTime() <= Date.now()) throw new AppError('Session has expired.', { status: 401, code: 'SESSION_EXPIRED' }); return session; }
  async refreshSession(refreshToken) {
    const payload = this.refreshTokens.verify(refreshToken); const session = await this.requireActive(payload.sessionId);
    if (session.CustomerID !== payload.customerId || session.Role !== payload.role) throw new AppError('Refresh token does not match this session.', { status: 401, code: 'INVALID_REFRESH_TOKEN' });
    if (!this.refreshTokens.matches(refreshToken, session.RefreshTokenHash)) { await this.terminateSession(session.SessionID, 'refresh-token-replay'); throw new AppError('Refresh token reuse detected.', { status: 401, code: 'REFRESH_TOKEN_REUSED' }); }
    const identity = { customerId: session.CustomerID, role: session.Role, sessionId: session.SessionID }; const rotated = this.refreshTokens.generate(identity); const now = new Date().toISOString();
    await this.sheets.update(SHEET_NAMES.SESSIONS, session._row, { ...session, RefreshTokenHash: rotated.hash, LastActivity: now });
    logger.info('auth.session.refreshed', { sessionId: session.SessionID });
    return { sessionId: session.SessionID, accessToken: this.jwt.signAccess(identity), refreshToken: rotated.token, expiresAt: session.ExpiresAt };
  }
  async touch(session) { const now = new Date().toISOString(); await this.sheets.update(SHEET_NAMES.SESSIONS, session._row, { ...session, LastActivity: now }); }
  async terminateSession(id, reason = 'logout') { const session = await this.getSession(id); if (!session || session.Status === SESSION_STATUSES.TERMINATED) return false; const now = new Date().toISOString(); await this.sheets.update(SHEET_NAMES.SESSIONS, session._row, { ...session, Status: SESSION_STATUSES.TERMINATED, RefreshTokenHash: '', LastActivity: now, TerminatedAt: now, TerminationReason: reason }); logger.info('auth.session.terminated', { sessionId: id, reason }); return true; }
  async terminateAllSessions(customerId, reason = 'logout-all') { const { rows } = await this.sheets.readRows(SHEET_NAMES.SESSIONS, { filter: (row) => row.CustomerID === customerId && row.Status === SESSION_STATUSES.ACTIVE }); await Promise.all(rows.map((row) => this.terminateSession(row.SessionID, reason))); logger.info('auth.sessions.terminated-all', { count: rows.length }); return rows.length; }
  async terminateOwnedSession(customerId, sessionId, reason = 'logout-device') { const session = await this.getSession(sessionId); if (!session || session.CustomerID !== customerId) throw new AppError('Session was not found.', { status: 404, code: 'SESSION_NOT_FOUND' }); return this.terminateSession(sessionId, reason); }
  async terminateOtherSessions(customerId, currentSessionId, reason = 'security-change') { const { rows } = await this.sheets.readRows(SHEET_NAMES.SESSIONS, { filter: (row) => row.CustomerID === customerId && row.SessionID !== currentSessionId && row.Status === SESSION_STATUSES.ACTIVE }); await Promise.all(rows.map((row) => this.terminateSession(row.SessionID, reason))); logger.info('auth.sessions.terminated-others', { count: rows.length, reason }); return rows.length; }
  async listActiveSessions(customerId, currentSessionId = '') { const now = Date.now(); const { rows } = await this.sheets.readRows(SHEET_NAMES.SESSIONS, { filter: (row) => row.CustomerID === customerId && row.Status === SESSION_STATUSES.ACTIVE && !row.TerminatedAt && new Date(row.ExpiresAt).getTime() > now, sort: { field: 'LastActivity', direction: 'desc' } }); return rows.map((row) => this.publicSession(row, row.SessionID === currentSessionId)); }
  publicSession(session, isCurrent = false) { const agent = String(session.UserAgent || ''); const browser = /Edg\//i.test(agent) ? 'Edge' : /Chrome\//i.test(agent) ? 'Chrome' : /Firefox\//i.test(agent) ? 'Firefox' : /Safari\//i.test(agent) ? 'Safari' : 'Unknown'; const device = /Mobile|Android|iPhone|iPad/i.test(agent) ? 'Mobile' : agent ? 'Desktop' : 'Unknown'; return { id: session.SessionID, status: session.Status, isCurrent, trusted: Boolean(session.TrustedAt), trustedAt: session.TrustedAt || '', device, browser, ipAddress: session.IPAddress || '', createdAt: session.CreatedAt, lastActivity: session.LastActivity, expiresAt: session.ExpiresAt }; }
}
export const sessionService = new SessionService();
