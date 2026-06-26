import mongoose from 'mongoose';

const tallySyncLogSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['import', 'http'], default: 'import' },
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
    recordsIn: { type: Number, default: 0 },
    recordsUpserted: { type: Number, default: 0 },
    errors: { type: [String], default: [] },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export const TallySyncLog = mongoose.models.TallySyncLog || mongoose.model('TallySyncLog', tallySyncLogSchema);
export default TallySyncLog;
