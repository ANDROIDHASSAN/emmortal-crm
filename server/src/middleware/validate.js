import { ApiError } from '../utils/ApiError.js';

// validate({ body, query, params }) — each is a zod schema. Parsed/validated values
// replace the originals (coercion + stripping). Throws 400 with field details on failure.
// Note: targets Express 4 where req.query / req.params are writable.
export const validate = (schemas) => (req, res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw ApiError.badRequest(`Invalid ${key}`, details);
      }
      req[key] = result.data;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export default validate;
