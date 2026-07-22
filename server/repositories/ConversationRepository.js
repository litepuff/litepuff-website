import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { SHEET_NAMES } from '../config/sheets.js';
import { createId } from '../utils/createId.js';

export class ConversationRepository {
  constructor({ sheets = googleSheetsService, clock = () => new Date() } = {}) { this.sheets = sheets; this.clock = clock; this.sheet = SHEET_NAMES.WHATSAPP_CONVERSATIONS; }
  findById(id) { return this.sheets.readOne(this.sheet, (row) => row.ConversationID === id); }
  findActiveByPhone(phone) { return this.sheets.readOne(this.sheet, (row) => row.Phone === phone && String(row.Status).toLowerCase() === 'active'); }
  async create({ phone, customerId = '', intent = 'unknown', step = 'received' }) { const now = this.clock().toISOString(); const row = { ConversationID: createId('conversation'), CustomerID: customerId, Phone: phone, Status: 'active', CurrentIntent: intent, CurrentStep: step, LastMessageID: '', LastMessageType: '', LastMessageAt: '', CreatedAt: now, UpdatedAt: now, ClosedAt: '', Metadata: '{}', UnreadCount: 0, IsPinned: 'false', AssignedTo: '', AssignedAt: '', ResolvedAt: '' }; await this.sheets.append(this.sheet, row); return row; }
  async update(id, changes) { const row = await this.findById(id); if (!row) return null; const updated = { ...row, ...changes, UpdatedAt: this.clock().toISOString() }; await this.sheets.update(this.sheet, row._row, updated); return updated; }
  close(id) { return this.update(id, { Status: 'closed', ClosedAt: this.clock().toISOString() }); }
  async list({ search = '', status, unread, assigned, pinned, customerId, from, to, page = 1, limit = 50 } = {}) { return this.sheets.readRows(this.sheet, { filter: (row) => (!status || row.Status === status) && (!customerId || row.CustomerID === customerId) && (unread === undefined || (Number(row.UnreadCount || 0) > 0) === (unread === true || unread === 'true')) && (assigned === undefined || Boolean(row.AssignedTo) === (assigned === true || assigned === 'true')) && (pinned === undefined || String(row.IsPinned).toLowerCase() === String(pinned).toLowerCase()) && (!from || new Date(row.LastMessageAt || row.CreatedAt) >= new Date(from)) && (!to || new Date(row.LastMessageAt || row.CreatedAt) <= new Date(to)), search: search ? { query: search, fields: ['ConversationID', 'Phone', 'CustomerID', 'CurrentIntent'] } : undefined, sort: { field: 'LastMessageAt', direction: 'desc' }, pagination: { page, limit } }); }
  pin(id, pinned = true) { return this.update(id, { IsPinned: String(Boolean(pinned)) }); }
  assign(id, adminId = '') { return this.update(id, { AssignedTo: adminId, AssignedAt: adminId ? this.clock().toISOString() : '' }); }
  resolve(id) { const now = this.clock().toISOString(); return this.update(id, { Status: 'resolved', ResolvedAt: now, ClosedAt: now }); }
  markRead(id) { return this.update(id, { UnreadCount: 0 }); }
  async activeCount() { const result = await this.sheets.readRows(this.sheet, { filter: (row) => String(row.Status).toLowerCase() === 'active' }); return result.rows.length; }
}
export const conversationRepository = new ConversationRepository();
