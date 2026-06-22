import { z } from 'zod';
import { Battery } from '../../models/Battery.js';
import { Rework } from '../../models/Rework.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';
import {
  createBattery,
  createRework,
  batteryHistory,
  lossReport,
  agingReport,
} from './rework.service.js';

export const batterySchema = z.object({
  uniqueId: z.string().optional(),
  spec: z
    .object({
      cell: z.string().optional(),
      bms: z.string().optional(),
      sizeMm: z.string().optional(),
      voltage: z.coerce.number().optional(),
      ah: z.coerce.number().optional(),
      qty: z.coerce.number().optional(),
    })
    .optional(),
  customer: z.string().optional(),
  dispatchDate: z.string().optional(),
  status: z.enum(['dispatched', 'returned', 'in_rework', 'repaired', 'closed']).optional(),
  productionJob: z.string().optional(),
});

export const reworkSchema = z.object({
  battery: z.string().min(1),
  returnDate: z.string().min(1),
  repairedDate: z.string().optional(),
  replacedParts: z
    .array(
      z.object({
        item: z.string().min(1),
        qty: z.coerce.number().min(0),
        priceAtTime: z.coerce.number().min(0).optional(),
      })
    )
    .default([]),
  notes: z.string().optional(),
});

export const listBatteries = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query);
  const filter = {};
  if (q) filter.uniqueId = new RegExp(escapeRegex(q), 'i');
  if (req.query.status) filter.status = req.query.status;
  const [data, total] = await Promise.all([
    Battery.find(filter).populate('customer', 'name').sort(sort).skip(skip).limit(limit).lean(),
    Battery.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const addBattery = asyncHandler(async (req, res) => {
  const battery = await createBattery(req.body, req.user);
  await writeAudit({ user: req.user, action: 'create', entity: 'Battery', entityId: battery._id, after: battery.toObject() });
  res.status(201).json({ data: battery });
});

export const getBatteryHistory = asyncHandler(async (req, res) => {
  res.json({ data: await batteryHistory(req.params.uniqueId) });
});

export const addRework = asyncHandler(async (req, res) => {
  const rework = await createRework(req.body, req.user);
  await writeAudit({ user: req.user, action: 'create', entity: 'Rework', entityId: rework._id, after: rework.toObject() });
  res.status(201).json({ data: rework });
});

export const listReworks = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-returnDate' });
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.returnDate = {};
    if (req.query.from) filter.returnDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.returnDate.$lte = new Date(req.query.to);
  }
  const [data, total] = await Promise.all([
    Rework.find(filter).populate('battery', 'uniqueId status').populate('replacedParts.item', 'name sku').sort(sort).skip(skip).limit(limit).lean(),
    Rework.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const getLoss = asyncHandler(async (req, res) => {
  res.json({ data: await lossReport({ from: req.query.from, to: req.query.to, period: req.query.period }) });
});

export const getAging = asyncHandler(async (req, res) => {
  res.json({ data: await agingReport({ from: req.query.from, to: req.query.to }) });
});
