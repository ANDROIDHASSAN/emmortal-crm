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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-cyan-700 p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold text-slate-800">E-mmortal<span className="text-brand-600">.</span> CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to the operations dashboard</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {err && <p className="text-sm font-medium text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Seeded logins:</p>
          <p>admin@emmortal.local / Admin@123</p>
          <p>manager@emmortal.local / Manager@123</p>
          <p>staff@emmortal.local / Staff@123</p>
        </div>
      </div>
    </div>
  );
}
