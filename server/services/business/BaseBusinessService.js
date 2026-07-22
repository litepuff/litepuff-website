import { googleSheetsService } from '../GoogleSheetsService.js';
import { notFound } from '../../utils/AppError.js';

export class BaseBusinessService {
  constructor({ sheet, primaryKey, validator, sheets = googleSheetsService }) { this.sheet = sheet; this.primaryKey = primaryKey; this.validator = validator; this.sheets = sheets; }
  list(options) { return this.sheets.readRows(this.sheet, options); }
  get(id) { return this.sheets.readOne(this.sheet, (row) => row[this.primaryKey] === id); }
  async require(id) { const row = await this.get(id); if (!row) throw notFound(this.sheet); return row; }
  async create(record) { this.validator?.(record, false); return this.sheets.append(this.sheet, record); }
  async update(id, changes) { this.validator?.(changes, true); const row = await this.require(id); return this.sheets.update(this.sheet, row._row, { ...row, ...changes }); }
  async delete(id) { const row = await this.require(id); await this.sheets.delete(this.sheet, row._row); return row; }
}
