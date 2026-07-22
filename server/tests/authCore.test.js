import test from 'node:test';
import assert from 'node:assert/strict';
import jsonwebtoken from 'jsonwebtoken';
import { JwtService } from '../services/auth/JwtService.js';
import { RefreshTokenService } from '../services/auth/RefreshTokenService.js';
import { SessionService } from '../services/auth/SessionService.js';
import { CustomerService } from '../services/business/CustomerService.js';
import { createAuthMiddleware, createAuthorizationMiddleware } from '../middleware/authMiddleware.js';
import { setAuthCookies } from '../utils/authCookies.js';

class MemorySheets {
  constructor(seed = {}) { this.data = structuredClone(seed); }
  async readRows(sheet, options = {}) { let rows = [...(this.data[sheet] || [])]; if (options.filter) rows = rows.filter(options.filter); return { rows, pagination: { total: rows.length } }; }
  async readOne(sheet, predicate) { return (this.data[sheet] || []).find(predicate) || null; }
  async append(sheet, record) { const row = { _row: (this.data[sheet]?.length || 0) + 2, ...record }; (this.data[sheet] ||= []).push(row); return row; }
  async update(sheet, rowNumber, record) { const index = this.data[sheet].findIndex((row) => row._row === rowNumber); this.data[sheet][index] = { ...record, _row: rowNumber }; return this.data[sheet][index]; }
  async delete(sheet, rowNumber) { this.data[sheet] = this.data[sheet].filter((row) => row._row !== rowNumber); }
}

const config = { jwtSecret: 'a'.repeat(64), jwtRefreshSecret: 'b'.repeat(64), cookieSecret: 'c'.repeat(64), accessTokenMinutes: 15, refreshTokenDays: 30, nodeEnv: 'test' };
const customer = { _row: 2, CustomerID: 'customer-test', FirstName: 'Test', LastName: 'Customer', Email: 'test@example.com', Phone: '+919876543210', Role: 'customer', Status: 'active', DeletedAt: '' };

function services(seed = { CUSTOMERS: [customer], SESSIONS: [] }) {
  const sheets = new MemorySheets(seed); const jwt = new JwtService(config); const refreshTokens = new RefreshTokenService({ jwt, pepper: config.cookieSecret }); const sessions = new SessionService({ sheets, jwt, refreshTokens, config }); const customers = new CustomerService({ sheets });
  return { sheets, jwt, refreshTokens, sessions, customers };
}

test('JWT access payload contains only identity/session claims plus JWT timestamps', () => { const { jwt } = services(); const token = jwt.signAccess({ customerId: 'customer-test', role: 'customer', sessionId: 'session-test' }); const payload = jwt.verifyAccess(token); assert.deepEqual(Object.keys(payload).sort(), ['customerId', 'exp', 'iat', 'role', 'sessionId'].sort()); assert.equal(payload.customerId, 'customer-test'); });
test('JWT rejects invalid and expired access tokens', () => { const { jwt } = services(); assert.throws(() => jwt.verifyAccess('invalid'), (error) => error.code === 'INVALID_ACCESS_TOKEN'); const expired = jsonwebtoken.sign({ customerId: 'c', role: 'customer', sessionId: 's' }, config.jwtSecret, { expiresIn: -1 }); assert.throws(() => jwt.verifyAccess(expired), (error) => error.code === 'ACCESS_TOKEN_EXPIRED'); });
test('Session creation, refresh rotation, and replay invalidation work', async () => { const { sessions } = services(); const created = await sessions.createSession(customer); const rotated = await sessions.refreshSession(created.refreshToken); assert.notEqual(rotated.refreshToken, created.refreshToken); await assert.rejects(() => sessions.refreshSession(created.refreshToken), (error) => error.code === 'REFRESH_TOKEN_REUSED'); await assert.rejects(() => sessions.requireActive(created.sessionId), (error) => error.code === 'SESSION_TERMINATED'); });
test('Session logout and logout-all invalidate active sessions', async () => { const { sessions } = services(); const first = await sessions.createSession(customer); const second = await sessions.createSession(customer); assert.equal(await sessions.terminateSession(first.sessionId), true); await assert.rejects(() => sessions.requireActive(first.sessionId)); assert.equal(await sessions.terminateAllSessions(customer.CustomerID), 1); await assert.rejects(() => sessions.requireActive(second.sessionId)); });
test('Customer lookup, duplicate detection, status and soft delete work', async () => { const { customers } = services(); assert.equal((await customers.findById(customer.CustomerID)).Email, customer.Email); assert.equal((await customers.findByEmail('TEST@EXAMPLE.COM')).CustomerID, customer.CustomerID); assert.equal((await customers.findByPhone('+91 98765 43210')).CustomerID, customer.CustomerID); await assert.rejects(() => customers.createCustomer({ email: customer.Email, phone: '+919999999999' }), (error) => error.code === 'DUPLICATE_CUSTOMER'); await customers.softDelete(customer.CustomerID); await assert.rejects(() => customers.requireActive(customer.CustomerID), (error) => error.code === 'CUSTOMER_DELETED'); });
test('Authentication middleware protects routes and validates active customers', async () => { const { jwt, sessions, customers } = services(); const tokens = await sessions.createSession(customer); const middleware = createAuthMiddleware({ jwt, sessions, customers }); const request = { signedCookies: { lp_access: tokens.accessToken }, get: () => '', id: 'request-test' }; await new Promise((resolve, reject) => middleware.protectCustomerRoute(request, {}, (error) => error ? reject(error) : resolve())); assert.equal(request.customer.id, customer.CustomerID); const missing = { signedCookies: {}, get: () => '', id: 'missing' }; await assert.rejects(() => new Promise((resolve, reject) => middleware.protectCustomerRoute(missing, {}, (error) => error ? reject(error) : resolve())), (error) => error.code === 'AUTHENTICATION_REQUIRED'); });
test('Role middleware rejects forbidden roles', async () => { const authorization = createAuthorizationMiddleware({ audit: { recordSafe: () => {} } }); const middleware = createAuthMiddleware({ authorization }); const requireAdmin = middleware.requireRole('admin'); await assert.rejects(() => new Promise((resolve, reject) => requireAdmin({ auth: { customerId: 'customer-test', role: 'customer' } }, {}, (error) => error ? reject(error) : resolve())), (error) => error.code === 'INVALID_ROLE_ACCESS'); });
test('Auth cookies are HTTP-only, signed, scoped, and never returned as body data', () => { const cookies = []; const response = { cookie: (name, value, options) => cookies.push({ name, value, options }) }; setAuthCookies(response, { accessToken: 'access-secret', refreshToken: 'refresh-secret' }); assert.equal(cookies.length, 2); assert.ok(cookies.every((cookie) => cookie.options.httpOnly && cookie.options.signed)); assert.equal(cookies.find((cookie) => cookie.name === 'lp_refresh').options.path, '/api/auth'); });
