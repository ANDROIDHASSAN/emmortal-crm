import { z } from 'zod';
import { Item } from '../../models/Item.js';
import { StockMovement } from '../../models/StockMovement.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex, parseDateRange } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';
import { applyStockMovement, inventorySummary } from './inventory.service.js';
import { getLowStockItems } from '../../jobs/lowStock.job.js';

export const itemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['cell', 'bms', 'casing', 'consumable', 'other']).default('other'),
  sku: z.string().min(1),
  unit: z.string().default('pcs'),
  unitPrice: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  supplierName: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
});

export const itemUpdateSchema = itemSchema.partial();

export const movementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'REJECT', 'ADJUST']),
  qty: z.coerce.number().min(0).default(0),
  signedQty: z.coerce.number().optional(),
  unitPriceAtTime: z.coerce.number().min(0).optional(),
  reference: z.string().optional(),
  supplierName: z.string().optional(),
  reason: z.string().optional(),
  occurredAt: z.string().optional(),
});

export const listItems = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query);
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { supplierName: rx }];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const [data, total] = await Promise.all([
    Item.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    Item.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).lean({ virtuals: true });
  if (!item) throw ApiError.notFound('Item not found');
  res.json({ data: item });
});

export const createItem = asyncHandler(async (req, res) => {
  const exists = await Item.findOne({ sku: req.body.sku });
  if (exists) throw ApiError.conflict('SKU already exists');
  const item = await Item.create(req.body);
  await writeAudit({ user: req.user, action: 'create', entity: 'Item', entityId: item._id, after: item.toObject() });
  res.status(201).json({ data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw ApiError.notFound('Item not found');
  const before = item.toObject();
  // qtyOnHand is never set directly here — only through stock movements.
  delete req.body.qtyOnHand;
  Object.assign(item, req.body);
  await item.save();
  await writeAudit({ user: req.user, action: 'update', entity: 'Item', entityId: item._id, before, after: item.toObject() });
  res.json({ data: item });
});

export const lowStock = asyncHandler(async (req, res) => {
  const data = await getLowStockItems();
  res.json({ data });
});

export const summary = asyncHandler(async (req, res) => {
  res.json({ data: await inventorySummary() });
});

export const createMovement = asyncHandler(async (req, res) => {
  const { movement, item } = await applyStockMovement({ ...req.body, createdBy: req.user.id });
  await writeAudit({ user: req.user, action: 'stock-movement', entity: 'StockMovement', entityId: movement._id, after: movement.toObject() });
  res.status(201).json({ data: { movement, item } });
});

export const listMovements = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-occurredAt' });
  const filter = {};
  if (req.query.item) filter.item = req.query.item;
  if (req.query.type) filter.type = req.query.type;
  const range = parseDateRange(req.query);
  if (range) filter.occurredAt = range;
  const [data, total] = await Promise.all([
    StockMovement.find(filter).populate('item', 'name sku unit').sort(sort).skip(skip).limit(limit).lean(),
    StockMovement.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});
