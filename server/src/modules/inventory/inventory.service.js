import { Item } from '../../models/Item.js';
import { StockMovement } from '../../models/StockMovement.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2 } from '../../utils/helpers.js';

/**
 * Apply a stock movement and maintain Item.qtyOnHand.
 * Rules:
 *  - IN     → qtyOnHand += qty
 *  - OUT    → qtyOnHand -= qty (blocked if it would go negative)
 *  - REJECT → does NOT change sellable stock; recorded as a failed-purchase loss
 *  - ADJUST → signed correction (signedQty may be negative); can go to/below zero
 */
export async function applyStockMovement({ itemId, type, qty, signedQty, unitPriceAtTime, reference, supplierName, reason, occurredAt, createdBy }) {
  const item = await Item.findById(itemId);
  if (!item) throw ApiError.notFound('Item not found');

  const price = unitPriceAtTime != null ? Number(unitPriceAtTime) : item.unitPrice;
  let delta = 0;
  let storedSigned = 0;

  if (type === 'IN') {
    delta = qty;
  } else if (type === 'OUT') {
    if (item.qtyOnHand - qty < 0) {
      throw ApiError.badRequest(`Insufficient stock for ${item.name}: on hand ${item.qtyOnHand}, requested ${qty}. Use ADJUST to correct.`);
    }
    delta = -qty;
  } else if (type === 'REJECT') {
    delta = 0; // rejected components never enter sellable stock
  } else if (type === 'ADJUST') {
    storedSigned = signedQty != null ? Number(signedQty) : qty;
    delta = storedSigned;
  }

  const movement = await StockMovement.create({
    item: item._id,
    type,
    qty: Math.abs(type === 'ADJUST' ? storedSigned : qty),
    signedQty: type === 'ADJUST' ? storedSigned : 0,
    unitPriceAtTime: price,
    value: round2(Math.abs(type === 'ADJUST' ? storedSigned : qty) * price),
    reference: reference || '',
    supplierName: supplierName || '',
    reason: reason || '',
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    createdBy,
  });

  if (delta !== 0) {
    item.qtyOnHand = item.qtyOnHand + delta;
    await item.save();
  }

  return { movement, item };
}

// Aggregate inventory summary: on-hand value, counts, rejection totals.
export async function inventorySummary() {
  const items = await Item.find({ active: true }).lean();
  const onHandValue = round2(items.reduce((s, i) => s + i.qtyOnHand * i.unitPrice, 0));
  const lowStockCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;

  const rejectAgg = await StockMovement.aggregate([
    { $match: { type: 'REJECT' } },
    { $group: { _id: null, qty: { $sum: '$qty' }, value: { $sum: '$value' } } },
  ]);
  const rejection = rejectAgg[0] || { qty: 0, value: 0 };

  return {
    itemCount: items.length,
    onHandValue,
    lowStockCount,
    rejection: { qty: rejection.qty || 0, value: round2(rejection.value || 0) },
  };
}
