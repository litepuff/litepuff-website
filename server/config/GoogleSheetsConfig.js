import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

export class GoogleSheetsConfig {
  constructor() {
    if (GoogleSheetsConfig.instance) return GoogleSheetsConfig.instance;
    this.spreadsheetId = env.googleSheetId;
    this.serviceAccountEmail = env.googleServiceAccountEmail;
    this.privateKey = env.googlePrivateKey;
    GoogleSheetsConfig.instance = this;
  }
  validate() {
    const missing = Object.entries({ GOOGLE_SHEET_ID: this.spreadsheetId, 'GOOGLE_SERVICE_ACCOUNT_EMAIL (or GOOGLE_SERVICE_EMAIL)': this.serviceAccountEmail, GOOGLE_PRIVATE_KEY: this.privateKey }).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) throw new AppError(`Google Sheets credentials are missing: ${missing.join(', ')}`, { status: 503, code: 'GOOGLE_CREDENTIALS_MISSING', details: { missing } });
    if (!this.privateKey.includes('-----BEGIN PRIVATE KEY-----') || !this.privateKey.includes('-----END PRIVATE KEY-----')) throw new AppError('GOOGLE_PRIVATE_KEY is not a valid PEM private key. Store it with literal \\n separators or real line breaks.', { status: 503, code: 'GOOGLE_PRIVATE_KEY_INVALID', details: { step: 'credentials-validation' }, expose: true });
    return true;
  }
  get credentialsConfigured() { return Boolean(this.spreadsheetId && this.serviceAccountEmail && this.privateKey); }
}
export const googleSheetsConfig = new GoogleSheetsConfig();
