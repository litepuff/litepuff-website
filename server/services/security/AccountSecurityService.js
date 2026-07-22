import { CUSTOMER_STATUSES } from '../../config/auth.js';
import { customerBusinessService } from '../business/CustomerService.js';
import { sessionService } from '../auth/SessionService.js';

export class AccountSecurityService {
  constructor({ customers = customerBusinessService, sessions = sessionService } = {}) { this.customers = customers; this.sessions = sessions; }
  async temporaryLock(customerId, expiresAt, reason = 'security-policy') { const until = new Date(expiresAt); if (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) throw new Error('Temporary lock expiry must be in the future.'); await this.customers.updateCustomer(customerId, { lockedUntil: until.toISOString(), lockReason: String(reason).slice(0, 120) }); await this.sessions.terminateAllSessions(customerId, 'account-temporarily-locked'); }
  async suspend(customerId, reason = 'manual-review') { await this.customers.updateCustomer(customerId, { status: CUSTOMER_STATUSES.SUSPENDED, lockReason: String(reason).slice(0, 120) }); await this.sessions.terminateAllSessions(customerId, 'account-suspended'); }
  async ban(customerId, reason = 'permanent-ban') { await this.customers.updateCustomer(customerId, { status: CUSTOMER_STATUSES.BLOCKED, bannedAt: new Date().toISOString(), lockReason: String(reason).slice(0, 120) }); await this.sessions.terminateAllSessions(customerId, 'account-banned'); }
  clearTemporaryLock(customerId) { return this.customers.updateCustomer(customerId, { lockedUntil: '', lockReason: '' }); }
}
export const accountSecurityService = new AccountSecurityService();
