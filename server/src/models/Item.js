import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['cell', 'bms', 'casing', 'consumable', 'other'],
      default: 'other',
      index: true,
    },
    sku: { type: String, required: true, unique: true, trim: true, index: true },
    unit: { type: String, default: 'pcs' },
    unitPrice: { type: Number, default: 0, min: 0 },
    // qtyOnHand is derived/maintained by the StockMovement service. Never edit directly.
    qtyOnHand: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    supplierName: { type: String, default: '' },
    notes: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

itemSchema.virtual('lowStock').get(function () {
  return this.qtyOnHand <= this.reorderLevel;
});

itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
export default Item;
