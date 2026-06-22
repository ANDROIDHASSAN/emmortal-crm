// Generic helpers shared across modules.

// asyncHandler wraps an async express handler so thrown errors reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Money: store rupees as Numbers but always round to 2dp for any stored/returned total.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Sum a list of numbers with 2dp safety.
export const sum2 = (arr) => round2(arr.reduce((a, b) => a + Number(b || 0), 0));

// Parse list query params (?page&limit&sort&q) with sane bounds.
export function parseListQuery(query, { defaultSort = '-createdAt' } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 20));
  const sort = (query.sort || defaultSort).toString();
  const q = (query.q || '').toString().trim();
  return { page, limit, sort, q, skip: (page - 1) * limit };
}

// Build the standard list response envelope.
export function listEnvelope(data, total, page, limit) {
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) || 0 } };
}

// Escape a string for safe use inside a RegExp (prevents ReDoS-ish & injection via $q).
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parse a date range from query (?from&to) supporting full ISO datetimes.
export function parseDateRange(query) {
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) range.$lte = new Date(query.to);
  return Object.keys(range).length ? range : null;
}
