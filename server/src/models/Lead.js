import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  { from: String, to: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    productInterest: { type: String, default: '' },
    message: { type: String, default: '' },
    qty: { type: Number, default: 1 },
    value: { type: Number, default: 0 },
    source: { type: String, enum: ['website', 'manual', 'csv', 'reference', 'whatsapp', 'phone'], default: 'manual', index: true },
    status: { type: String, enum: ['new', 'contacted', 'quotation', 'negotiation', 'won', 'lost'], default: 'new', index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    boardOrder: { type: Number, default: 0 },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, boardOrder: 1 });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
export default Lead;
