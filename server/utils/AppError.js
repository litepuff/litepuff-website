export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details = {} } = {}) {
    super(message); this.name = 'AppError'; this.status = status; this.code = code; this.details = details;
  }
}

export const notFound = (entity = 'Resource') => new AppError(`${entity} not found.`, { status: 404, code: 'NOT_FOUND' });
export const validationError = (message, details = {}) => new AppError(message, { status: 422, code: 'VALIDATION_ERROR', details });
