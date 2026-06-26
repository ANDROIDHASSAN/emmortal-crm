// Generic helpers shared across modules.

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Money: round to 2dp safely.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const sum2 = (arr) => round2(arr.reduce((a, b) => a + Number(b || 0), 0));

// Parse list query (?page&limit&sort&q) with sane bounds.
export function parseListQuery(query, { defaultSort = '-createdAt' } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 20));
  const sort = (query.sort || defaultSort).toString();
  const q = (query.q || '').toString().trim();
  return { page, limit, sort, q, skip: (page - 1) * limit };
}

export function listEnvelope(data, total, page, limit) {
  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) || 0 } };
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseDateRange(query, field) {
  if (!query.from && !query.to) return null;
  const r = {};
  if (query.from) r.$gte = new Date(query.from);
  if (query.to) r.$lte = new Date(query.to);
  return { [field]: r };
}
