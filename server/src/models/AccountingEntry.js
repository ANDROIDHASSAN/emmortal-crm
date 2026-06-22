import mongoose from 'mongoose';

const accountingEntrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['sales', 'purchase', 'expense'], required: true, index: true },
    gst: { type: Boolean, default: false, index: true },
    amount: { type: Number, required: true }, // base amount (excl tax)
    taxAmount: { type: Number, default: 0 },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', index: true },
    voucherNo: { type: String, default: '' },
    narration: { type: String, default: '' },
    occurredAt: { type: Date, required: true, index: true }, // Date + time for the time-machine
    source: { type: String, enum: ['tally', 'manual'], default: 'manual' },
    tallyGuid: { type: String, index: true, unique: true, sparse: true }, // idempotent upsert key
  },
  { timestamps: true }
);

// Compound index powering the time-machine filters.
accountingEntrySchema.index({ kind: 1, gst: 1, occurredAt: -1 });

accountingEntrySchema.virtual('total').get(function () {
  return Math.round((this.amount + (this.taxAmount || 0)) * 100) / 100;
});
accountingEntrySchema.set('toJSON', { virtuals: true });
accountingEntrySchema.set('toObject', { virtuals: true });

export const AccountingEntry =
  mongoose.models.AccountingEntry || mongoose.model('AccountingEntry', accountingEntrySchema);
export default AccountingEntry;
