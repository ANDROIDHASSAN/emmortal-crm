import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import {
  listBatteries,
  addBattery,
  getBatteryHistory,
  addRework,
  listReworks,
  getLoss,
  getAging,
  batterySchema,
  reworkSchema,
} from './rework.controller.js';

const router = Router();
const writeRoles = rbac('admin', 'manager', 'staff');

// Batteries
router.get('/batteries', requireAuth, listBatteries);
router.post('/batteries', requireAuth, writeRoles, validate({ body: batterySchema }), addBattery);
router.get('/batteries/:uniqueId', requireAuth, getBatteryHistory);

// Rework + reports
router.get('/rework/loss', requireAuth, getLoss);
router.get('/rework/aging', requireAuth, getAging);
router.get('/rework', requireAuth, listReworks);
router.post('/rework', requireAuth, writeRoles, validate({ body: reworkSchema }), addRework);

export default router;
