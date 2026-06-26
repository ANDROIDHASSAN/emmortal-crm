import mongoose from 'mongoose';

// Inventory ledger entry. IN raises qtyOnHand, OUT lowers it, REJECT records a
// failed-inspection loss (does NOT touch sellable stock), ADJUST is a signed fix.
const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    type: { type: String, enum: ['IN', 'OUT', 'REJECT', 'ADJUST'], required: true, index: true },
    qty: { type: Number, required: true },
    signedQty: { type: Number, default: 0 },
    unitPriceAtTime: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    reference: { type: String, default: '' }, // invoice no / production order / reason
    supplierName: { type: String, default: '' },
    reason: { type: String, default: '' },
    occurredAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
