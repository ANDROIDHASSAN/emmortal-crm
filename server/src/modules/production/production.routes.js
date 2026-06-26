import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { dayBoard, listJobs, createJob, updateJob, jobSchema, jobUpdateSchema } from './production.controller.js';

const router = Router();
const write = rbac('admin', 'manager', 'staff');

router.get('/day/:date', requireAuth, dayBoard);
router.get('/', requireAuth, listJobs);
router.post('/', requireAuth, write, validate({ body: jobSchema }), createJob);
router.patch('/:id', requireAuth, write, validate({ body: jobUpdateSchema }), updateJob);

export default router;
