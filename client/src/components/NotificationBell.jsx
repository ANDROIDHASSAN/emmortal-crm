import { useState } from 'react';
import { useUnreadCountQuery, useListNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '../features/notifications/notificationsApi';
import { fmtDateTime } from '../lib/format';

const dot = { info: 'bg-blue-500', warning: 'bg-amber-500', critical: 'bg-red-500' };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: count } = useUnreadCountQuery(undefined, { pollingInterval: 30000 }); // poll every 30s
  const { data: list } = useListNotificationsQuery(undefined, { skip: !open });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();
  const unread = count?.data?.unread || 0;

  return (
    <div className="relative">
      <button className="relative rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <span className="text-lg">🔔</span>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <span className="text-sm font-semibold text-slate-700">Notifications</span>
              {unread > 0 && <button className="text-xs text-brand-600 hover:underline" onClick={() => markAllRead()}>Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(list?.data || []).length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>}
              {(list?.data || []).map((n) => (
                <button key={n._id} onClick={() => !n.read && markRead(n._id)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[n.level] || 'bg-slate-400'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-700">{n.title}</span>
                    {n.message && <span className="block truncate text-xs text-slate-500">{n.message}</span>}
                    <span className="block text-[11px] text-slate-400">{fmtDateTime(n.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
