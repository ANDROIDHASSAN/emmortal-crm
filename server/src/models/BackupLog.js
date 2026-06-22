import mongoose from 'mongoose';

const backupLogSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    fileName: { type: String },
    sizeBytes: { type: Number, default: 0 },
    collections: { type: Number, default: 0 },
    documents: { type: Number, default: 0 },
    emailedTo: { type: String },
    status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
    error: { type: String },
  },
  { timestamps: true }
);

export const BackupLog = mongoose.models.BackupLog || mongoose.model('BackupLog', backupLogSchema);
export default BackupLog;
