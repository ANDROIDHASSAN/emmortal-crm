import mongoose from 'mongoose';

// Every manufactured battery gets a unique ID at birth: EMM-YYYY-#### — one ID
// tells its whole story (dispatch → return → rework → close).
const batterySchema = new mongoose.Schema(
  {
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
    status: { type: String, enum: ['dispatched', 'returned', 'in_rework', 'repaired', 'closed'], default: 'dispatched', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Battery = mongoose.models.Battery || mongoose.model('Battery', batterySchema);
export default Battery;
