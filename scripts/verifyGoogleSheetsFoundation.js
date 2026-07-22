import crypto from 'crypto';
import { googleSheetsService } from '../server/services/GoogleSheetsService.js';
import { SHEET_NAMES } from '../server/config/sheets.js';

const testId = `foundation-${crypto.randomUUID()}`;
const key = `__litepuff_test_${testId}`;
const record = { SettingID: testId, Key: key, Value: 'created', Type: 'verification', UpdatedAt: new Date().toISOString() };
const result = { read: false, create: false, update: false, delete: false, search: false, filter: false, batchRead: false, batchUpdate: false, validation: false, recovery: false, cleanup: false };

try {
  const baseline = await googleSheetsService.readRows(SHEET_NAMES.SETTINGS);
  result.read = Array.isArray(baseline.rows);

  await googleSheetsService.append(SHEET_NAMES.SETTINGS, record);
  result.create = Boolean(await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (row) => row.SettingID === testId));

  result.search = (await googleSheetsService.readRows(SHEET_NAMES.SETTINGS, { search: { query: key, fields: ['Key'] } })).rows.some((row) => row.SettingID === testId);
  result.filter = (await googleSheetsService.readRows(SHEET_NAMES.SETTINGS, { filter: (row) => row.Type === 'verification' })).rows.some((row) => row.SettingID === testId);

  let row = await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId);
  await googleSheetsService.update(SHEET_NAMES.SETTINGS, row._row, { ...row, Value: 'updated', UpdatedAt: new Date().toISOString() });
  result.update = (await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId))?.Value === 'updated';

  const batch = await googleSheetsService.batchRead([{ sheet: SHEET_NAMES.SETTINGS }, { sheet: SHEET_NAMES.INVENTORY }]);
  result.batchRead = Array.isArray(batch.SETTINGS.rows) && Array.isArray(batch.INVENTORY.rows);

  row = await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId);
  await googleSheetsService.batchUpdate(SHEET_NAMES.SETTINGS, [{ rowNumber: row._row, record: { ...row, Value: 'batch-updated', UpdatedAt: new Date().toISOString() } }]);
  result.batchUpdate = (await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId))?.Value === 'batch-updated';

  try { await googleSheetsService.append(SHEET_NAMES.SETTINGS, { ...record, SettingID: `${testId}-duplicate` }); }
  catch (error) { result.validation = error.status === 409; }

  googleSheetsService.resetConnection();
  result.recovery = Boolean(await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId));
} finally {
  const row = await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId).catch(() => null);
  if (row) { await googleSheetsService.delete(SHEET_NAMES.SETTINGS, row._row); result.delete = true; }
  result.cleanup = !(await googleSheetsService.readOne(SHEET_NAMES.SETTINGS, (item) => item.SettingID === testId));
}

const failed = Object.entries(result).filter(([, passed]) => !passed).map(([check]) => check);
console.log(JSON.stringify({ success: failed.length === 0, checks: result, failed }));
if (failed.length) process.exitCode = 1;
