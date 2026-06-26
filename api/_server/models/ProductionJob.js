import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  { text: { type: String, required: true }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } },
  { _id: false }
);

// "A fresh tab every day" — jobs are grouped by productionDate.
const productionJobSchema = new mongoose.Schema(
  {
    productionDate: { type: Date, required: true, index: true },
    title: { type: String, default: '' },
    voltage: { type: Number, default: 0 },
    ah: { type: Number, default: 0 },
    qty: { type: Number, default: 1 },
    status: { type: String, enum: ['on', 'off'], default: 'on' },
    progress: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending', index: true },
    comments: { type: [commentSchema], default: [] },
    customer: { type: String, default: '' },                                   // name (may originate from a lead)
    leadRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },            // set when spawned from a won lead
    batteries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Battery' }],     // generated when job completes
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productionJobSchema.statics.dayBounds = function dayBounds(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

export const ProductionJob = mongoose.models.ProductionJob || mongoose.model('ProductionJob', productionJobSchema);
export default ProductionJob;
