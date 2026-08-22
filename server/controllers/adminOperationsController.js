import { created, ok } from '../utils/apiResponse.js';
import { createBackup, listBackups } from '../services/backupService.js';
import { csvReport, excelReport } from '../services/reportService.js';

export async function exportAdminReport(request, response) {
  const format = String(request.query.format || 'csv').toLowerCase();
  if (!['csv', 'xlsx'].includes(format)) return response.status(422).json({ success: false, message: 'Report format must be csv or xlsx.' });
  const contents = format === 'xlsx' ? await excelReport(request.params.type, request.query) : await csvReport(request.params.type, request.query);
  response.setHeader('Content-Disposition', `attachment; filename="${request.params.type}-report.${format}"`);
  response.type(format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  response.send(contents);
}

export async function createAdminBackup(request, response) {
  const { filePath: _filePath, ...backup } = await createBackup(request.admin?.email || 'admin');
  created(response, { backup }, 'Backup created.');
}

export async function getAdminBackups(_request, response) {
  ok(response, { backups: await listBackups() });
}
