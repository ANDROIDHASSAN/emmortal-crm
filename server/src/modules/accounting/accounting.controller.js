import { z } from 'zod';
import Papa from 'papaparse';
import { AccountingEntry } from '../../models/AccountingEntry.js';
import { Party } from '../../models/Party.js';
import { TallySyncLog } from '../../models/TallySyncLog.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { entrySummary, partyLedger, runTallySync } from './accounting.service.js';

// Build the entries Mongo filter from query (shared by list + export).
function entryFilter(q) {
  const filter = {};
  if (q.kind) filter.kind = q.kind;
  if (q.gst !== undefined && q.gst !== '') filter.gst = q.gst === 'true';
  if (q.party) filter.party = q.party;
  if (q.from || q.to) { filter.occurredAt = {}; if (q.from) filter.occurredAt.$gte = new Date(q.from); if (q.to) filter.occurredAt.$lte = new Date(q.to); }
  return filter;
}

export const manualEntrySchema = z.object({
  kind: z.enum(['sales', 'purchase', 'expense']),
  gst: z.boolean().default(false),
  amount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  party: z.string().optional(),
  voucherNo: z.string().optional(),
  narration: z.string().optional(),
  occurredAt: z.string().optional(),
});
export const partySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['debtor', 'creditor', 'both']).default('both'),
  phone: z.string().optional(), email: z.string().optional(), gstin: z.string().optional(), address: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
});

export const listEntries = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-occurredAt' });
  const filter = entryFilter(req.query);
  const [data, total] = await Promise.all([
    AccountingEntry.find(filter).populate('party', 'name').sort(sort).skip(skip).limit(limit).lean(),
    AccountingEntry.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

// Export the currently-filtered entries to CSV.
export const exportEntries = asyncHandler(async (req, res) => {
  const rows = await AccountingEntry.find(entryFilter(req.query)).populate('party', 'name').sort('-occurredAt').limit(10000).lean();
  const csv = Papa.unparse(rows.map((e) => ({
    Date: new Date(e.occurredAt).toISOString().slice(0, 10), Kind: e.kind, GST: e.gst ? 'GST' : 'Non-GST',
    Amount: e.amount, Tax: e.taxAmount, Total: round2impl(e.amount + (e.taxAmount || 0)), Party: e.party?.name || '', Voucher: e.voucherNo || '', Source: e.source,
  })));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="accounting-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
const round2impl = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const createEntry = asyncHandler(async (req, res) => {
  const entry = await AccountingEntry.create({ ...req.body, source: 'manual', occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date() });
  res.status(201).json({ data: entry });
});

export const getSummary = asyncHandler(async (req, res) => res.json({ data: await entrySummary(req.query) }));

export const listParties = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: 'name' });
  const filter = {};
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  if (req.query.type) filter.type = req.query.type;
  const [data, total] = await Promise.all([Party.find(filter).sort(sort).skip(skip).limit(limit).lean(), Party.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createParty = asyncHandler(async (req, res) => res.status(201).json({ data: await Party.create(req.body) }));

export const getLedger = asyncHandler(async (req, res) => {
  const ledger = await partyLedger(req.params.id);
  if (!ledger) throw ApiError.notFound('Party not found');
  res.json({ data: ledger });
});

export const tallySync = asyncHandler(async (req, res) => res.json({ data: await runTallySync({ mode: req.query.mode || req.body?.mode, fileBuffer: req.file?.buffer, fileName: req.file?.originalname, from: req.query.from, to: req.query.to }) }));
export const tallyLogs = asyncHandler(async (req, res) => res.json({ data: await TallySyncLog.find().sort('-createdAt').limit(50).lean() }));
