import { z } from 'zod';
import { AccountingEntry } from '../../models/AccountingEntry.js';
import { Party } from '../../models/Party.js';
import { TallySyncLog } from '../../models/TallySyncLog.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';
import { runTallySync, entrySummary, partyLedger } from './accounting.service.js';

export const manualEntrySchema = z.object({
  kind: z.enum(['sales', 'purchase', 'expense']),
  gst: z.coerce.boolean().default(false),
  amount: z.coerce.number(),
  taxAmount: z.coerce.number().default(0),
  party: z.string().optional(),
  voucherNo: z.string().optional(),
  narration: z.string().optional(),
  occurredAt: z.string().min(1),
});

export const partySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['debtor', 'creditor', 'both']).default('both'),
  phone: z.string().optional(),
  email: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
});

// Time-machine list: ?kind&gst&from&to&partyId with full datetime range.
export const listEntries = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-occurredAt' });
  const filter = {};
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.gst !== undefined) filter.gst = req.query.gst === 'true';
  if (req.query.partyId) filter.party = req.query.partyId;
  if (req.query.from || req.query.to) {
    filter.occurredAt = {};
    if (req.query.from) filter.occurredAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.occurredAt.$lte = new Date(req.query.to);
  }
  const [data, total] = await Promise.all([
    AccountingEntry.find(filter).populate('party', 'name type').sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    AccountingEntry.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const getSummary = asyncHandler(async (req, res) => {
  const gst = req.query.gst === undefined ? undefined : req.query.gst === 'true';
  res.json({ data: await entrySummary({ from: req.query.from, to: req.query.to, gst }) });
});

export const createEntry = asyncHandler(async (req, res) => {
  const entry = await AccountingEntry.create({
    ...req.body,
    occurredAt: new Date(req.body.occurredAt),
    source: 'manual',
  });
  await writeAudit({ user: req.user, action: 'create', entity: 'AccountingEntry', entityId: entry._id, after: entry.toObject() });
  res.status(201).json({ data: entry });
});

export const listParties = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: 'name' });
  const filter = {};
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  if (req.query.type) filter.type = req.query.type;
  const [data, total] = await Promise.all([
    Party.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Party.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createParty = asyncHandler(async (req, res) => {
  const party = await Party.create(req.body);
  res.status(201).json({ data: party });
});

export const getLedger = asyncHandler(async (req, res) => {
  const data = await partyLedger(req.params.id);
  if (!data) throw ApiError.notFound('Party not found');
  res.json({ data });
});

export const tallySync = asyncHandler(async (req, res) => {
  const mode = req.body?.mode || req.query.mode;
  const file = req.file;
  const log = await runTallySync({
    mode,
    fileBuffer: file?.buffer,
    fileName: file?.originalname,
    from: req.body?.from,
    to: req.body?.to,
  });
  await writeAudit({ user: req.user, action: 'tally-sync', entity: 'TallySyncLog', entityId: log._id, after: log });
  res.json({ data: log });
});

export const tallyLogs = asyncHandler(async (req, res) => {
  const data = await TallySyncLog.find().sort('-createdAt').limit(50).lean();
  res.json({ data });
});
