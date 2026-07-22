import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const translate = (error, kind) => {
  if (error.name === 'TokenExpiredError') return new AppError(`${kind} token has expired.`, { status: 401, code: `${kind.toUpperCase()}_TOKEN_EXPIRED` });
  return new AppError(`Invalid ${kind} token.`, { status: 401, code: `INVALID_${kind.toUpperCase()}_TOKEN` });
};

export class JwtService {
  constructor(config = env) { this.config = config; }
  payload(customerId, role, sessionId) { return { customerId, role, sessionId }; }
  signAccess({ customerId, role, sessionId }) { return jwt.sign(this.payload(customerId, role, sessionId), this.config.jwtSecret, { algorithm: 'HS256', expiresIn: `${this.config.accessTokenMinutes}m` }); }
  signRefresh({ customerId, role, sessionId }) { const iat = Date.now() / 1000; return jwt.sign({ ...this.payload(customerId, role, sessionId), iat, exp: iat + this.config.refreshTokenDays * 86_400 }, this.config.jwtRefreshSecret, { algorithm: 'HS256' }); }
  verifyAccess(token) { try { return jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'] }); } catch (error) { throw translate(error, 'access'); } }
  verifyRefresh(token) { try { return jwt.verify(token, this.config.jwtRefreshSecret, { algorithms: ['HS256'] }); } catch (error) { throw translate(error, 'refresh'); } }
}
export const jwtService = new JwtService();
