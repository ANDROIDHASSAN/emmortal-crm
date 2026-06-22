import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error middleware → consistent envelope { error: { code, message, details } }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL';
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose / Mongo specific mapping
  if (err.name === 'ValidationError') {
    status = 400; code = 'VALIDATION'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; code = 'BAD_ID'; message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = 'Duplicate key';
    details = err.keyValue;
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = { error: { code, message } };
  if (details) body.error.details = details;
  if (!env.isProd && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

export default errorHandler;
