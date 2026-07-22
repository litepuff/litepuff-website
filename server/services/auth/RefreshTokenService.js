import crypto from 'crypto';
import { jwtService } from './JwtService.js';
import { env } from '../../config/env.js';

export class RefreshTokenService {
  constructor({ jwt = jwtService, pepper = env.cookieSecret } = {}) { this.jwt = jwt; this.pepper = pepper; }
  generate(identity) { const token = this.jwt.signRefresh(identity); return { token, hash: this.hash(token), payload: this.jwt.verifyRefresh(token) }; }
  verify(token) { return this.jwt.verifyRefresh(token); }
  hash(token) { return crypto.createHash('sha256').update(`${this.pepper}:${token}`).digest('hex'); }
  matches(token, expectedHash) { const actual = Buffer.from(this.hash(token)); const expected = Buffer.from(String(expectedHash || '')); return actual.length === expected.length && crypto.timingSafeEqual(actual, expected); }
}
export const refreshTokenService = new RefreshTokenService();
