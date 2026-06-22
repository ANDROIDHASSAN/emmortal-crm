import { z } from 'zod';
import { Employee } from '../../models/Employee.js';
import { Attendance } from '../../models/Attendance.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';
import { syncEsslPunches, payroll } from './hr.service.js';

export const employeeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  designation: z.string().optional().default(''),
  monthlySalary: z.coerce.number().min(0).default(0),
  esslUserId: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
  joinedAt: z.string().optional(),
});

export const employeeUpdateSchema = employeeSchema.partial();

export const manualAttendanceSchema = z.object({
  employee: z.string().min(1),
  date: z.string().min(1),
  inTime: z.string().optional(),
  outTime: z.string().optional(),
});

export const listEmployees = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: 'name' });
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { code: rx }, { designation: rx }];
  }
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const [data, total] = await Promise.all([
    Employee.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Employee.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createEmployee = asyncHandler(async (req, res) => {
  const exists = await Employee.findOne({ code: req.body.code });
  if (exists) throw ApiError.conflict('Employee code already exists');
  const emp = await Employee.create(req.body);
  await writeAudit({ user: req.user, action: 'create', entity: 'Employee', entityId: emp._id, after: emp.toObject() });
  res.status(201).json({ data: emp });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.id);
  if (!emp) throw ApiError.notFound('Employee not found');
  Object.assign(emp, req.body);
  await emp.save();
  res.json({ data: emp });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-date' });
  const filter = {};
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const [data, total] = await Promise.all([
    Attendance.find(filter).populate('employee', 'name code').sort(sort).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const addManualAttendance = asyncHandler(async (req, res) => {
  const { employee, date, inTime, outTime } = req.body;
  const d = new Date(date);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const inT = inTime ? new Date(inTime) : undefined;
  const outT = outTime ? new Date(outTime) : undefined;
  const workedMinutes = inT && outT ? Math.max(0, Math.round((outT - inT) / 60000)) : 0;
  const rec = await Attendance.findOneAndUpdate(
    { employee, date: day },
    { $set: { employee, date: day, inTime: inT, outTime: outT, workedMinutes, source: 'manual' } },
    { upsert: true, new: true }
  );
  res.status(201).json({ data: rec });
});

export const esslSync = asyncHandler(async (req, res) => {
  const result = await syncEsslPunches({ fileBuffer: req.file?.buffer, fileName: req.file?.originalname });
  await writeAudit({ user: req.user, action: 'essl-sync', entity: 'Attendance', after: result });
  res.json({ data: result });
});

export const getPayroll = asyncHandler(async (req, res) => {
  res.json({ data: await payroll(req.query.month) });
});
