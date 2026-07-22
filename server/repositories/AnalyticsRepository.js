import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { SHEET_NAMES } from '../config/sheets.js';

export class AnalyticsRepository {
  constructor({ sheets = googleSheetsService } = {}) { this.sheets = sheets; }
  snapshot() { return this.sheets.batchRead([{ sheet: SHEET_NAMES.WHATSAPP_MESSAGES }, { sheet: SHEET_NAMES.WHATSAPP_CONVERSATIONS }, { sheet: SHEET_NAMES.WHATSAPP_CAMPAIGNS }, { sheet: SHEET_NAMES.CUSTOMERS }]); }
}
export const analyticsRepository = new AnalyticsRepository();
