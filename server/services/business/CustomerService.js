import { BaseBusinessService } from './BaseBusinessService.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { AUTH_ROLES, CUSTOMER_STATUSES } from '../../config/auth.js';
import { validateCustomer } from '../../validation/domainValidation.js';
import { AppError } from '../../utils/AppError.js';
import { createId } from '../../utils/createId.js';

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const normalizePhone = (value = '') => String(value).replace(/[^+\d]/g, '');

export class CustomerService extends BaseBusinessService {
  constructor(dependencies = {}) { super({ sheet: SHEET_NAMES.CUSTOMERS, primaryKey: 'CustomerID', validator: validateCustomer, ...dependencies }); }
  findById(id) { return this.get(id); }
  findByEmail(email) { const normalized = normalizeEmail(email); return this.sheets.readOne(this.sheet, (row) => normalizeEmail(row.Email) === normalized); }
  findByPhone(phone) { const normalized = normalizePhone(phone); return this.sheets.readOne(this.sheet, (row) => normalizePhone(row.Phone) === normalized); }
  async createCustomer(input) {
    validateCustomer(input, true);
    if (input.email && await this.findByEmail(input.email)) throw new AppError('A customer with this email already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
    if (input.phone && await this.findByPhone(input.phone)) throw new AppError('A customer with this phone already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' });
    const now = new Date().toISOString();
    const row = { CustomerID: input.customerId || createId('customer'), FirstName: String(input.firstName || '').trim(), LastName: String(input.lastName || '').trim(), Email: normalizeEmail(input.email), Phone: normalizePhone(input.phone), Provider: input.provider || 'pending', GoogleID: '', ProfileImage: '', PasswordHash: '', CreatedAt: now, LastLogin: '', Status: input.status || CUSTOMER_STATUSES.ACTIVE, Role: input.role || AUTH_ROLES.CUSTOMER, EmailVerified: Boolean(input.emailVerified), PhoneVerified: Boolean(input.phoneVerified), MarketingConsent: Boolean(input.marketingConsent), UpdatedAt: now, DeletedAt: '', DeletedReason: '', VerificationDate: input.verificationDate || '', VerificationMethod: input.verificationMethod || '', VerificationSource: input.verificationSource || '', LockedUntil: '', LockReason: '', BannedAt: '' };
    await this.create(row); return row;
  }
  async updateCustomer(id, changes) {
    const current = await this.requireAvailable(id);
    if (changes.email && normalizeEmail(changes.email) !== normalizeEmail(current.Email)) { const duplicate = await this.findByEmail(changes.email); if (duplicate) throw new AppError('A customer with this email already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' }); }
    if (changes.phone && normalizePhone(changes.phone) !== normalizePhone(current.Phone)) { const duplicate = await this.findByPhone(changes.phone); if (duplicate) throw new AppError('A customer with this phone already exists.', { status: 409, code: 'DUPLICATE_CUSTOMER' }); }
    validateCustomer(changes, true);
    const fields = { firstName: 'FirstName', lastName: 'LastName', email: 'Email', phone: 'Phone', role: 'Role', status: 'Status', emailVerified: 'EmailVerified', phoneVerified: 'PhoneVerified', marketingConsent: 'MarketingConsent', verificationDate: 'VerificationDate', verificationMethod: 'VerificationMethod', verificationSource: 'VerificationSource', lockedUntil: 'LockedUntil', lockReason: 'LockReason', bannedAt: 'BannedAt' };
    const record = { ...current };
    for (const [input, column] of Object.entries(fields)) if (changes[input] !== undefined) record[column] = input === 'email' ? normalizeEmail(changes[input]) : input === 'phone' ? normalizePhone(changes[input]) : changes[input];
    record.UpdatedAt = new Date().toISOString();
    return this.sheets.update(this.sheet, current._row, record);
  }
  async updateLoginTimestamp(id) { const row = await this.requireAvailable(id); const now = new Date().toISOString(); return this.sheets.update(this.sheet, row._row, { ...row, LastLogin: now, UpdatedAt: now }); }
  async recordVerification(id, { method, source, date = new Date().toISOString() }) { return this.updateCustomer(id, { verificationDate: date, verificationMethod: method, verificationSource: source }); }
  async softDelete(id, reason = '') { const row = await this.require(id); if (row.DeletedAt) return row; const now = new Date().toISOString(); return this.sheets.update(this.sheet, row._row, { ...row, Status: CUSTOMER_STATUSES.DELETED, DeletedAt: now, DeletedReason: String(reason || '').trim().slice(0, 240), UpdatedAt: now }); }
  async requireAvailable(id) { const row = await this.require(id); if (row.DeletedAt || String(row.Status || '').toLowerCase() === CUSTOMER_STATUSES.DELETED) throw new AppError('Customer account has been deleted.', { status: 403, code: 'CUSTOMER_DELETED' }); return row; }
  async requireActive(id) { const row = await this.requireAvailable(id); const status = String(row.Status || '').toLowerCase(); if (row.LockedUntil && new Date(row.LockedUntil).getTime() > Date.now()) throw new AppError('Customer account is temporarily locked.', { status: 423, code: 'ACCOUNT_TEMPORARILY_LOCKED', details: { lockedUntil: row.LockedUntil } }); if (status === CUSTOMER_STATUSES.BLOCKED) throw new AppError('Customer account is blocked.', { status: 403, code: 'CUSTOMER_BLOCKED' }); if (status === CUSTOMER_STATUSES.SUSPENDED) throw new AppError('Customer account is suspended.', { status: 403, code: 'CUSTOMER_SUSPENDED' }); if (status !== CUSTOMER_STATUSES.ACTIVE) throw new AppError('Customer account is inactive.', { status: 403, code: 'CUSTOMER_INACTIVE' }); return row; }
  async role(id) { return (await this.requireAvailable(id)).Role || AUTH_ROLES.CUSTOMER; }
  async status(id) { return (await this.require(id)).Status; }
  publicIdentity(row) { const verified = String(row.EmailVerified).toLowerCase() === 'true' || String(row.PhoneVerified).toLowerCase() === 'true'; return { id: row.CustomerID, firstName: row.FirstName, lastName: row.LastName, email: row.Email, phone: row.Phone, role: row.Role || AUTH_ROLES.CUSTOMER, status: row.Status, emailVerified: String(row.EmailVerified).toLowerCase() === 'true', phoneVerified: String(row.PhoneVerified).toLowerCase() === 'true', marketingConsent: String(row.MarketingConsent).toLowerCase() === 'true', verificationDate: row.VerificationDate || (verified ? row.CreatedAt : ''), verificationMethod: row.VerificationMethod || (verified ? 'otp' : ''), verificationSource: row.VerificationSource || (verified ? String(row.Provider || '').toLowerCase() : ''), joinedAt: row.CreatedAt, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt, lastLogin: row.LastLogin }; }
}
export const customerBusinessService = new CustomerService();
