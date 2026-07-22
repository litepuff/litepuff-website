import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

export class GoogleSheetsConfig {
  constructor() {
    if (GoogleSheetsConfig.instance) return GoogleSheetsConfig.instance;
    this.spreadsheetId = env.googleSheetId;
    this.serviceAccountEmail = env.googleServiceAccountEmail;
    this.privateKey = env.googlePrivateKey;
    this.projectId = env.googleProjectId;
    this.privateKeyId = env.googlePrivateKeyId;
    this.tokenUri = env.googleTokenUri;
    this.authUri = env.googleAuthUri;
    this.clientId = env.googleClientId;
    this.credentialsSource = env.googleCredentialsSource;
    this.credentialsError = env.googleCredentialsError;
    GoogleSheetsConfig.instance = this;
  }
  validate() {
    if (this.credentialsError) throw new AppError(this.credentialsError, { status: 503, code: 'GOOGLE_SERVICE_ACCOUNT_JSON_INVALID', details: { step: 'credentials-loading', credentialsSource: this.credentialsSource }, expose: true });
    const missing = Object.entries({ GOOGLE_SHEET_ID: this.spreadsheetId, 'GOOGLE_SERVICE_ACCOUNT_EMAIL (or GOOGLE_SERVICE_EMAIL)': this.serviceAccountEmail, GOOGLE_PRIVATE_KEY: this.privateKey }).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) throw new AppError(`Google Sheets credentials are missing: ${missing.join(', ')}`, { status: 503, code: 'GOOGLE_CREDENTIALS_MISSING', details: { missing } });
    if (!this.privateKey.includes('-----BEGIN PRIVATE KEY-----') || !this.privateKey.includes('-----END PRIVATE KEY-----')) {
      const field = this.credentialsSource === 'GOOGLE_SERVICE_ACCOUNT_JSON' ? 'GOOGLE_SERVICE_ACCOUNT_JSON.private_key' : 'GOOGLE_PRIVATE_KEY';
      throw new AppError(`${field} is not a valid PEM private key.`, { status: 503, code: 'GOOGLE_PRIVATE_KEY_INVALID', details: { step: 'credentials-validation', credentialsSource: this.credentialsSource }, expose: true });
    }
    return true;
  }
  get credentialsConfigured() { return Boolean(this.spreadsheetId && this.serviceAccountEmail && this.privateKey); }
  get credentials() { return { client_email: this.serviceAccountEmail, private_key: this.privateKey, project_id: this.projectId, private_key_id: this.privateKeyId, token_uri: this.tokenUri, auth_uri: this.authUri, client_id: this.clientId }; }
}
export const googleSheetsConfig = new GoogleSheetsConfig();
