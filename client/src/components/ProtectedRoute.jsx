import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectUser, selectReady } from '../features/auth/authSlice';

export function ProtectedRoute({ children, roles }) {
  const user = useSelector(selectUser);
  const ready = useSelector(selectReady);
  const location = useLocation();

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-700">Access denied</h2>
        <p className="mt-2 text-slate-500">Your role ({user.role}) cannot view this page.</p>
      </div>
    );
  }
  return children;
}

export default ProtectedRoute;
