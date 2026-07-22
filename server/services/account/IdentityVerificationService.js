import crypto from 'crypto';
import { env } from '../../config/env.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { googleSheetsService } from '../GoogleSheetsService.js';
import { createId } from '../../utils/createId.js';

export class IdentityVerificationService {
  constructor({ sheets = googleSheetsService, secret = env.otpSecret } = {}) { this.sheets = sheets; this.secret = secret; }
  identifierHash(identifier) { return crypto.createHmac('sha256', this.secret).update(String(identifier)).digest('hex'); }
  async record({ customerId, channel, identifier, purpose, method, source, verifiedAt = new Date().toISOString() }) { const row = { VerificationID: createId('verification'), CustomerID: customerId, Channel: channel, IdentifierHash: this.identifierHash(identifier), Purpose: purpose, Method: method, Source: source, VerifiedAt: verifiedAt }; await this.sheets.append(SHEET_NAMES.IDENTITY_VERIFICATIONS, row); return row; }
}
export const identityVerificationService = new IdentityVerificationService();
