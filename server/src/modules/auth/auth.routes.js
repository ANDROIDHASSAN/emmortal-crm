import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { login, refresh, logout, me, listUsers, addUser, updateUser, loginSchema, createUserSchema, updateUserSchema } from './auth.controller.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true });

router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/users', requireAuth, rbac('admin'), listUsers);
router.post('/users', requireAuth, rbac('admin'), validate({ body: createUserSchema }), addUser);
router.patch('/users/:id', requireAuth, rbac('admin'), validate({ body: updateUserSchema }), updateUser);

export default router;
