import { AppError } from '../utils/AppError.js';
import { googleCredentialProvider } from './GoogleCredentialProvider.js';

export class GoogleSheetsConfig {
  constructor() {
    if (GoogleSheetsConfig.instance) return GoogleSheetsConfig.instance;
    this.provider = googleCredentialProvider;
    GoogleSheetsConfig.instance = this;
  }
  validate() {
    if (!this.provider.available) throw new AppError(this.provider.diagnostics().lastFailureReason || 'Google credentials are unavailable.', { status: 503, code: 'GOOGLE_CREDENTIALS_INVALID', details: { source: this.provider.diagnostics().credentialSource }, expose: true });
    return true;
  }
  get spreadsheetId() { return this.provider.spreadsheetId; }
  get serviceAccountEmail() { return this.provider.diagnostics().clientEmail || ''; }
  get credentialsConfigured() { return this.provider.available; }
}
export const googleSheetsConfig = new GoogleSheetsConfig();
