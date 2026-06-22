import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true }, // normalized to day start
    inTime: { type: Date },
    outTime: { type: Date },
    workedMinutes: { type: Number, default: 0 },
    source: { type: String, enum: ['essl', 'manual'], default: 'manual' },
  },
  { timestamps: true }
);

// One attendance row per employee per day — makes eSSL import idempotent.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance =
  mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export default Attendance;
