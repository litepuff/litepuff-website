import * as sheets from './googleSheets.js';
import { SHEET_SCHEMAS } from '../config/sheets.js';
import { AppError } from '../utils/AppError.js';

const compare = (left, right) => String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true, sensitivity: 'base' });

export class GoogleSheetsService {
  #assertSheet(sheetName) {
    if (!SHEET_SCHEMAS[sheetName]) throw new AppError(`Unknown worksheet: ${sheetName}`, { status: 400, code: 'UNKNOWN_SHEET' });
  }

  async readRows(sheetName, options = {}) {
    this.#assertSheet(sheetName);
    let rows = await sheets.getRows(sheetName);
    if (options.filter) rows = rows.filter(options.filter);
    if (options.search?.query) {
      const query = String(options.search.query).trim().toLowerCase();
      const fields = options.search.fields || SHEET_SCHEMAS[sheetName];
      rows = rows.filter((row) => fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query)));
    }
    if (options.sort?.field) {
      const direction = options.sort.direction === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) => compare(a[options.sort.field], b[options.sort.field]) * direction);
    }
    const page = Math.max(1, Number(options.pagination?.page || 1));
    const limit = Math.min(250, Math.max(1, Number(options.pagination?.limit || rows.length || 1)));
    const total = rows.length;
    if (options.pagination) rows = rows.slice((page - 1) * limit, page * limit);
    return { rows, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async readOne(sheetName, predicate) { this.#assertSheet(sheetName); return sheets.findRow(sheetName, predicate); }
  async append(sheetName, record) { this.#assertSheet(sheetName); await sheets.appendRow(sheetName, record); return record; }
  async update(sheetName, rowNumber, record) { this.#assertSheet(sheetName); await sheets.updateRow(sheetName, rowNumber, record); return record; }
  async delete(sheetName, rowNumber) { this.#assertSheet(sheetName); return sheets.deleteRow(sheetName, rowNumber); }
  async batchUpdate(sheetName, updates) { this.#assertSheet(sheetName); return sheets.batchUpdateRows(sheetName, updates); }
  async batchRead(requests) { return Object.fromEntries(await Promise.all(requests.map(async ({ sheet, options }) => [sheet, await this.readRows(sheet, options)]))); }
  async inspect() { return sheets.inspectGoogleSheetsSchema(); }
  async synchronize(options) { return sheets.synchronizeGoogleSheets(options); }
  async audit() { return sheets.auditGoogleSheetsData(); }
  clearCache() { return sheets.clearGoogleSheetsCache?.(); }
  resetConnection() { return sheets.resetGoogleSheetsConnection(); }
}

export const googleSheetsService = new GoogleSheetsService();
