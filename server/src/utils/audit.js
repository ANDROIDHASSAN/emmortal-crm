import { AuditLog } from '../models/AuditLog.js';

// Fire-and-forget audit writer for sensitive operations. Never throws into the request path.
export async function writeAudit({ user, action, entity, entityId, before, after }) {
  try {
    await AuditLog.create({
      user: user?.id || user,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      before,
      after,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write log', err.message);
  }
}

export default writeAudit;
