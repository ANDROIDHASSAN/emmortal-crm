import mongoose from 'mongoose';

const batterySchema = new mongoose.Schema(
  {
    // Human-readable unique ID assigned at birth, e.g. EMM-2026-0001
    uniqueId: { type: String, required: true, unique: true, index: true },
    spec: {
      cell: { type: String, default: '' },
      bms: { type: String, default: '' },
      sizeMm: { type: String, default: '' },
      voltage: { type: Number, default: 0 },
      ah: { type: Number, default: 0 },
      qty: { type: Number, default: 1 },
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    dispatchDate: { type: Date },
    status: {
      type: String,
      enum: ['dispatched', 'returned', 'in_rework', 'repaired', 'closed'],
      default: 'dispatched',
      index: true,
    },
    productionJob: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionJob' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Battery = mongoose.models.Battery || mongoose.model('Battery', batterySchema);
export default Battery;
