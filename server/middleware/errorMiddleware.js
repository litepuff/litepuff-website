import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { fail } from '../utils/apiResponse.js';

export function notFoundHandler(request, response) { fail(response, 'API endpoint not found.', 404, { path: request.originalUrl }, 'NOT_FOUND'); }
export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);
  const status = Number(error.status || error.statusCode || (error.name === 'MulterError' ? 400 : 500));
  const googleError = /Google Sheet|Google Sheets|spreadsheet|worksheet/i.test(error.message || '');
  const code = error.code || (googleError ? 'GOOGLE_SHEETS_ERROR' : status === 422 ? 'VALIDATION_ERROR' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR');
  const isGoogleFailure = String(code).startsWith('GOOGLE_');
  logger.error('api.error', { requestId: request.id, method: request.method, path: request.originalUrl, status, code, error: error.message, details: error.details, stack: isGoogleFailure || env.nodeEnv === 'development' ? error.stack : undefined });
  const message = status >= 500 && env.nodeEnv === 'production' && !error.expose && !isGoogleFailure ? 'Something went wrong.' : error.message || 'Something went wrong.';
  fail(response, message, status, error.details || {}, code);
}
