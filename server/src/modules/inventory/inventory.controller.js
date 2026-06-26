import { z } from 'zod';
import { Item } from '../../models/Item.js';
import { StockMovement } from '../../models/StockMovement.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { applyStockMovement, inventorySummary, lowStockItems } from './inventory.service.js';

export const itemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['cell', 'bms', 'casing', 'consumable', 'other']).default('other'),
  sku: z.string().optional().default(''),
  unit: z.string().optional().default('pcs'),
  unitPrice: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  supplierName: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});
export const itemUpdateSchema = itemSchema.partial().extend({ active: z.boolean().optional() });

export const movementSchema = z.object({
  item: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'REJECT', 'ADJUST']),
  qty: z.coerce.number(),
  unitPriceAtTime: z.coerce.number().optional(),
  reference: z.string().optional(),
  supplierName: z.string().optional(),
  reason: z.string().optional(),
  occurredAt: z.string().optional(),
});

export const listItems = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: 'name' });
  const filter = {};
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { sku: rx }, { supplierName: rx }]; }
  if (req.query.category) filter.category = req.query.category;
  const [data, total] = await Promise.all([
    Item.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    Item.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).lean();
  if (!item) throw ApiError.notFound('Item not found');
  res.json({ data: item });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await Item.create(req.body);
  res.status(201).json({ data: item });
});

export const updateItem = asyncHandler(async (req, res) => {
  const { qtyOnHand, ...rest } = req.body; // qtyOnHand is movement-driven only
  const item = await Item.findByIdAndUpdate(req.params.id, rest, { new: true });
  if (!item) throw ApiError.notFound('Item not found');
  res.json({ data: item });
});

export const lowStock = asyncHandler(async (req, res) => res.json({ data: await lowStockItems() }));
export const summary = asyncHandler(async (req, res) => res.json({ data: await inventorySummary() }));

export const createMovement = asyncHandler(async (req, res) => {
  const m = await applyStockMovement({ itemId: req.body.item, ...req.body, createdBy: req.user.id });
  res.status(201).json({ data: m });
});

export const listMovements = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-occurredAt' });
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.item) filter.item = req.query.item;
  const [data, total] = await Promise.all([
    StockMovement.find(filter).populate('item', 'name sku').sort(sort).skip(skip).limit(limit).lean(),
    StockMovement.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});
