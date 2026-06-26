import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { listBatteries, addBattery, getBatteryHistory, addRework, listReworks, getLoss, getAging, batterySchema, reworkSchema } from './rework.controller.js';

const router = Router();
const write = rbac('admin', 'manager', 'staff');

router.get('/batteries', requireAuth, listBatteries);
router.post('/batteries', requireAuth, write, validate({ body: batterySchema }), addBattery);
router.get('/batteries/:uniqueId', requireAuth, getBatteryHistory);
router.get('/rework/loss', requireAuth, getLoss);
router.get('/rework/aging', requireAuth, getAging);
router.get('/rework', requireAuth, listReworks);
router.post('/rework', requireAuth, write, validate({ body: reworkSchema }), addRework);

export default router;
