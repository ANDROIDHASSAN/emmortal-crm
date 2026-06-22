import { ApiError } from '../utils/ApiError.js';

// rbac('admin','manager') — allow only listed roles. Use after requireAuth.
export const rbac = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
  }
  next();
};

export default rbac;
