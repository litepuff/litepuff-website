import crypto from 'crypto';
import fs from 'fs';
import { google } from 'googleapis';

const REQUIRED_JSON_FIELDS = ['type', 'project_id', 'private_key', 'client_email', 'client_id', 'private_key_id', 'token_uri', 'auth_uri'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function normalizeQuoted(value) {
  let result = String(value ?? '').replace(/^\uFEFF/, '').trim();
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) result = result.slice(1, -1);
  return result.trim();
}

export function normalizeGooglePrivateKey(value = '') {
  return normalizeQuoted(value).replace(/\r\n?/g, '\n').replace(/\\+n/g, '\n').trim();
}

function fingerprint(value) {
  const text = String(value ?? '');
  return { sha256: crypto.createHash('sha256').update(text).digest('hex'), length: text.length };
}

function transient(error) {
  const status = Number(error?.response?.status || error?.status || 0);
  return ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(error?.code) || status === 429 || status >= 500;
}

function credentialError(message, details = {}) {
  const error = new Error(message);
  error.code = 'GOOGLE_CREDENTIALS_INVALID';
  error.status = 503;
  error.details = details;
  return error;
}

function parseJson(value, source) {
  let parsed;
  try { parsed = JSON.parse(normalizeQuoted(value)); }
  catch (cause) { throw credentialError(`Invalid Google service-account JSON from ${source}: ${cause.message}`, { source }); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw credentialError(`${source} must contain a JSON object.`, { source });
  const missing = REQUIRED_JSON_FIELDS.filter((field) => typeof parsed[field] !== 'string' || !parsed[field].trim());
  if (missing.length) throw credentialError(`${source} is missing required fields: ${missing.join(', ')}`, { source, missing });
  if (parsed.type !== 'service_account') throw credentialError(`${source}.type must be service_account.`, { source });
  return parsed;
}

function validatePem(privateKey, source) {
  if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') || !privateKey.endsWith('-----END PRIVATE KEY-----')) throw credentialError(`Invalid PEM structure from ${source}.`, { source });
  try { crypto.createPrivateKey(privateKey); }
  catch (cause) { throw credentialError(`Invalid private key from ${source}: ${cause.message}`, { source, opensslCode: cause.code, reason: cause.reason }); }
}

export class GoogleCredentialProvider {
  constructor({ environment = process.env, fileSystem = fs } = {}) {
    this.environment = environment;
    this.fileSystem = fileSystem;
    this.authClient = null;
    this.credentials = null;
    this.state = { credentialSource: 'none', authenticated: false, spreadsheetConnected: false, spreadsheetTitle: null, worksheetCount: 0, clientEmail: null, lastAuthenticationTime: null, lastFailureReason: null, credentialFingerprint: null };
    this.#load();
  }

  #disable(error, source) {
    this.credentials = null;
    this.state = { ...this.state, credentialSource: source, authenticated: false, spreadsheetConnected: false, lastFailureReason: error.message };
  }

  #load() {
    const source = this.environment;
    let credentialSource = 'legacy';
    let raw = '';
    try {
      let parsed;
      if (Object.prototype.hasOwnProperty.call(source, 'GOOGLE_SERVICE_ACCOUNT_JSON')) {
        credentialSource = 'GOOGLE_SERVICE_ACCOUNT_JSON'; raw = source.GOOGLE_SERVICE_ACCOUNT_JSON; parsed = parseJson(raw, credentialSource);
      } else if (Object.prototype.hasOwnProperty.call(source, 'GOOGLE_SERVICE_ACCOUNT_BASE64')) {
        credentialSource = 'GOOGLE_SERVICE_ACCOUNT_BASE64'; raw = normalizeQuoted(source.GOOGLE_SERVICE_ACCOUNT_BASE64);
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw credentialError('GOOGLE_SERVICE_ACCOUNT_BASE64 is not valid Base64.', { source: credentialSource });
        const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=');
        parsed = parseJson(Buffer.from(padded, 'base64').toString('utf8'), credentialSource);
      } else if (Object.prototype.hasOwnProperty.call(source, 'GOOGLE_SERVICE_ACCOUNT_FILE')) {
        credentialSource = 'GOOGLE_SERVICE_ACCOUNT_FILE';
        const filePath = normalizeQuoted(source.GOOGLE_SERVICE_ACCOUNT_FILE); raw = this.fileSystem.readFileSync(filePath, 'utf8'); parsed = parseJson(raw, credentialSource);
      } else {
        raw = `${source.GOOGLE_SERVICE_ACCOUNT_EMAIL || source.GOOGLE_SERVICE_EMAIL || ''}:${source.GOOGLE_PRIVATE_KEY || ''}`;
        parsed = { type: 'service_account', project_id: source.GOOGLE_PROJECT_ID || '', private_key: source.GOOGLE_PRIVATE_KEY || '', client_email: source.GOOGLE_SERVICE_ACCOUNT_EMAIL || source.GOOGLE_SERVICE_EMAIL || '', client_id: source.GOOGLE_CLIENT_ID || '', private_key_id: source.GOOGLE_PRIVATE_KEY_ID || '', token_uri: source.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token', auth_uri: source.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth' };
        if (!parsed.client_email || !parsed.private_key) throw credentialError('Legacy Google credentials are not configured.', { source: credentialSource });
      }
      parsed.private_key = normalizeGooglePrivateKey(parsed.private_key);
      validatePem(parsed.private_key, credentialSource);
      this.credentials = Object.freeze(parsed);
      this.state = { ...this.state, credentialSource, clientEmail: parsed.client_email, lastFailureReason: null, credentialFingerprint: fingerprint(raw) };
    } catch (error) { this.#disable(error.code ? error : credentialError(`Unable to load Google credentials: ${error.message}`, { source: credentialSource }), credentialSource); }
  }

  get spreadsheetId() { return normalizeQuoted(this.environment.GOOGLE_SHEET_ID || ''); }
  get available() { return Boolean(this.credentials && this.spreadsheetId); }

  getAuthClient() {
    if (!this.credentials) throw credentialError(this.state.lastFailureReason || 'Google credentials are unavailable.', { source: this.state.credentialSource });
    if (!this.spreadsheetId) throw credentialError('GOOGLE_SHEET_ID is missing.', { source: this.state.credentialSource });
    if (!this.authClient) {
      this.authClient = new google.auth.JWT({ email: this.credentials.client_email, key: this.credentials.private_key, scopes: SCOPES });
    }
    return this.authClient;
  }

  async getAccessToken(attempt = 0) {
    try {
      const result = await this.getAuthClient().getAccessToken();
      const token = typeof result === 'string' ? result : result?.token;
      if (!token) throw credentialError('Google authentication returned no access token.', { source: this.state.credentialSource });
      this.state = { ...this.state, authenticated: true, lastAuthenticationTime: new Date().toISOString(), lastFailureReason: null };
      return token;
    } catch (error) {
      if (transient(error) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
        return this.getAccessToken(attempt + 1);
      }
      this.state = { ...this.state, authenticated: false, spreadsheetConnected: false, lastFailureReason: error.message };
      throw error;
    }
  }

  markSpreadsheetConnected(title, worksheetCount) { this.state = { ...this.state, authenticated: true, spreadsheetConnected: true, spreadsheetTitle: title, worksheetCount, lastFailureReason: null }; }
  markFailure(error) { this.state = { ...this.state, spreadsheetConnected: false, lastFailureReason: error.message }; }
  diagnostics() { return { ...this.state }; }
}

export const googleCredentialProvider = new GoogleCredentialProvider();
