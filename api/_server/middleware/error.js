import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  if (req.path.startsWith('/api')) return next(ApiError.notFound('Route not found'));
  return res.status(404).send('Not found');
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: { code: err.code || 'INTERNAL', message: err.message || 'Server error', details: err.details } });
};
