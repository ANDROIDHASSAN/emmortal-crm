import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { upload } from '../../middleware/upload.js';
import { listLeads, createLead, updateLead, getBoard, csvImport, leadCreateSchema, leadUpdateSchema } from './leads.controller.js';

const router = Router();
const write = rbac('admin', 'manager', 'staff');

router.get('/board', requireAuth, getBoard);
router.get('/', requireAuth, listLeads);
router.post('/', requireAuth, write, validate({ body: leadCreateSchema }), createLead);
router.post('/import-csv', requireAuth, write, upload.single('file'), csvImport);
router.patch('/:id', requireAuth, write, validate({ body: leadUpdateSchema }), updateLead);

export default router;
