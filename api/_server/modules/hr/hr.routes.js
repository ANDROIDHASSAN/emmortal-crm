import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { upload } from '../../middleware/upload.js';
import { listEmployees, createEmployee, updateEmployee, listAttendance, addManualAttendance, esslSync, esslPush, getPayroll, employeeSchema, employeeUpdateSchema, manualAttendanceSchema } from './hr.controller.js';

const router = Router();
const hr = rbac('admin', 'manager');

// Device push webhook — token-protected, NOT behind requireAuth (no user session).
router.post('/hr/essl-push', esslPush);

router.get('/employees', requireAuth, hr, listEmployees);
router.post('/employees', requireAuth, hr, validate({ body: employeeSchema }), createEmployee);
router.patch('/employees/:id', requireAuth, hr, validate({ body: employeeUpdateSchema }), updateEmployee);
router.get('/attendance', requireAuth, hr, listAttendance);
router.post('/attendance/manual', requireAuth, hr, validate({ body: manualAttendanceSchema }), addManualAttendance);
router.post('/hr/essl/sync', requireAuth, hr, upload.single('file'), esslSync);
router.get('/hr/payroll', requireAuth, hr, getPayroll);

export default router;
