import crypto from 'crypto';
import { env } from '../../config/env.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { googleSheetsService } from '../GoogleSheetsService.js';
import { createId } from '../../utils/createId.js';
import { logger } from '../../utils/logger.js';

const clean = (value) => String(value ?? '').replace(/[\r\n\t]/g, ' ').slice(0, 240);
const safeMetadata = (metadata = {}) => Object.fromEntries(Object.entries(metadata).filter(([key]) => !/email|phone|otp|jwt|token|secret|password|cookie|authorization/i.test(key)).slice(0, 12).map(([key, value]) => [clean(key), typeof value === 'object' ? '[object]' : clean(value)]));
export class AuditLogService {
  constructor({ sheets = googleSheetsService, secret = env.cookieSecret } = {}) { this.sheets = sheets; this.secret = secret; }
  ipHash(ip) { return ip ? crypto.createHmac('sha256', this.secret).update(String(ip)).digest('hex') : ''; }
  async record({ request, actor = {}, event, permission = '', resource = '', action = '', decision = '', metadata = {} }) { const row = { AuditID: createId('audit'), FirebaseUID: '', CustomerID: actor.type === 'customer' ? actor.id : '', Event: clean(event), IPHash: this.ipHash(request?.ip), UserAgent: clean(request?.get?.('user-agent') || ''), CreatedAt: new Date().toISOString(), ActorID: clean(actor.id || 'anonymous'), ActorRole: clean(actor.role || 'guest'), Permission: clean(permission), Resource: clean(resource), Action: clean(action), Decision: clean(decision), RequestID: clean(request?.id || ''), Metadata: JSON.stringify(safeMetadata(metadata)) }; await this.sheets.append(SHEET_NAMES.AUTH_AUDIT, row); logger.info('security.audit.recorded', { event: row.Event, decision: row.Decision, actorRole: row.ActorRole }); return row; }
  recordSafe(input) { return this.record(input).catch((error) => logger.error('security.audit.failed', { code: error.code || 'AUDIT_WRITE_FAILED' })); }
}
export const auditLogService = new AuditLogService();
