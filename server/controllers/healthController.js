import { createRequire } from 'module';
import { env } from '../config/env.js';
import { REQUIRED_SHEETS } from '../config/sheets.js';
import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { googleCredentialProvider } from '../config/GoogleCredentialProvider.js';
import { fail, ok } from '../utils/apiResponse.js';
const require = createRequire(import.meta.url); const { version } = require('../../package.json');

function googleFailure(error) {
  return { connected: false, reason: error.message, code: error.code || 'GOOGLE_SHEETS_ERROR', status: error.status || 503, step: error.details?.step, googleStatus: error.details?.googleStatus };
}

export async function health(request, response) {
  let googleSheetsDetails;
  try { googleSheetsDetails = await googleSheetsService.diagnose(); } catch (error) { googleSheetsDetails = googleFailure(error); }
  const googleStatus = googleSheetsDetails.connected ? 'connected' : 'disabled';
  const data = { server: 'running', version, environment: env.nodeEnv, uptime: Number(process.uptime().toFixed(2)), timestamp: new Date().toISOString(), environmentLoaded: true, google: googleStatus, googleSheets: googleStatus };
  if (googleSheetsDetails.connected) data.spreadsheet = googleSheetsDetails.spreadsheet;
  if (!googleSheetsDetails.connected) data.reason = googleSheetsDetails.reason;
  ok(response, data, googleSheetsDetails.connected ? 'Server is healthy.' : 'Server is running with Google Sheets disabled.');
}

export async function googleHealth(request, response) {
  try { await googleSheetsService.diagnose(); } catch (error) { googleCredentialProvider.markFailure(error); }
  ok(response, googleCredentialProvider.diagnostics(), 'Google integration diagnostics.');
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
