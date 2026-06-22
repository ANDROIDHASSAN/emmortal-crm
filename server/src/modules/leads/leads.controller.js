import { z } from 'zod';
import { Lead } from '../../models/Lead.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';
import { createLeadFromEnquiry, changeStatus, board, importCsv } from './leads.service.js';

export const leadCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  productInterest: z.string().optional().default(''),
  message: z.string().optional().default(''),
  qty: z.coerce.number().min(1).default(1),
  value: z.coerce.number().min(0).default(0),
  source: z.enum(['website', 'manual', 'csv', 'reference']).default('manual'),
});

export const leadUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  productInterest: z.string().optional(),
  message: z.string().optional(),
  qty: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
  status: z.enum(['new', 'in_progress', 'won', 'lost']).optional(),
  boardOrder: z.coerce.number().optional(),
  owner: z.string().optional(),
});

export const listLeads = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query);
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { productInterest: rx }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  const [data, total] = await Promise.all([
    Lead.find(filter).populate('owner', 'name').sort(sort).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await createLeadFromEnquiry({ ...req.body });
  if (req.body.owner) {
    lead.owner = req.body.owner;
    await lead.save();
  }
  await writeAudit({ user: req.user, action: 'create', entity: 'Lead', entityId: lead._id, after: lead.toObject() });
  res.status(201).json({ data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('Lead not found');
  const { status, ...rest } = req.body;
  if (status) await changeStatus(lead, status, req.user);
  Object.assign(lead, rest);
  await lead.save();
  res.json({ data: lead });
});

export const getBoard = asyncHandler(async (req, res) => {
  res.json({ data: await board() });
});

export const csvImport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No CSV file uploaded');
  const result = await importCsv(req.file.buffer.toString('utf8'));
  await writeAudit({ user: req.user, action: 'import-csv', entity: 'Lead', after: result });
  res.json({ data: result });
});
