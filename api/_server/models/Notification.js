import mongoose from 'mongoose';

// In-app notification, targeted by role (empty = everyone). Per-user read state
// via readBy so one broadcast serves many recipients.
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, default: '' },
    level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    category: { type: String, enum: ['inventory', 'lead', 'production', 'rework', 'system'], default: 'system' },
    roles: [{ type: String }],
    entity: { type: String },
    entityId: { type: String },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
