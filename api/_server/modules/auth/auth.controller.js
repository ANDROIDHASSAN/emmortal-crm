import { z } from 'zod';
import { User, ROLES } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/helpers.js';
import { verifyPassword, createUser, hashPassword } from './auth.service.js';
import {
  signAccess, signRefresh, verifyRefresh, cookieOpts,
  ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_MAX_AGE, REFRESH_MAX_AGE,
} from '../../utils/tokens.js';

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const createUserSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6), role: z.enum(ROLES) });
export const updateUserSchema = z.object({ name: z.string().min(1).optional(), role: z.enum(ROLES).optional(), active: z.boolean().optional(), password: z.string().min(6).optional() });

function setAuthCookies(res, user) {
  res.cookie(ACCESS_COOKIE, signAccess(user), cookieOpts(ACCESS_MAX_AGE));
  res.cookie(REFRESH_COOKIE, signRefresh(user, user.tokenVersion || 0), cookieOpts(REFRESH_MAX_AGE));
}

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !user.active) throw ApiError.unauthorized('Invalid credentials');
  if (!(await verifyPassword(req.body.password, user.passwordHash))) throw ApiError.unauthorized('Invalid credentials');
  setAuthCookies(res, user);
  res.json({ data: user.toSafe() });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  let payload;
  try { payload = verifyRefresh(token); } catch { throw ApiError.unauthorized('Invalid refresh token'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw ApiError.unauthorized('Account inactive');
  if ((user.tokenVersion || 0) !== (payload.tv || 0)) throw ApiError.unauthorized('Refresh token revoked');
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  setAuthCookies(res, user);
  res.json({ data: user.toSafe() });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOpts(0));
  res.clearCookie(REFRESH_COOKIE, cookieOpts(0));
  res.json({ data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => res.json({ data: req.user }));

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort('name').lean();
  res.json({ data: users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, active: u.active })) });
});

export const addUser = asyncHandler(async (req, res) => {
  if (await User.findOne({ email: req.body.email.toLowerCase() })) throw ApiError.conflict('Email already in use');
  const user = await createUser(req.body);
  res.status(201).json({ data: user.toSafe() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const { name, role, active, password } = req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (password) { user.passwordHash = await hashPassword(password); user.tokenVersion = (user.tokenVersion || 0) + 1; }
  await user.save();
  res.json({ data: user.toSafe() });
});
