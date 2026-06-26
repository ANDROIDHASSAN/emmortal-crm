import { Item } from '../../models/Item.js';
import { StockMovement } from '../../models/StockMovement.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2 } from '../../utils/helpers.js';
import { notify } from '../notifications/notification.service.js';

// Apply a stock movement and atomically adjust qtyOnHand.
//  IN  → +qty | OUT → -qty | ADJUST → +signed | REJECT → records loss, no sellable change
export async function applyStockMovement({ itemId, type, qty, unitPriceAtTime, reference, supplierName, reason, occurredAt, createdBy }) {
  const item = await Item.findById(itemId);
  if (!item) throw ApiError.notFound('Item not found');
  const q = Number(qty);
  const price = unitPriceAtTime != null ? Number(unitPriceAtTime) : item.unitPrice;

  let signedQty = 0;
  if (type === 'IN') signedQty = q;
  else if (type === 'OUT') signedQty = -q;
  else if (type === 'ADJUST') signedQty = q; // q may be negative
  else if (type === 'REJECT') signedQty = 0; // failed inspection — not sellable stock

  if ((type === 'OUT') && item.qtyOnHand + signedQty < 0) {
    throw ApiError.badRequest(`Insufficient stock for ${item.name} (have ${item.qtyOnHand}, need ${q})`);
  }

  const movement = await StockMovement.create({
    item: item._id, type, qty: q, signedQty,
    unitPriceAtTime: price, value: round2(Math.abs(q) * price),
    reference: reference || '', supplierName: supplierName || '', reason: reason || '',
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(), createdBy,
  });

  if (signedQty !== 0) {
    item.qtyOnHand = round2(item.qtyOnHand + signedQty);
    await item.save();
    // Raise a low-stock notification when a movement drops to/below reorder level.
    if (signedQty < 0 && item.qtyOnHand <= item.reorderLevel) {
      await notify({ title: `Low stock: ${item.name}`, message: `${item.qtyOnHand} left (reorder at ${item.reorderLevel})`, level: 'warning', category: 'inventory', roles: ['admin', 'manager', 'staff'], entity: 'Item', entityId: item._id });
    }
  }
  return movement;
}

export async function inventorySummary() {
  const items = await Item.find({ active: true }).lean();
  const onHandValue = round2(items.reduce((s, i) => s + i.qtyOnHand * i.unitPrice, 0));
  const lowStockCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;
  const rejects = await StockMovement.aggregate([
    { $match: { type: 'REJECT' } },
    { $group: { _id: null, qty: { $sum: '$qty' }, value: { $sum: '$value' } } },
  ]);
  return { itemCount: items.length, onHandValue, lowStockCount, rejection: { qty: rejects[0]?.qty || 0, value: round2(rejects[0]?.value || 0) } };
}

export async function lowStockItems() {
  return Item.find({ active: true, $expr: { $lte: ['$qtyOnHand', '$reorderLevel'] } }).sort('name').lean();
}
