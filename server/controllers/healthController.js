import { createRequire } from 'module';
import { env } from '../config/env.js';
import { REQUIRED_SHEETS } from '../config/sheets.js';
import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { fail, ok } from '../utils/apiResponse.js';
const require = createRequire(import.meta.url); const { version } = require('../../package.json');

function googleFailure(error) {
  return { connected: false, reason: error.message, code: error.code || 'GOOGLE_SHEETS_ERROR', status: error.status || 503, step: error.details?.step, googleStatus: error.details?.googleStatus };
}

export async function health(request, response) {
  let googleSheets;
  try { googleSheets = await googleSheetsService.diagnose(); } catch (error) { googleSheets = googleFailure(error); }
  ok(response, { server: 'LitePuff API', version, environment: env.nodeEnv, uptime: Number(process.uptime().toFixed(2)), timestamp: new Date().toISOString(), environmentLoaded: true, googleSheets }, googleSheets.connected ? 'Server is healthy.' : 'Server is running but Google Sheets is unavailable.');
}

export async function googleSheetsHealth(request, response) {
  const started = performance.now();
  const diagnostic = await googleSheetsService.diagnose();
  const availableSheets = diagnostic.worksheets;
  const missingSheets = REQUIRED_SHEETS.filter((sheet) => !availableSheets.includes(sheet));
  const healthy = missingSheets.length === 0;
  const data = { connectionStatus: 'connected', credentialsConfigured: true, spreadsheetAccessible: true, spreadsheet: diagnostic.spreadsheet, worksheetCount: diagnostic.worksheetCount, availableSheets, missingSheets, responseTimeMs: Math.round(performance.now() - started), healthStatus: healthy ? 'healthy' : 'degraded' };
  if (!healthy) return fail(response, 'Google Sheets is accessible but required worksheets are missing.', 503, data, 'GOOGLE_SHEETS_DEGRADED');
  ok(response, data, 'Google Sheets is healthy.');
}
