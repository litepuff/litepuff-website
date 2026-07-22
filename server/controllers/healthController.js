import { createRequire } from 'module';
import { env } from '../config/env.js';
import { REQUIRED_SHEETS } from '../config/sheets.js';
import { googleSheetsService } from '../services/GoogleSheetsService.js';
import { fail, ok } from '../utils/apiResponse.js';
const require = createRequire(import.meta.url); const { version } = require('../../package.json');

export function health(request, response) {
  ok(response, { server: 'LitePuff API', version, environment: env.nodeEnv, uptime: Number(process.uptime().toFixed(2)), timestamp: new Date().toISOString(), environmentLoaded: true, googleSheetsInitialized: Boolean(env.googleSheetId && env.googleServiceAccountEmail && env.googlePrivateKey) }, 'Server is healthy.');
}

export async function googleSheetsHealth(request, response) {
  const started = performance.now();
  const sheets = await googleSheetsService.inspect();
  const availableSheets = sheets.map((sheet) => sheet.title);
  const missingSheets = REQUIRED_SHEETS.filter((sheet) => !availableSheets.includes(sheet));
  const healthy = missingSheets.length === 0;
  const data = { connectionStatus: 'connected', credentialsConfigured: true, spreadsheetAccessible: true, availableSheets, missingSheets, responseTimeMs: Math.round(performance.now() - started), healthStatus: healthy ? 'healthy' : 'degraded' };
  if (!healthy) return fail(response, 'Google Sheets is accessible but required worksheets are missing.', 503, data, 'GOOGLE_SHEETS_DEGRADED');
  ok(response, data, 'Google Sheets is healthy.');
}
