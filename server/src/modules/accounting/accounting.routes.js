import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { upload } from '../../middleware/upload.js';
import {
  listEntries,
  getSummary,
  createEntry,
  listParties,
  createParty,
  getLedger,
  tallySync,
  tallyLogs,
  manualEntrySchema,
  partySchema,
} from './accounting.controller.js';

const router = Router();
// Accounting is restricted to admin + manager (per RBAC matrix).
const acctRoles = rbac('admin', 'manager');

router.get('/entries', requireAuth, acctRoles, listEntries);
router.post('/entries', requireAuth, acctRoles, validate({ body: manualEntrySchema }), createEntry);
router.get('/summary', requireAuth, acctRoles, getSummary);

router.get('/parties', requireAuth, acctRoles, listParties);
router.post('/parties', requireAuth, acctRoles, validate({ body: partySchema }), createParty);
router.get('/parties/:id/ledger', requireAuth, acctRoles, getLedger);

router.post('/tally/sync', requireAuth, acctRoles, upload.single('file'), tallySync);
router.get('/tally/logs', requireAuth, acctRoles, tallyLogs);

export default router;
