import { COLUMN_ALIASES, SHEET_DEPENDENCIES, SHEET_RULES, SHEET_SCHEMAS } from '../config/sheets.js';
import { googleSheetsConfig } from '../config/GoogleSheetsConfig.js';
import { googleCredentialProvider } from '../config/GoogleCredentialProvider.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const SHEETS = SHEET_SCHEMAS;

let initialization;
let metadataCache;
let metadataExpiresAt = 0;
const rowCache = new Map();
const CACHE_TTL_MS = Number(process.env.GOOGLE_SHEETS_CACHE_TTL_MS || 60_000);
const MAX_RETRIES = 2;
const inFlightReads = new Map();
let mutationQueue = Promise.resolve();
const DEPENDENTS = SHEET_DEPENDENCIES;
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function safeGooglePayload(payload) {
  const source = payload?.error || payload;
  if (!source || typeof source !== 'object') return undefined;
  return { code: source.code, status: source.status, message: source.message || source.error_description || source.error, details: source.details };
}

function requireConfig() {
  googleSheetsConfig.validate();
}

async function accessToken() {
  requireConfig();
  try {
    return await googleCredentialProvider.getAccessToken();
  } catch (cause) {
    googleCredentialProvider.markFailure(cause);
    throw new AppError(`Google authentication failed: ${cause.message}`, { status: 503, code: cause.code || 'GOOGLE_AUTHENTICATION_FAILED', details: { step: 'google-authentication', source: googleCredentialProvider.diagnostics().credentialSource }, cause, expose: true });
  }
}

async function request(
  path,
  options = {},
  attempt = 0,
  spreadsheetId = googleSheetsConfig.spreadsheetId
) {
  const started = performance.now();
  let response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
      ...options,
      signal: AbortSignal.timeout(8_000),
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  } catch (cause) {
    if (cause instanceof AppError && cause.code !== 'GOOGLE_TOKEN_NETWORK_ERROR') throw cause;
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, (1_000 * (2 ** attempt)) + Math.floor(Math.random() * 250)));
      return request(path, options, attempt + 1, spreadsheetId);
    }
    if (cause instanceof AppError) throw cause;
    const error = new AppError(`Google Sheets network request failed: ${cause.message}`, { status: 503, code: cause.name === 'TimeoutError' ? 'GOOGLE_SHEETS_TIMEOUT' : 'GOOGLE_SHEETS_NETWORK_ERROR', details: { step: 'spreadsheet-request', causeCode: cause.code || cause.name }, cause, expose: true });
    googleCredentialProvider.markFailure(error);
    throw error;
  }
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after') || 0) * 1_000;
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter, (1_000 * (2 ** attempt)) + Math.floor(Math.random() * 250))));
      return request(path, options, attempt + 1, spreadsheetId);
    }
    const permissionHint = response.status === 403 ? ` Share the spreadsheet with ${googleSheetsConfig.serviceAccountEmail} as Editor and ensure the Google Sheets API is enabled.` : '';
    const code = response.status === 403 ? 'GOOGLE_SHEETS_PERMISSION_DENIED' : response.status === 404 ? 'GOOGLE_SPREADSHEET_NOT_FOUND' : response.status === 429 ? 'GOOGLE_SHEETS_RATE_LIMITED' : 'GOOGLE_SHEETS_API_ERROR';
    const unavailable = response.status === 429 || response.status >= 500;
    const message = unavailable ? 'Store data is temporarily busy. Please try again in a moment.' : `${payload?.error?.message || 'Google Sheets API request failed.'}${permissionHint}`;
    const error = new AppError(message, { status: unavailable || response.status === 404 ? 503 : response.status, code, details: { step: 'spreadsheet-request', googleStatus: response.status, googleResponse: safeGooglePayload(payload) }, expose: true });
    googleCredentialProvider.markFailure(error);
    throw error;
  }
  logger.info('google-sheets.request', { operation: options.method || 'GET', resource: String(path).split('?')[0], status: response.status, attempt: attempt + 1, durationMs: Math.round(performance.now() - started) });
  return payload;
}

async function spreadsheetMetadata(force = false) {
  if (!force && metadataCache && Date.now() < metadataExpiresAt) return metadataCache;
  metadataCache = await request('?fields=properties.title,sheets.properties');
  metadataExpiresAt = Date.now() + 60_000;
  return metadataCache;
}

function invalidate(sheetName) {
  rowCache.delete(sheetName);
}

function cacheAppend(sheetName, record, updatedRange) {
  const cached = rowCache.get(sheetName);
  if (!cached) return;
  const rowNumber = Number(String(updatedRange || '').match(/![A-Z]+(\d+)/)?.[1] || 0);
  if (!rowNumber) return invalidate(sheetName);
  cached.rows.push({ _row: rowNumber, ...record });
  cached.expiresAt = Date.now() + CACHE_TTL_MS;
}

function cacheUpdate(sheetName, rowNumber, record) {
  const cached = rowCache.get(sheetName);
  if (!cached) return;
  const index = cached.rows.findIndex((row) => row._row === Number(rowNumber));
  if (index < 0) return invalidate(sheetName);
  cached.rows[index] = { _row: Number(rowNumber), ...record };
  cached.expiresAt = Date.now() + CACHE_TTL_MS;
}

function cacheDelete(sheetName, rowNumber) {
  const cached = rowCache.get(sheetName);
  if (!cached) return;
  cached.rows = cached.rows.filter((row) => row._row !== Number(rowNumber)).map((row) => row._row > Number(rowNumber) ? { ...row, _row: row._row - 1 } : row);
  cached.expiresAt = Date.now() + CACHE_TTL_MS;
}

function comparable(value) {
  return String(value ?? '').trim().toLowerCase();
}

function dataError(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function validateRecord(sheetName, record, rowNumber) {
  const rules = SHEET_RULES[sheetName];
  if (!rules) return;
  if (!comparable(record[rules.primaryKey])) throw dataError(`${rules.primaryKey} is required.`);
  const rows = await getRows(sheetName);
  if (rows.some((row) => row._row !== rowNumber && comparable(row[rules.primaryKey]) === comparable(record[rules.primaryKey]))) {
    throw dataError(`Duplicate ${rules.primaryKey}.`, 409);
  }
  for (const fields of rules.unique || []) {
    if (fields.some((field) => !comparable(record[field]))) continue;
    if (rows.some((row) => row._row !== rowNumber && fields.every((field) => comparable(row[field]) === comparable(record[field])))) {
      throw dataError(`Duplicate ${fields.join('/')} record.`, 409);
    }
  }
  for (const field of rules.email || []) {
    if (record[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(record[field]).trim())) throw dataError(`${field} is invalid.`);
  }
  for (const field of rules.phone || []) {
    if (record[field] && !/^[+]?[0-9\s-]{7,16}$/.test(String(record[field]).trim())) throw dataError(`${field} is invalid.`);
  }
  for (const field of rules.numeric || []) {
    if (record[field] !== '' && record[field] !== undefined && !Number.isFinite(Number(record[field]))) throw dataError(`${field} must be numeric.`);
  }
  for (const [field, [parentSheet, parentKey]] of Object.entries(rules.foreign || {})) {
    const value = record[field];
    if (value && !(await getRows(parentSheet)).some((row) => comparable(row[parentKey]) === comparable(value))) {
      throw dataError(`${field} references a missing ${parentSheet} record.`, 409);
    }
  }
}

async function rawValues(range) {
  const key = String(range);
  if (inFlightReads.has(key)) return inFlightReads.get(key);
  const operation = request(`/values/${encodeURIComponent(range)}`)
    .then((payload) => payload.values || [])
    .finally(() => inFlightReads.delete(key));
  inFlightReads.set(key, operation);
  return operation;
}

export function requestSpreadsheet(spreadsheetId, path, options = {}) {
  if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
  return request(path, options, 0, spreadsheetId);
}

async function batchRawValues(ranges) {
  if (!ranges.length) return [];
  const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join('&');
  const payload = await request(`/values:batchGet?${query}`);
  return (payload.valueRanges || []).map((item) => item.values || []);
}

async function writeValues(range, values) {
  return request(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values })
  });
}

export async function syncGoogleSheetsSchema() {
  if (initialization) return initialization;
  initialization = (async () => {
    const spreadsheet = await spreadsheetMetadata();
    const existing = new Set(spreadsheet.sheets?.map((sheet) => sheet.properties.title));
    const missing = Object.keys(SHEETS).filter((title) => !existing.has(title));

    if (missing.length) {
      await request(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) })
      });
      metadataCache = null;
    }

    const sheetEntries = Object.entries(SHEETS);
    const valuesBySheet = await batchRawValues(sheetEntries.map(([title]) => `${title}!A:ZZ`));

    for (const [index, [title, headers]] of sheetEntries.entries()) {
      const values = valuesBySheet[index] || [];
      const currentHeaders = values[0] || [];
      if (!currentHeaders.length) {
        await writeValues(`${title}!A1`, [headers]);
        continue;
      }

      if (title === 'CUSTOMERS' && currentHeaders.includes('GoogleAuth') && !currentHeaders.includes('Provider')) {
        const records = values.slice(1).map((row) => Object.fromEntries(currentHeaders.map((header, index) => [header, row[index] ?? ''])));
        const migrated = records.map((record) => headers.map((header) => {
          if (header === 'Provider') return String(record.GoogleAuth).toLowerCase() === 'true' ? 'Google' : 'Password';
          return record[header] ?? '';
        }));
        await request(`/values/${encodeURIComponent(`${title}!A:ZZ`)}:clear`, { method: 'POST', body: '{}' });
        await writeValues(`${title}!A1`, [headers, ...migrated]);
        invalidate(title);
        continue;
      }
      const normalizedHeaders = currentHeaders.map((current) => {
        const canonical = headers.find((header) => header === current || COLUMN_ALIASES[title]?.[header]?.includes(current));
        return canonical || current;
      });
      const isSafeHeaderExtension = normalizedHeaders.every((header, index) => headers[index] === header);
      if (isSafeHeaderExtension && currentHeaders.length < headers.length) {
        await writeValues(`${title}!A1`, [headers]);
        invalidate(title);
        continue;
      }
      const invalid = headers.some((header, index) => normalizedHeaders[index] !== header);
      if (invalid && title === 'CUSTOMERS' && currentHeaders.includes('CustomerID')) {
        const records = values.slice(1).map((row) => Object.fromEntries(currentHeaders.map((header, index) => [header, row[index] ?? ''])));
        const migrated = records.map((record) => headers.map((header) => record[header] ?? (header === 'MarketingConsent' ? 'false' : '')));
        await request(`/values/${encodeURIComponent(`${title}!A:ZZ`)}:clear`, { method: 'POST', body: '{}' });
        await writeValues(`${title}!A1`, [headers, ...migrated]);
        invalidate(title);
        continue;
      }
      if (invalid) {
        const error = new Error(`Google Sheet ${title} has an incompatible header layout. Expected: ${headers.join(', ')}.`);
        error.status = 503;
        throw error;
      }
    }
  })().catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

export async function synchronizeGoogleSheets({ removeUnused = false } = {}) {
  const spreadsheet = await spreadsheetMetadata(true);
  const existing = new Map((spreadsheet.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties]));
  const missing = Object.keys(SHEETS).filter((title) => !existing.has(title));
  if (missing.length) {
    await request(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }) });
  }

  for (const [title, headers] of Object.entries(SHEETS)) {
    const values = existing.has(title) ? await rawValues(`${title}!A:ZZ`) : [];
    const currentHeaders = values[0] || [];
    const indexes = headers.map((header) => {
      const candidates = [header, ...(COLUMN_ALIASES[title]?.[header] || [])];
      return currentHeaders.findIndex((current) => candidates.includes(current));
    });
    const normalizedRows = values.slice(1).map((row) => indexes.map((index) => index >= 0 ? row[index] ?? '' : ''));
    await request(`/values/${encodeURIComponent(`${title}!A:ZZ`)}:clear`, { method: 'POST', body: '{}' });
    await writeValues(`${title}!A1`, [headers, ...normalizedRows]);
    invalidate(title);
  }

  const unused = [...existing.entries()].filter(([title]) => !SHEETS[title]);
  if (removeUnused && unused.length) {
    const populated = [];
    for (const [title] of unused) {
      if ((await rawValues(`${title}!A:ZZ`)).length > 1) populated.push(title);
    }
    if (populated.length) {
      const error = new Error(`Refusing to delete populated non-standard sheets: ${populated.join(', ')}.`);
      error.status = 409;
      throw error;
    }
    await request(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: unused.map(([, properties]) => ({ deleteSheet: { sheetId: properties.sheetId } })) }) });
  }
  metadataCache = null;
  initialization = null;
  rowCache.clear();
  await syncGoogleSheetsSchema();
  return inspectGoogleSheetsSchema();
}

export async function inspectGoogleSheetsSchema() {
  const spreadsheet = await request('?fields=properties.title,sheets.properties');
  const worksheets = spreadsheet.sheets || [];
  const valuesBySheet = await batchRawValues(worksheets.map((sheet) => `${sheet.properties.title}!A:ZZ`));
  return worksheets.map((sheet, index) => {
    const title = sheet.properties.title;
    const values = valuesBySheet[index] || [];
    return {
      title,
      sheetId: sheet.properties.sheetId,
      rowCount: sheet.properties.gridProperties?.rowCount || 0,
      populatedRows: Math.max(0, values.length - 1),
      headers: values[0] || [],
      sampleWidth: values[1]?.length || 0
    };
  });
}

export async function diagnoseGoogleSheetsConnection() {
  requireConfig();
  const spreadsheet = await spreadsheetMetadata(true);
  const worksheets = (spreadsheet.sheets || []).map((sheet) => sheet.properties.title);
  const missingWorksheets = Object.keys(SHEETS).filter((title) => !worksheets.includes(title));
  const title = spreadsheet.properties?.title || 'Untitled';
  googleCredentialProvider.markSpreadsheetConnected(title, worksheets.length);
  return { connected: true, spreadsheet: title, worksheetCount: worksheets.length, worksheets, missingWorksheets, scope: GOOGLE_SCOPE };
}

function serializeMutation(task) {
  const operation = mutationQueue.catch(() => {}).then(task);
  mutationQueue = operation.catch(() => {});
  return operation;
}

export function resetGoogleSheetsConnection() {
  googleCredentialProvider.authClient = null;
  initialization = undefined;
  metadataCache = undefined;
  metadataExpiresAt = 0;
  rowCache.clear();
}

export async function getRows(sheetName) {
  if (!SHEETS[sheetName]) throw new Error(`Unknown Google Sheet: ${sheetName}`);
  const cached = rowCache.get(sheetName);
  if (cached && Date.now() < cached.expiresAt) return cached.rows.map((row) => ({ ...row }));
  await syncGoogleSheetsSchema();
  const values = await rawValues(`${sheetName}!A:ZZ`);
  const headers = values[0]?.length ? values[0].map((current) => {
    return SHEETS[sheetName].find((header) => header === current || COLUMN_ALIASES[sheetName]?.[header]?.includes(current)) || current;
  }) : SHEETS[sheetName];
  const rows = values.slice(1).map((row, index) => ({
    _row: index + 2,
    ...Object.fromEntries(headers.map((header, column) => [header, row[column] ?? '']))
  }));
  rowCache.set(sheetName, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
  return rows.map((row) => ({ ...row }));
}

export async function findRow(sheetName, predicate) {
  return (await getRows(sheetName)).find(predicate) || null;
}

export async function auditGoogleSheetsData() {
  const data = Object.fromEntries(await Promise.all(Object.keys(SHEETS).map(async (sheetName) => [sheetName, await getRows(sheetName)])));
  const issues = [];
  for (const [sheetName, rows] of Object.entries(data)) {
    const rules = SHEET_RULES[sheetName];
    for (const fields of [[rules.primaryKey], ...(rules.unique || [])]) {
      const seen = new Set();
      rows.forEach((row) => {
        const key = fields.map((field) => comparable(row[field])).join('|');
        if (!key.replaceAll('|', '')) issues.push({ sheet: sheetName, type: 'missing-key', fields, row: row._row });
        else if (seen.has(key)) issues.push({ sheet: sheetName, type: 'duplicate', fields, row: row._row });
        else seen.add(key);
      });
    }
    for (const [field, [parentSheet, parentKey]] of Object.entries(rules.foreign || {})) {
      const parents = new Set(data[parentSheet].map((row) => comparable(row[parentKey])));
      rows.forEach((row) => {
        if (row[field] && !parents.has(comparable(row[field]))) issues.push({ sheet: sheetName, type: 'orphan', fields: [field], row: row._row });
      });
    }
    for (const field of rules.numeric || []) {
      rows.forEach((row) => {
        if (row[field] !== '' && !Number.isFinite(Number(row[field]))) issues.push({ sheet: sheetName, type: 'invalid-number', fields: [field], row: row._row });
      });
    }
    for (const field of rules.email || []) {
      rows.forEach((row) => {
        if (row[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row[field]).trim())) issues.push({ sheet: sheetName, type: 'invalid-email', fields: [field], row: row._row });
      });
    }
  }
  return { counts: Object.fromEntries(Object.entries(data).map(([sheet, rows]) => [sheet, rows.length])), issues };
}

export async function appendRow(sheetName, record) {
  if (!SHEETS[sheetName]) throw new Error(`Unknown Google Sheet: ${sheetName}`);
  await syncGoogleSheetsSchema();
  await validateRecord(sheetName, record);
  return serializeMutation(async () => {
    await validateRecord(sheetName, record);
    // Recheck inside the write queue so concurrent identical primary-key appends
    // become an idempotent replay instead of duplicate rows.
    const primaryKey = SHEET_RULES[sheetName]?.primaryKey;
    if (primaryKey && comparable(record[primaryKey])) {
      const existing = (await getRows(sheetName)).find((row) => comparable(row[primaryKey]) === comparable(record[primaryKey]));
      if (existing) return { deduplicated: true, existingRow: existing._row };
    }
    const result = await request(`/values/${encodeURIComponent(`${sheetName}!A:A`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: [SHEETS[sheetName].map((header) => record[header] ?? '')] })
    });
    cacheAppend(sheetName, record, result?.updates?.updatedRange);
    return result;
  });
}

export async function updateRow(sheetName, rowNumber, record) {
  if (!SHEETS[sheetName]) throw new Error(`Unknown Google Sheet: ${sheetName}`);
  await syncGoogleSheetsSchema();
  await validateRecord(sheetName, record, Number(rowNumber));
  return serializeMutation(async () => {
    await validateRecord(sheetName, record, Number(rowNumber));
    const existing = (await getRows(sheetName)).find((row) => row._row === Number(rowNumber));
    const unchanged = existing && SHEETS[sheetName].every((header) => String(existing[header] ?? '') === String(record[header] ?? ''));
    if (unchanged) return { deduplicated: true, unchanged: true };
    const result = await writeValues(`${sheetName}!A${rowNumber}`, [SHEETS[sheetName].map((header) => record[header] ?? '')]);
    cacheUpdate(sheetName, rowNumber, record);
    return result;
  });
}

export async function batchUpdateRows(sheetName, updates) {
  if (!SHEETS[sheetName]) throw new Error(`Unknown Google Sheet: ${sheetName}`);
  if (!Array.isArray(updates) || !updates.length) return { totalUpdatedRows: 0 };
  await syncGoogleSheetsSchema();
  for (const update of updates) await validateRecord(sheetName, update.record, Number(update.rowNumber));
  const data = updates.map(({ rowNumber, record }) => ({ range: `${sheetName}!A${rowNumber}`, values: [SHEETS[sheetName].map((header) => record[header] ?? '')] }));
  return serializeMutation(async () => {
    const current = await getRows(sheetName);
    const changed = updates.filter(({ rowNumber, record }) => {
      const existing = current.find((row) => row._row === Number(rowNumber));
      return !existing || SHEETS[sheetName].some((header) => String(existing[header] ?? '') !== String(record[header] ?? ''));
    });
    if (!changed.length) return { totalUpdatedRows: 0, deduplicated: true };
    const changedData = changed.map(({ rowNumber, record }) => ({ range: `${sheetName}!A${rowNumber}`, values: [SHEETS[sheetName].map((header) => record[header] ?? '')] }));
    const result = await request('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: changedData }) });
    changed.forEach(({ rowNumber, record }) => cacheUpdate(sheetName, rowNumber, record));
    return result;
  });
}

export async function deleteRow(sheetName, rowNumber) {
  if (!SHEETS[sheetName]) throw new Error(`Unknown Google Sheet: ${sheetName}`);
  await syncGoogleSheetsSchema();
  const record = (await getRows(sheetName)).find((row) => row._row === Number(rowNumber));
  if (!record) throw dataError(`${sheetName} record not found.`, 404);
  const primaryKey = SHEET_RULES[sheetName]?.primaryKey;
  for (const [dependentSheet, foreignKey] of DEPENDENTS[sheetName] || []) {
    if ((await getRows(dependentSheet)).some((row) => comparable(row[foreignKey]) === comparable(record[primaryKey]))) {
      throw dataError(`Cannot delete ${sheetName} record while ${dependentSheet} records reference it.`, 409);
    }
  }
  const metadata = await spreadsheetMetadata();
  const sheet = metadata.sheets.find((item) => item.properties.title === sheetName);
  const result = await request(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }] })
  });
  cacheDelete(sheetName, rowNumber);
  return result;
}

export function publicCustomer(row) {
  return {
    id: row.CustomerID,
    firstName: row.FirstName,
    lastName: row.LastName,
    email: row.Email,
    phone: row.Phone,
    provider: row.Provider || (String(row.GoogleAuth).toLowerCase() === 'true' ? 'Google' : 'Password'),
    googleAuth: row.Provider === 'Google' || String(row.GoogleAuth).toLowerCase() === 'true',
    profileImage: row.ProfileImage || '',
    status: row.Status,
    createdAt: row.CreatedAt,
    lastLogin: row.LastLogin
  };
}
