import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { SHEET_NAMES } from '../config/sheets.js';
import { createId } from '../utils/createId.js';

export class SessionRepository {
  constructor({ sheets = googleSheetsService, clock = () => new Date() } = {}) { this.sheets = sheets; this.clock = clock; this.sheet = SHEET_NAMES.WHATSAPP_SESSIONS; }
  findById(id) { return this.sheets.readOne(this.sheet, (row) => row.WhatsAppSessionID === id); }
  findActiveByPhone(phone) { return this.sheets.readOne(this.sheet, (row) => row.Phone === phone && String(row.Status).toLowerCase() === 'active'); }
  async create({ conversationId, phone, customerId = '', authenticated = false, expiresAt }) { const now = this.clock().toISOString(); const row = { WhatsAppSessionID: createId('wa_session'), ConversationID: conversationId, CustomerID: customerId, Phone: phone, Status: 'active', Authenticated: Boolean(authenticated), CreatedAt: now, LastActivity: now, ExpiresAt: expiresAt, ClosedAt: '' }; await this.sheets.append(this.sheet, row); return row; }
  async update(id, changes) { const row = await this.findById(id); if (!row) return null; const updated = { ...row, ...changes }; await this.sheets.update(this.sheet, row._row, updated); return updated; }
  close(id) { return this.update(id, { Status: 'closed', ClosedAt: this.clock().toISOString() }); }
  expire(id) { return this.update(id, { Status: 'expired', ClosedAt: this.clock().toISOString() }); }
  async activeCount() { const result = await this.sheets.readRows(this.sheet, { filter: (row) => String(row.Status).toLowerCase() === 'active' }); return result.rows.length; }
}
export const sessionRepository = new SessionRepository();
