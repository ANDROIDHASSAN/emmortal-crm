import { ApiError } from '../utils/ApiError.js';

// validate({ body, query, params }) — parse/coerce with zod, 400 on failure.
export const validate = (schemas) => (req, res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) {
        const parsed = schemas[key].parse(req[key]);
        if (key === 'query') Object.assign(req.query, parsed);
        else req[key] = parsed;
      }
    }
    next();
  } catch (err) {
    const details = err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message }));
    next(ApiError.badRequest('Validation failed', details));
  }
};

export default validate;
