import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/helpers.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { runBackup } from '../../jobs/backup.job.js';
import { BackupLog } from '../../models/BackupLog.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Liveness + DB connectivity check
 *     security: []
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  })
);

router.post(
  '/backup/run',
  requireAuth,
  rbac('admin'),
  asyncHandler(async (req, res) => {
    const log = await runBackup({ triggeredBy: req.user });
    res.json({ data: log });
  })
);

router.get(
  '/backup/logs',
  requireAuth,
  rbac('admin'),
  asyncHandler(async (req, res) => {
    const data = await BackupLog.find().sort('-createdAt').limit(50).lean();
    res.json({ data });
  })
);

export default router;
