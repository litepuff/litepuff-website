import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { GoogleCredentialProvider, normalizeGooglePrivateKey } from '../config/GoogleCredentialProvider.js';

const privateKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const account = { type: 'service_account', project_id: 'litepuff-test', private_key_id: 'key-id', private_key: privateKey, client_email: 'test@litepuff-test.iam.gserviceaccount.com', client_id: 'client-id', auth_uri: 'https://accounts.google.com/o/oauth2/auth', token_uri: 'https://oauth2.googleapis.com/token' };
const withSheet = (values = {}) => ({ GOOGLE_SHEET_ID: 'sheet-id', ...values });

test('JSON credentials have highest priority and create an official JWT client', () => {
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(account), GOOGLE_SERVICE_ACCOUNT_BASE64: 'ignored', GOOGLE_PRIVATE_KEY: 'ignored' }) });
  assert.equal(provider.diagnostics().credentialSource, 'GOOGLE_SERVICE_ACCOUNT_JSON');
  assert.equal(provider.available, true);
  assert.equal(provider.getAuthClient().constructor.name, 'JWT');
});

test('Base64 JSON supports padded and unpadded deployment values', () => {
  const encoded = Buffer.from(JSON.stringify(account)).toString('base64').replace(/=+$/, '');
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_BASE64: encoded }) });
  assert.equal(provider.diagnostics().credentialSource, 'GOOGLE_SERVICE_ACCOUNT_BASE64');
  assert.equal(provider.available, true);
});

test('JSON file source is parsed without exposing its contents', () => {
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_FILE: '/run/secrets/google.json' }), fileSystem: { readFileSync: () => JSON.stringify(account) } });
  assert.equal(provider.diagnostics().credentialSource, 'GOOGLE_SERVICE_ACCOUNT_FILE');
  assert.equal(provider.available, true);
});

test('legacy variables remain backward compatible', () => {
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_EMAIL: account.client_email, GOOGLE_PRIVATE_KEY: privateKey }) });
  assert.equal(provider.diagnostics().credentialSource, 'legacy');
  assert.equal(provider.available, true);
});

test('Hostinger, Railway and Docker newline formats normalize to the same PEM', () => {
  const escaped = privateKey.replace(/\n/g, '\\n');
  const doubleEscaped = privateKey.replace(/\n/g, '\\\\n');
  assert.equal(normalizeGooglePrivateKey(privateKey), privateKey.trim());
  assert.equal(normalizeGooglePrivateKey(escaped), privateKey.trim());
  assert.equal(normalizeGooglePrivateKey(`"${doubleEscaped}"`), privateKey.trim());
  assert.equal(normalizeGooglePrivateKey(`\uFEFF  ${privateKey.replace(/\n/g, '\r\n')}  `), privateKey.trim());
});

test('invalid JSON, PEM and missing spreadsheet disable Google without throwing', () => {
  const invalidJson = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_JSON: '{' }) });
  const invalidPem = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, private_key: 'invalid' }) }) });
  const missingSheet = new GoogleCredentialProvider({ environment: { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) } });
  assert.equal(invalidJson.available, false);
  assert.match(invalidJson.diagnostics().lastFailureReason, /Invalid Google service-account JSON/);
  assert.equal(invalidPem.available, false);
  assert.match(invalidPem.diagnostics().lastFailureReason, /Invalid PEM/);
  assert.equal(missingSheet.available, false);
  assert.throws(() => missingSheet.getAuthClient(), /GOOGLE_SHEET_ID/);
});

test('permission, expired credential and missing worksheet failures remain observable', () => {
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }) });
  for (const reason of ['Permission denied', 'invalid_grant: expired credentials', 'Missing worksheet: ORDERS']) {
    provider.markFailure(new Error(reason));
    assert.equal(provider.diagnostics().lastFailureReason, reason);
    assert.equal(provider.diagnostics().spreadsheetConnected, false);
  }
});

test('transient network authentication is retried and then succeeds', async () => {
  const provider = new GoogleCredentialProvider({ environment: withSheet({ GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }) });
  let attempts = 0;
  provider.authClient = { getAccessToken: async () => { attempts += 1; if (attempts === 1) { const error = new Error('network timeout'); error.code = 'ETIMEDOUT'; throw error; } return { token: 'test-token' }; } };
  assert.equal(await provider.getAccessToken(), 'test-token');
  assert.equal(attempts, 2);
  assert.equal(provider.diagnostics().authenticated, true);
});
