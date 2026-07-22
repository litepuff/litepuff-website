import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRows, SHEETS } from './googleSheets.js';
import { createId } from '../utils/createId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(__dirname, '..', 'backups');

export async function createBackup(adminEmail = 'system') {
  await fs.mkdir(backupDir, { recursive: true });
  const backupId = createId('backup');
  const fileName = `${backupId}.json`;
  const filePath = path.join(backupDir, fileName);
  const data = {};
  for (const sheet of Object.keys(SHEETS)) {
    data[sheet] = await getRows(sheet);
  }
  const createdAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify({ backupId, createdAt, createdBy: adminEmail, data }, null, 2));
  return { backupId, fileName, filePath, createdAt, createdBy: adminEmail, status: 'created' };
}

export async function listBackups() {
  await fs.mkdir(backupDir, { recursive: true });
  const files = (await fs.readdir(backupDir)).filter((fileName) => fileName.endsWith('.json'));
  return Promise.all(files.map(async (fileName) => {
    const backup = JSON.parse(await fs.readFile(path.join(backupDir, fileName), 'utf8'));
    return { backupId: backup.backupId, fileName, createdAt: backup.createdAt, createdBy: backup.createdBy || 'system', status: 'created' };
  }));
}

export function backupPath(fileName) {
  return path.join(backupDir, path.basename(fileName));
}

export async function readBackup(fileName) {
  return JSON.parse(await fs.readFile(backupPath(fileName), 'utf8'));
}
