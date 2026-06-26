import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, clearUser } from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';
import NotificationBell from './NotificationBell';
import Icon from './Icon';

const nav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/inventory', label: 'Inventory', icon: 'inventory' },
  { to: '/rework', label: 'Rework', icon: 'rework' },
  { to: '/accounting', label: 'Accounting', icon: 'accounting', roles: ['admin', 'manager'] },
  { to: '/production', label: 'Production', icon: 'production' },
  { to: '/hr', label: 'HR & Attendance', icon: 'hr', roles: ['admin', 'manager'] },
  { to: '/products', label: 'Website / Products', icon: 'products', roles: ['admin', 'manager'] },
  { to: '/leads', label: 'Leads', icon: 'leads' },
  { to: '/settings', label: 'Settings', icon: 'settings', roles: ['admin'] },
];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';
}

function SidebarContent({ items, user, doLogout, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base font-extrabold text-white shadow-sm">E</span>
        <span className="text-lg font-extrabold tracking-tight text-slate-900">E-mmortal<span className="text-brand-500">.</span></span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />}
                <Icon name={n.icon} className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">{initials(user?.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
            <p className="truncate text-xs capitalize text-slate-400">{user?.role}</p>
          </div>
          <button onClick={doLogout} title="Logout" className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const doLogout = async () => { try { await logout().unwrap(); } catch { /* ignore */ } dispatch(clearUser()); navigate('/login'); };
  const items = nav.filter((n) => !n.roles || n.roles.includes(user?.role));

  return (
    <div className="min-h-screen p-0 sm:p-3 lg:p-4">
      {/* Outer app frame */}
      <div className="flex min-h-screen overflow-hidden bg-white sm:min-h-[calc(100vh-1.5rem)] sm:rounded-3xl sm:border sm:border-slate-200/80 sm:shadow-card lg:min-h-[calc(100vh-2rem)]">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-100 md:block">
          <SidebarContent items={items} user={user} doLogout={doLogout} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 animate-fade-in bg-white shadow-pop">
              <SidebarContent items={items} user={user} doLogout={doLogout} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur-md md:px-6">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
            </button>

            <div className="relative hidden max-w-md flex-1 md:block">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100" />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">⌘F</kbd>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button className="icon-btn" aria-label="Messages"><Icon name="mail" className="h-5 w-5" /></button>
              <NotificationBell />
              <div className="ml-1 hidden items-center gap-2.5 sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">{initials(user?.name)}</span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden bg-slate-50/60 p-4 sm:p-6 md:p-8"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}

export default Layout;
