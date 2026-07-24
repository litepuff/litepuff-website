import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { createId } from '../utils/createId.js';
import { requestSpreadsheet } from './googleSheets.js';

const SHEETS = Object.freeze({
  admins: 'ADMINS',
  activity: 'ADMIN_ACTIVITY',
  settings: 'ADMIN_SETTINGS'
});
const ADMIN_COLUMNS = Object.freeze([
  'AdminID', 'Name', 'Email', 'PasswordHash', 'Role',
  'Status', 'LastLogin', 'CreatedAt', 'UpdatedAt'
]);
const CACHE_TTL_MS = 30_000;
const normalize = (value) => String(value || '').trim().toLowerCase();
const columnKey = (value) => normalize(value).replace(/[^a-z0-9]/g, '');

class AdminSheetsService {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
    this.initialized = false;
  }

  requireSpreadsheet() {
    if (env.adminSpreadsheetId) return;
    const error = new Error('Admin spreadsheet is not configured');
    error.code = 'ADMIN_DATABASE_NOT_CONFIGURED';
    throw error;
  }

  async readSheet(sheetName, { fresh = false } = {}) {
    this.requireSpreadsheet();
    const cached = this.cache.get(sheetName);
    if (!fresh && cached?.expiresAt > Date.now()) return cached.value;
    if (!fresh && this.inFlight.has(sheetName)) return this.inFlight.get(sheetName);

    const pending = requestSpreadsheet(
      env.adminSpreadsheetId,
      `/values/${encodeURIComponent(`${sheetName}!A:ZZ`)}`
    ).then((response) => {
      const values = Array.isArray(response?.values) ? response.values : [];
      const headers = (values[0] || []).map((header) => String(header || '').trim());
      const rows = values.slice(1).map((valuesRow, index) => {
        const row = { _row: index + 2 };
        headers.forEach((header, columnIndex) => {
          if (header) row[header] = valuesRow[columnIndex] ?? '';
        });
        return row;
      });
      const value = { headers, rows };
      this.cache.set(sheetName, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    });

    this.inFlight.set(sheetName, pending);
    try {
      return await pending;
    } finally {
      this.inFlight.delete(sheetName);
    }
  }

  invalidate(sheetName) {
    this.cache.delete(sheetName);
  }

  async initialize() {
    if (this.initialized) return;
    this.requireSpreadsheet();
    const metadata = await requestSpreadsheet(
      env.adminSpreadsheetId,
      '?fields=sheets.properties.title'
    );
    const available = new Set(
      (metadata?.sheets || []).map((sheet) => sheet?.properties?.title).filter(Boolean)
    );
    const missingSheets = Object.values(SHEETS).filter((name) => !available.has(name));
    if (missingSheets.length) {
      const error = new Error(`Missing admin sheets: ${missingSheets.join(', ')}`);
      error.code = 'ADMIN_DATABASE_SCHEMA_INVALID';
      throw error;
    }

    const [admins, activity, settings] = await Promise.all([
      this.readSheet(SHEETS.admins),
      this.readSheet(SHEETS.activity),
      this.readSheet(SHEETS.settings)
    ]);
    const missingColumns = ADMIN_COLUMNS.filter((column) => !admins.headers.includes(column));
    if (missingColumns.length || !activity.headers.length || !settings.headers.length) {
      const error = new Error(
        missingColumns.length
          ? `ADMINS is missing columns: ${missingColumns.join(', ')}`
          : 'ADMIN_ACTIVITY and ADMIN_SETTINGS must contain header rows'
      );
      error.code = 'ADMIN_DATABASE_SCHEMA_INVALID';
      throw error;
    }
    const emails = admins.rows.map((row) => normalize(row.Email)).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      const error = new Error('ADMINS contains duplicate email addresses');
      error.code = 'DUPLICATE_ADMIN_EMAIL';
      throw error;
    }
    this.initialized = true;
  }

  async findAdminByEmail(email) {
    await this.initialize();
    const { rows } = await this.readSheet(SHEETS.admins);
    const matches = rows.filter((row) => normalize(row.Email) === normalize(email));
    if (matches.length > 1) {
      const error = new Error('ADMINS contains duplicate email addresses');
      error.code = 'DUPLICATE_ADMIN_EMAIL';
      throw error;
    }
    return matches[0] || null;
  }

  async findAdminById(adminId) {
    await this.initialize();
    const { rows } = await this.readSheet(SHEETS.admins);
    return rows.find((row) => String(row.AdminID) === String(adminId)) || null;
  }

  async updateAdmin(row, changes) {
    const next = { ...row, ...changes };
    await requestSpreadsheet(
      env.adminSpreadsheetId,
      `/values/${encodeURIComponent(`${SHEETS.admins}!A${row._row}:I${row._row}`)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({
          values: [ADMIN_COLUMNS.map((column) => next[column] ?? '')]
        })
      }
    );
    this.invalidate(SHEETS.admins);
    return next;
  }

  async readSettings() {
    await this.initialize();
    return (await this.readSheet(SHEETS.settings)).rows;
  }

  activityValue(header, activity) {
    return {
      activityid: activity.activityId,
      id: activity.activityId,
      adminid: activity.adminId,
      adminemail: activity.adminEmail,
      email: activity.adminEmail,
      action: activity.action,
      event: activity.action,
      module: activity.module,
      resource: activity.module,
      details: activity.details,
      metadata: activity.details,
      ipaddress: activity.ip,
      ip: activity.ip,
      useragent: activity.userAgent,
      createdat: activity.createdAt,
      timestamp: activity.createdAt
    }[columnKey(header)] ?? '';
  }

  async recordActivity({ request, admin, action, module, metadata = {} }) {
    try {
      await this.initialize();
      const { headers } = await this.readSheet(SHEETS.activity);
      const activity = {
        activityId: createId('admin-activity'),
        adminId: admin?.id || admin?.AdminID || '',
        adminEmail: admin?.email || admin?.Email || '',
        action,
        module,
        details: JSON.stringify(metadata),
        ip: request?.ip || String(request?.headers?.['x-forwarded-for'] || '').split(',')[0].trim(),
        userAgent: String(request?.headers?.['user-agent'] || '').slice(0, 500),
        createdAt: new Date().toISOString()
      };
      await requestSpreadsheet(
        env.adminSpreadsheetId,
        `/values/${encodeURIComponent(`${SHEETS.activity}!A:ZZ`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          body: JSON.stringify({
            values: [headers.map((header) => this.activityValue(header, activity))]
          })
        }
      );
      this.invalidate(SHEETS.activity);
      return true;
    } catch (error) {
      logger.error('admin.activity.write.failed', {
        action,
        module,
        error: error.message,
        code: error.code
      });
      return false;
    }
  }

  async diagnose() {
    await this.initialize();
    return {
      configured: true,
      sheets: Object.values(SHEETS),
      settingsRows: (await this.readSettings()).length
    };
  }
}

export const adminSheetsService = new AdminSheetsService();
export default adminSheetsService;
