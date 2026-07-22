import { env } from '../config/env.js';
import { AUTH_COOKIE_NAMES } from '../config/auth.js';

const base = () => ({ httpOnly: true, secure: env.nodeEnv === 'production', sameSite: env.nodeEnv === 'production' ? 'strict' : 'lax', signed: true });
export function setAuthCookies(response, tokens) {
  response.cookie(AUTH_COOKIE_NAMES.ACCESS, tokens.accessToken, { ...base(), path: '/', maxAge: env.accessTokenMinutes * 60_000 });
  response.cookie(AUTH_COOKIE_NAMES.REFRESH, tokens.refreshToken, { ...base(), path: '/api/auth', maxAge: env.refreshTokenDays * 86_400_000 });
}
export function clearAuthCookies(response) {
  response.clearCookie(AUTH_COOKIE_NAMES.ACCESS, { ...base(), path: '/' });
  response.clearCookie(AUTH_COOKIE_NAMES.REFRESH, { ...base(), path: '/api/auth' });
}
export const accessTokenFrom = (request) => request.signedCookies?.[AUTH_COOKIE_NAMES.ACCESS] || (request.get('authorization')?.startsWith('Bearer ') ? request.get('authorization').slice(7) : '');
export const refreshTokenFrom = (request) => request.signedCookies?.[AUTH_COOKIE_NAMES.REFRESH] || '';
