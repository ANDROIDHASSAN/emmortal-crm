import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff', index: true },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 }, // bumped to invalidate refresh tokens
  },
  { timestamps: true }
);

userSchema.methods.toSafe = function toSafe() {
  return { id: this._id, name: this.name, email: this.email, role: this.role, active: this.active };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
