import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccess(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, name: user.name, email: user.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TTL }
  );
}

export function signRefresh(user, tokenVersion = 0) {
  return jwt.sign(
    { sub: String(user._id), tv: tokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TTL }
  );
}

export function verifyAccess(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Cookie options for access/refresh tokens.
export function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: maxAgeMs,
    path: '/',
  };
}

export const ACCESS_COOKIE = 'emm_at';
export const REFRESH_COOKIE = 'emm_rt';
export const ACCESS_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
