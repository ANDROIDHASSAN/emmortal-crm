import { z } from 'zod';
import { Employee } from '../../models/Employee.js';
import { Attendance } from '../../models/Attendance.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { env } from '../../config/env.js';
import { parsePushPayload } from '../../integrations/essl.adapter.js';
import { syncEsslPunches, ingestPunches, payroll } from './hr.service.js';

export const employeeSchema = z.object({
  code: z.string().min(1), name: z.string().min(1), designation: z.string().optional().default(''), department: z.string().optional().default(''),
  monthlySalary: z.coerce.number().min(0).default(0), esslUserId: z.string().optional().default(''), phone: z.string().optional().default(''), active: z.boolean().optional().default(true),
});
export const employeeUpdateSchema = employeeSchema.partial();
export const manualAttendanceSchema = z.object({ employee: z.string().min(1), date: z.string().min(1), inTime: z.string().optional(), outTime: z.string().optional() });

export const listEmployees = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: 'name' });
  const filter = {};
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { code: rx }, { designation: rx }]; }
  const [data, total] = await Promise.all([Employee.find(filter).sort(sort).skip(skip).limit(limit).lean(), Employee.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createEmployee = asyncHandler(async (req, res) => {
  if (await Employee.findOne({ code: req.body.code })) throw ApiError.conflict('Employee code already exists');
  res.status(201).json({ data: await Employee.create(req.body) });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!emp) throw ApiError.notFound('Employee not found');
  res.json({ data: emp });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-date' });
  const filter = {};
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.from || req.query.to) { filter.date = {}; if (req.query.from) filter.date.$gte = new Date(req.query.from); if (req.query.to) filter.date.$lte = new Date(req.query.to); }
  const [data, total] = await Promise.all([Attendance.find(filter).populate('employee', 'name code').sort(sort).skip(skip).limit(limit).lean(), Attendance.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const addManualAttendance = asyncHandler(async (req, res) => {
  const { employee, date, inTime, outTime } = req.body;
  const d = new Date(date); const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const inT = inTime ? new Date(inTime) : undefined, outT = outTime ? new Date(outTime) : undefined;
  const workedMinutes = inT && outT ? Math.max(0, Math.round((outT - inT) / 60000)) : 0;
  const rec = await Attendance.findOneAndUpdate({ employee, date: day }, { $set: { employee, date: day, inTime: inT, outTime: outT, workedMinutes, source: 'manual' } }, { upsert: true, new: true });
  res.status(201).json({ data: rec });
});

export const esslSync = asyncHandler(async (req, res) => res.json({ data: await syncEsslPunches({ fileBuffer: req.file?.buffer, fileName: req.file?.originalname }) }));
export const getPayroll = asyncHandler(async (req, res) => res.json({ data: await payroll(req.query.month) }));

// Real-time push from the eSSL device (Push SDK). Auth via shared token header
// (x-essl-token) so the device — not a logged-in user — can post punches.
export const esslPush = asyncHandler(async (req, res) => {
  if (env.ESSL_PUSH_TOKEN && req.headers['x-essl-token'] !== env.ESSL_PUSH_TOKEN) throw ApiError.unauthorized('Invalid eSSL token');
  const punches = parsePushPayload(req.body);
  const result = await ingestPunches(punches);
  res.json({ data: result });
});
