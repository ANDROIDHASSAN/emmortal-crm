import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: '' },
    monthlySalary: { type: Number, default: 0, min: 0 },
    esslUserId: { type: String, default: '', index: true }, // biometric device user id
    phone: { type: String, default: '' },
    active: { type: Boolean, default: true },
    joinedAt: { type: Date },
  },
  { timestamps: true }
);

export const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
export default Employee;
