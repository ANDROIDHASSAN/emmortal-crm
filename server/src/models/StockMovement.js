import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    type: { type: String, enum: ['IN', 'OUT', 'REJECT', 'ADJUST'], required: true, index: true },
    // qty is always > 0; ADJUST uses `signedQty` for direction.
    qty: { type: Number, required: true, min: 0 },
    signedQty: { type: Number, default: 0 }, // for ADJUST: the actual signed delta applied
    unitPriceAtTime: { type: Number, default: 0, min: 0 },
    value: { type: Number, default: 0 }, // qty * unitPriceAtTime (rounded)
    reference: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    reason: { type: String, default: '' },
    occurredAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ item: 1, occurredAt: -1 });

export const StockMovement =
  mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
