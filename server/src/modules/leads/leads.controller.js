import { z } from 'zod';
import { Lead } from '../../models/Lead.js';
import { ProductionJob } from '../../models/ProductionJob.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { createLeadFromEnquiry, changeStatus, board, importCsv, LEAD_STATUSES } from './leads.service.js';

const SOURCES = ['website', 'manual', 'csv', 'reference', 'whatsapp', 'phone'];

export const leadCreateSchema = z.object({
  name: z.string().min(1), phone: z.string().optional().default(''), email: z.string().optional().default(''),
  productInterest: z.string().optional().default(''), message: z.string().optional().default(''),
  qty: z.coerce.number().min(1).default(1), value: z.coerce.number().min(0).default(0), source: z.enum(SOURCES).default('manual'),
});
export const leadUpdateSchema = z.object({
  name: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), productInterest: z.string().optional(),
  message: z.string().optional(), qty: z.coerce.number().optional(), value: z.coerce.number().optional(),
  status: z.enum(LEAD_STATUSES).optional(), boardOrder: z.coerce.number().optional(), owner: z.string().optional(),
});

export const listLeads = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query);
  const filter = {};
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { productInterest: rx }]; }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  const [data, total] = await Promise.all([Lead.find(filter).populate('owner', 'name').sort(sort).skip(skip).limit(limit).lean(), Lead.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await createLeadFromEnquiry({ ...req.body });
  if (req.body.owner) { lead.owner = req.body.owner; await lead.save(); }
  res.status(201).json({ data: lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('Lead not found');
  const wasWon = lead.status === 'won';
  const { status, ...rest } = req.body;
  if (status) changeStatus(lead, status, req.user);
  Object.assign(lead, rest);
  await lead.save();

  // Cross-module loop: when a lead is first marked 'won', spawn a Production
  // Order (one job, today) carrying the customer + qty, linked back to the lead.
  let productionOrder = null;
  if (lead.status === 'won' && !wasWon) {
    const exists = await ProductionJob.findOne({ leadRef: lead._id });
    if (!exists) {
      productionOrder = await ProductionJob.create({
        productionDate: new Date(),
        title: lead.productInterest || `Order for ${lead.name}`,
        qty: lead.qty || 1,
        customer: lead.name,
        leadRef: lead._id,
        status: 'on',
        progress: 'pending',
        createdBy: req.user.id,
      });
    }
  }
  res.json({ data: lead, productionOrder });
});

export const getBoard = asyncHandler(async (req, res) => res.json({ data: await board() }));
export const csvImport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No CSV file uploaded');
  res.json({ data: await importCsv(req.file.buffer.toString('utf8')) });
});
