import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'emm_at';
export const REFRESH_COOKIE = 'emm_rt';
export const ACCESS_MAX_AGE = 15 * 60 * 1000;          // 15m
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7d

export const signAccess = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role, name: user.name, email: user.email }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TTL });

export const signRefresh = (user, tv = 0) =>
  jwt.sign({ sub: String(user._id), tv }, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TTL });

export const verifyAccess = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

// In production the frontend (Vercel) and backend (Render) are on different
// domains, so the auth cookie is cross-site → it MUST be SameSite=None + Secure
// (both require HTTPS, which Render/Vercel provide). Locally we use Lax.
export const cookieOpts = (maxAge) => ({
  httpOnly: true,
  sameSite: env.isProd ? 'none' : 'lax',
  secure: env.isProd,
  maxAge,
  path: '/',
});
