import { Notification } from '../../models/Notification.js';

// Fire-and-forget notification creator other modules call. Never throws.
export async function notify({ title, message = '', level = 'info', category = 'system', roles = [], entity, entityId }) {
  try { return await Notification.create({ title, message, level, category, roles, entity, entityId: entityId ? String(entityId) : undefined }); }
  catch (e) { console.error('[notify] failed', e.message); return null; }
}

const visible = (user) => ({ $or: [{ roles: { $size: 0 } }, { roles: user.role }] });

export async function listForUser(user, { limit = 30 } = {}) {
  const docs = await Notification.find(visible(user)).sort('-createdAt').limit(limit).lean();
  return docs.map((n) => ({ ...n, read: (n.readBy || []).some((id) => String(id) === String(user.id)) }));
}
export const unreadCount = (user) => Notification.countDocuments({ ...visible(user), readBy: { $ne: user.id } });
export const markRead = (user, id) => Notification.updateOne({ _id: id }, { $addToSet: { readBy: user.id } });
export const markAllRead = (user) => Notification.updateMany({ ...visible(user), readBy: { $ne: user.id } }, { $addToSet: { readBy: user.id } });
