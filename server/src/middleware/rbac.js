import { ApiError } from '../utils/ApiError.js';

// rbac('admin','manager') — allow only listed roles. admin always passes.
export const rbac = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
  return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
};

export default rbac;
