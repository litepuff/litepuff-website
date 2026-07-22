const sensitiveKey = /secret|password|private.?key|token|authorization|cookie|otp.?id|session.?id|provider.?message.?id|email|phone|ip.?address/i;
const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => sensitiveKey.test(key) ? [key, '[REDACTED]'] : [key, redact(item)]));
};

function write(level, message, context = {}) {
  const entry = { timestamp: new Date().toISOString(), level, service: 'litepuff-api', message, ...redact(context) };
  const output = JSON.stringify(entry);
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.info)(output);
}

export const logger = Object.freeze({ info: (message, context) => write('info', message, context), warn: (message, context) => write('warn', message, context), error: (message, context) => write('error', message, context) });

export function requestLogger(request, response, next) {
  const started = performance.now();
  response.on('finish', () => logger.info('api.request', { requestId: request.id, method: request.method, path: request.originalUrl, status: response.statusCode, durationMs: Math.round(performance.now() - started) }));
  next();
}
