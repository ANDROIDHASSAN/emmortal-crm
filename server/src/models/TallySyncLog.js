import mongoose from 'mongoose';

const tallySyncLogSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['import', 'http'], required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    recordsIn: { type: Number, default: 0 },
    recordsUpserted: { type: Number, default: 0 },
    errors: { type: [String], default: [] },
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

export const TallySyncLog =
  mongoose.models.TallySyncLog || mongoose.model('TallySyncLog', tallySyncLogSchema);
export default TallySyncLog;
