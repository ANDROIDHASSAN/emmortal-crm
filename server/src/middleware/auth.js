import { ApiError } from '../utils/ApiError.js';
import { verifyAccess, ACCESS_COOKIE } from '../utils/tokens.js';
import { User } from '../models/User.js';

// requireAuth — reads access token from httpOnly cookie (or Bearer header fallback),
// verifies it, and attaches req.user.
export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[ACCESS_COOKIE];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.active) throw ApiError.unauthorized('Account inactive');

    req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export default requireAuth;
