import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import sanitizeHtml from 'sanitize-html';
import { AppError } from '../utils/AppError.js';

function sanitize(value) {
  if (typeof value === 'string') return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => { if (key.startsWith('$') || key.includes('.')) throw new AppError('Unsafe request key detected.', { status: 422, code: 'UNSAFE_INPUT' }); return [key, sanitize(item)]; }));
  return value;
}

export const securityStack = [
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        connectSrc: ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        imgSrc: ["'self'", 'data:', 'https://*.razorpay.com'],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"]
      }
    }
  }),
  compression(),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }),
  (request, response, next) => {
    response.removeHeader('X-Powered-By');
    next();
  },
  (request, response, next) => {
    if (request.body) request.body = sanitize(request.body);
    if (request.query) request.query = sanitize(request.query);
    next();
  }
];

export function csrfArchitectureGuard(request, response, next) { const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method); const usesAuthCookie = Boolean(request.signedCookies?.lp_access || request.signedCookies?.lp_refresh); const origin = request.get('origin'); if (unsafe && usesAuthCookie && origin && ![process.env.FRONTEND_URL, process.env.APP_URL].filter(Boolean).includes(origin)) return next(new AppError('Request origin is not allowed.', { status: 403, code: 'CSRF_ORIGIN_REJECTED' })); next(); }

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, handler: (request, response) => response.status(429).json({ success: false, error: 'Too many attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED', details: {} }) });
export const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, handler: (request, response) => response.status(429).json({ success: false, error: 'Webhook rate limit exceeded.', code: 'RATE_LIMIT_EXCEEDED', details: {} }) });
