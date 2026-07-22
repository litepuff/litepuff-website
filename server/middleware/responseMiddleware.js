export function responseEnvelope(request, response, next) {
  const send = response.json.bind(response);
  response.json = (body) => {
    if (!body || typeof body !== 'object' || typeof body.success !== 'boolean') return send(body);
    if (body.success) return send({ success: true, message: body.message || '', data: body.data ?? Object.fromEntries(Object.entries(body).filter(([key]) => !['success', 'message'].includes(key))) });
    return send({ success: false, error: body.error || body.message || 'Request failed.', code: body.code || defaultCode(response.statusCode), details: body.details ?? body.errors ?? {} });
  };
  next();
}
const defaultCode = (status) => ({ 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 410: 'EXPIRED', 422: 'VALIDATION_ERROR', 429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE' }[status] || 'INTERNAL_ERROR');
