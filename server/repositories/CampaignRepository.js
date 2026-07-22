import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { SHEET_NAMES } from '../config/sheets.js';
import { createId } from '../utils/createId.js';

export class CampaignRepository {
  constructor({ sheets = googleSheetsService, clock = () => new Date() } = {}) { this.sheets = sheets; this.clock = clock; this.sheet = SHEET_NAMES.WHATSAPP_CAMPAIGNS; }
  findById(id) { return this.sheets.readOne(this.sheet, (row) => row.CampaignID === id && row.Status !== 'deleted'); }
  async list({ search = '', status, from, to, page = 1, limit = 50 } = {}) { return this.sheets.readRows(this.sheet, { filter: (row) => row.Status !== 'deleted' && (!status || row.Status === status) && (!from || new Date(row.CreatedAt) >= new Date(from)) && (!to || new Date(row.CreatedAt) <= new Date(to)), search: search ? { query: search, fields: ['CampaignID', 'Name', 'TemplateName'] } : undefined, sort: { field: 'CreatedAt', direction: 'desc' }, pagination: { page, limit } }); }
  async create(input) { const now = this.clock().toISOString(); const row = { CampaignID: createId('campaign'), Name: String(input.name || '').trim(), TemplateName: input.templateName || '', Audience: JSON.stringify(input.audience || {}), Status: input.scheduledAt ? 'scheduled' : 'draft', ScheduledAt: input.scheduledAt || '', CreatedBy: input.createdBy || '', CreatedAt: now, UpdatedAt: now, PausedAt: '', CompletedAt: '', TotalRecipients: Number(input.totalRecipients || 0), Queued: 0, Sent: 0, Delivered: 0, Read: 0, Failed: 0, Metadata: JSON.stringify(input.metadata || {}) }; await this.sheets.append(this.sheet, row); return row; }
  async update(id, changes) { const row = await this.findById(id); if (!row) return null; const updated = { ...row, ...changes, UpdatedAt: this.clock().toISOString() }; await this.sheets.update(this.sheet, row._row, updated); return updated; }
  remove(id) { return this.update(id, { Status: 'deleted' }); }
}
export const campaignRepository = new CampaignRepository();
