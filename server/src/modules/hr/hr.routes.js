import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { upload } from '../../middleware/upload.js';
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  listAttendance,
  addManualAttendance,
  esslSync,
  getPayroll,
  employeeSchema,
  employeeUpdateSchema,
  manualAttendanceSchema,
} from './hr.controller.js';

const router = Router();
// HR (employee master + attendance) → admin + manager. Payroll also admin/manager.
const hrRoles = rbac('admin', 'manager');

router.get('/employees', requireAuth, hrRoles, listEmployees);
router.post('/employees', requireAuth, hrRoles, validate({ body: employeeSchema }), createEmployee);
router.patch('/employees/:id', requireAuth, hrRoles, validate({ body: employeeUpdateSchema }), updateEmployee);

router.get('/attendance', requireAuth, hrRoles, listAttendance);
router.post('/attendance/manual', requireAuth, hrRoles, validate({ body: manualAttendanceSchema }), addManualAttendance);

router.post('/hr/essl/sync', requireAuth, hrRoles, upload.single('file'), esslSync);
router.get('/hr/payroll', requireAuth, hrRoles, getPayroll);

export default router;
