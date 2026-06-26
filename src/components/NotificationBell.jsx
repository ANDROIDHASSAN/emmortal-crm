import { useState } from 'react';
import { useUnreadCountQuery, useListNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from '../features/notifications/notificationsApi';
import { fmtDateTime } from '../lib/format';
import Icon from './Icon';

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
      <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 animate-fade-in overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              {unread > 0 && <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => markAllRead()}>Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {(list?.data || []).length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications</p>}
              {(list?.data || []).map((n) => (
                <button key={n._id} onClick={() => !n.read && markRead(n._id)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}>
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
