import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../features/auth/authApi';
import { setUser, selectUser } from '../features/auth/authSlice';
import { apiError } from '../lib/format';

export default function Login() {
  const [email, setEmail] = useState('admin@emmortal.local');
  const [password, setPassword] = useState('Admin@123');
  const [err, setErr] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await login({ email, password }).unwrap(); dispatch(setUser(r.data)); navigate('/'); }
    catch (e2) { setErr(apiError(e2)); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-extrabold text-white">E</span>
            <span className="text-xl font-extrabold tracking-tight text-white">E-mmortal<span className="text-brand-400">.</span></span>
          </div>
          <div>
            <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight text-white">
              Run your battery operations from one clean dashboard.
            </h2>
            <p className="mt-4 max-w-md text-slate-400">
              Inventory, rework, production, accounting, HR and leads — unified, real-time, and built for your team.
            </p>
          </div>
          <p className="text-sm text-slate-500">© E-mmortal Operations CRM</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">E-mmortal<span className="text-brand-600">.</span></span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to the operations dashboard</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{err}</p>}
            <button className="btn-primary w-full py-3" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500 shadow-soft">
            <p className="mb-1.5 font-semibold text-slate-600">Seeded logins</p>
            <p>admin@emmortal.local / Admin@123</p>
            <p>manager@emmortal.local / Manager@123</p>
            <p>staff@emmortal.local / Staff@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
