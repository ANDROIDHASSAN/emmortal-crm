import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/helpers.js';
import { listForUser, unreadCount, markRead, markAllRead } from './notification.service.js';

const router = Router();
router.get('/', requireAuth, asyncHandler(async (req, res) => res.json({ data: await listForUser(req.user, { limit: Number(req.query.limit) || 30 }) })));
router.get('/unread-count', requireAuth, asyncHandler(async (req, res) => res.json({ data: { unread: await unreadCount(req.user) } })));
router.post('/read-all', requireAuth, asyncHandler(async (req, res) => { await markAllRead(req.user); res.json({ data: { ok: true } }); }));
router.post('/:id/read', requireAuth, asyncHandler(async (req, res) => { await markRead(req.user, req.params.id); res.json({ data: { ok: true } }); }));

export default router;
