import mongoose from 'mongoose';

// Mirror of Tally vouchers (+ manual entries). GST vs non-GST kept on each row.
const accountingEntrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['sales', 'purchase', 'expense'], required: true, index: true },
    gst: { type: Boolean, default: false, index: true },
    amount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    voucherNo: { type: String, default: '' },
    narration: { type: String, default: '' },
    occurredAt: { type: Date, default: Date.now, index: true },
    source: { type: String, enum: ['tally', 'manual'], default: 'manual' },
    tallyGuid: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export const AccountingEntry = mongoose.models.AccountingEntry || mongoose.model('AccountingEntry', accountingEntrySchema);
export default AccountingEntry;
