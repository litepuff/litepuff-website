import { validationResult } from 'express-validator';

export function validate(request, response, next) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) return response.status(422).json({ success: false, error: 'Validation failed.', code: 'VALIDATION_ERROR', details: { fields: errors.array() } });
  next();
}
