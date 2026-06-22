import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
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
    source: { type: String, enum: ['website', 'manual', 'csv', 'reference'], default: 'manual', index: true },
    status: { type: String, enum: ['new', 'in_progress', 'won', 'lost'], default: 'new', index: true },
    value: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    boardOrder: { type: Number, default: 0 }, // Kanban sort within a column
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, boardOrder: 1 });
leadSchema.index({ createdAt: -1 });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
export default Lead;
