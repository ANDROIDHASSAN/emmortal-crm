import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, clearUser } from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/rework', label: 'Rework', icon: '🔧' },
  { to: '/production', label: 'Production', icon: '🏭' },
  { to: '/accounting', label: 'Accounting', icon: '💰', roles: ['admin', 'manager'] },
  { to: '/hr', label: 'HR', icon: '👥', roles: ['admin', 'manager'] },
  { to: '/leads', label: 'Leads', icon: '🎯' },
  { to: '/products', label: 'Website / Products', icon: '🛒' },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
];

export function Layout() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const doLogout = async () => {
    try { await logout().unwrap(); } catch { /* ignore */ }
    dispatch(clearUser());
    navigate('/login');
  };

  const items = nav.filter((n) => !n.roles || n.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="text-lg font-extrabold text-slate-800">E-mmortal<span className="text-brand-600">.</span></span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="px-2 pb-2">
            <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
            <p className="text-xs capitalize text-slate-400">{user?.role}</p>
          </div>
          <button className="btn-ghost w-full" onClick={doLogout}>Logout</button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:hidden">
          <span className="font-extrabold text-slate-800">E-mmortal<span className="text-brand-600">.</span></span>
          <button className="btn-ghost px-3 py-1" onClick={doLogout}>Logout</button>
        </header>
        <main className="flex-1 overflow-x-hidden p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
