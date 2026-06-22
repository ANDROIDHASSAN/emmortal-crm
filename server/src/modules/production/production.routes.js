import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { dayBoard, listJobs, createJob, updateJob, jobSchema, jobUpdateSchema } from './production.controller.js';

const router = Router();
const writeRoles = rbac('admin', 'manager', 'staff');

router.get('/day/:date', requireAuth, dayBoard);
router.get('/', requireAuth, listJobs);
router.post('/', requireAuth, writeRoles, validate({ body: jobSchema }), createJob);
router.patch('/:id', requireAuth, writeRoles, validate({ body: jobUpdateSchema }), updateJob);

export default router;
