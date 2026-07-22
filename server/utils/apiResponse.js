export function ok(response, payload = {}, message = 'OK', status = 200) {
  response.status(status).json({ success: true, message, data: payload });
}

export function created(response, payload = {}, message = 'Created') {
  ok(response, payload, message, 201);
}

export function fail(response, message = 'Something went wrong.', status = 500, details = {}, code = 'INTERNAL_ERROR') {
  response.status(status).json({ success: false, error: message, code, details: details || {} });
}
