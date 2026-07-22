import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { adminLogin } from '../controllers/adminController.js';
import { protectAdminRoute } from '../middleware/authMiddleware.js';

const original = { adminEmail: env.adminEmail, adminPasswordHash: env.adminPasswordHash, jwtSecret: env.jwtSecret };
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test.before(async () => {
  env.adminEmail = 'admin@litepuff.test';
  env.adminPasswordHash = await bcrypt.hash('Correct-password-123', 4);
  env.jwtSecret = 'admin-auth-test-secret-that-is-long-enough';
});

test.after(() => Object.assign(env, original));

test('valid admin credentials create a signed admin JWT', async () => {
  const res = response();
  await adminLogin({ id: 'request-1', body: { email: ' ADMIN@LITEPUFF.TEST ', password: 'Correct-password-123' } }, res);
  assert.equal(res.statusCode, 200);
  const payload = jwt.verify(res.body.data.token, env.jwtSecret, { algorithms: ['HS256'] });
  assert.equal(payload.role, 'admin');
  assert.equal(payload.email, env.adminEmail);
});

test('wrong email and wrong password return the same safe credential error', async () => {
  await assert.rejects(() => adminLogin({ id: 'request-2', body: { email: 'wrong@example.com', password: 'Correct-password-123' } }, response()), (error) => error.status === 401 && error.code === 'INVALID_ADMIN_CREDENTIALS');
  await assert.rejects(() => adminLogin({ id: 'request-3', body: { email: env.adminEmail, password: 'wrong-password' } }, response()), (error) => error.status === 401 && error.code === 'INVALID_ADMIN_CREDENTIALS');
});

test('missing admin configuration returns a service error instead of invalid credentials', async () => {
  const hash = env.adminPasswordHash;
  env.adminPasswordHash = '';
  await assert.rejects(() => adminLogin({ id: 'request-4', body: { email: env.adminEmail, password: 'anything' } }, response()), (error) => error.status === 503 && error.code === 'ADMIN_AUTH_NOT_CONFIGURED');
  env.adminPasswordHash = hash;
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
