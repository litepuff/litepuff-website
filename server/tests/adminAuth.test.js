import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { adminLogin } from '../controllers/adminController.js';
import { protectAdminRoute } from '../middleware/authMiddleware.js';
import { adminSheetsService } from '../services/AdminSheetsService.js';

const original = {
  adminSpreadsheetId: env.adminSpreadsheetId,
  jwtSecret: env.jwtSecret,
  findAdminByEmail: adminSheetsService.findAdminByEmail,
  updateAdmin: adminSheetsService.updateAdmin,
  recordActivity: adminSheetsService.recordActivity
};
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
let adminRow;

test.before(async () => {
  env.adminSpreadsheetId = 'admin-sheet-test';
  env.jwtSecret = 'admin-auth-test-secret-that-is-long-enough';
  adminRow = {
    _row: 2,
    AdminID: 'admin-1',
    Name: 'LitePuff Owner',
    Email: 'admin@litepuff.test',
    PasswordHash: await bcrypt.hash('Correct-password-123', 4),
    Role: 'Owner',
    Status: 'Active'
  };
  adminSheetsService.findAdminByEmail = async (email) =>
    email === adminRow.Email ? adminRow : null;
  adminSheetsService.updateAdmin = async (row, changes) => ({ ...row, ...changes });
  adminSheetsService.recordActivity = async () => true;
});

test.after(() => {
  env.adminSpreadsheetId = original.adminSpreadsheetId;
  env.jwtSecret = original.jwtSecret;
  adminSheetsService.findAdminByEmail = original.findAdminByEmail;
  adminSheetsService.updateAdmin = original.updateAdmin;
  adminSheetsService.recordActivity = original.recordActivity;
});

test('valid admin credentials create a signed admin JWT', async () => {
  const res = response();
  await adminLogin({ id: 'request-1', headers: {}, body: { email: ' ADMIN@LITEPUFF.TEST ', password: 'Correct-password-123' } }, res);
  assert.equal(res.statusCode, 200);
  const payload = jwt.verify(res.body.data.token, env.jwtSecret, { algorithms: ['HS256'] });
  assert.equal(payload.role, 'admin');
  assert.equal(payload.adminRole, 'super_admin');
  assert.equal(payload.email, adminRow.Email);
  assert.equal(res.body.data.admin.PasswordHash, undefined);
});

test('Admin sheet role retains the existing admin permission tier', async () => {
  const role = adminRow.Role;
  adminRow.Role = 'Admin';
  const res = response();
  await adminLogin({ id: 'request-admin', headers: {}, body: { email: adminRow.Email, password: 'Correct-password-123' } }, res);
  assert.equal(res.body.data.admin.adminRole, 'admin');
  adminRow.Role = role;
});

test('inactive admins cannot sign in', async () => {
  const status = adminRow.Status;
  adminRow.Status = 'Inactive';
  await assert.rejects(
    () => adminLogin({ id: 'request-inactive', body: { email: adminRow.Email, password: 'Correct-password-123' } }, response()),
    (error) => error.status === 403 && error.code === 'ADMIN_INACTIVE'
  );
  adminRow.Status = status;
});

test('wrong email and wrong password return the same safe credential error', async () => {
  await assert.rejects(() => adminLogin({ id: 'request-2', body: { email: 'wrong@example.com', password: 'Correct-password-123' } }, response()), (error) => error.status === 401 && error.code === 'INVALID_ADMIN_CREDENTIALS');
  await assert.rejects(() => adminLogin({ id: 'request-3', body: { email: adminRow.Email, password: 'wrong-password' } }, response()), (error) => error.status === 401 && error.code === 'INVALID_ADMIN_CREDENTIALS');
});

test('missing admin configuration returns a service error instead of invalid credentials', async () => {
  const spreadsheetId = env.adminSpreadsheetId;
  env.adminSpreadsheetId = '';
  await assert.rejects(() => adminLogin({ id: 'request-4', body: { email: adminRow.Email, password: 'anything' } }, response()), (error) => error.status === 503 && error.code === 'ADMIN_AUTH_NOT_CONFIGURED');
  env.adminSpreadsheetId = spreadsheetId;
});

test('admin middleware accepts valid tokens and rejects expired tokens', () => {
  const valid = jwt.sign({ role: 'admin' }, env.jwtSecret, { algorithm: 'HS256', expiresIn: '1m' });
  const request = { id: 'request-5', headers: { authorization: `Bearer ${valid}` } };
  let passed = false;
  protectAdminRoute(request, response(), (error) => { assert.ifError(error); passed = true; });
  assert.equal(passed, true);
  const expired = jwt.sign({ role: 'admin' }, env.jwtSecret, { algorithm: 'HS256', expiresIn: -1 });
  protectAdminRoute({ id: 'request-6', headers: { authorization: `Bearer ${expired}` } }, response(), (error) => assert.equal(error.code, 'INVALID_ADMIN_TOKEN'));
});
