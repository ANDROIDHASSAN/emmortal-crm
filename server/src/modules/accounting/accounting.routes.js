import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { upload } from '../../middleware/upload.js';
import { listEntries, exportEntries, getSummary, createEntry, listParties, createParty, getLedger, tallySync, tallyLogs, manualEntrySchema, partySchema } from './accounting.controller.js';

const router = Router();
const acct = rbac('admin', 'manager');

router.get('/entries', requireAuth, acct, listEntries);
router.get('/entries/export', requireAuth, acct, exportEntries);
router.post('/entries', requireAuth, acct, validate({ body: manualEntrySchema }), createEntry);
router.get('/summary', requireAuth, acct, getSummary);
router.get('/parties', requireAuth, acct, listParties);
router.post('/parties', requireAuth, acct, validate({ body: partySchema }), createParty);
router.get('/parties/:id/ledger', requireAuth, acct, getLedger);
router.post('/tally/sync', requireAuth, acct, upload.single('file'), tallySync);
router.get('/tally/logs', requireAuth, acct, tallyLogs);

export default router;
