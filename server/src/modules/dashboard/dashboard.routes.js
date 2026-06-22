import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { dashboardSummary, charts } from './dashboard.controller.js';

const router = Router();

router.get('/summary', requireAuth, dashboardSummary);
router.get('/charts', requireAuth, charts);

export default router;
