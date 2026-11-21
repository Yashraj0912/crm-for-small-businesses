import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, ErrorBox, inputCls } from '../components/ui';

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ org_name: '', name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register(f);
      nav('/', { replace: true });
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const field = (k: keyof typeof f, label: string, type = 'text', extra = {}) => (
    <div>
      <label htmlFor={k} className="block text-xs font-medium text-ink-600 mb-1">{label}</label>
      <input id={k} type={type} required value={f[k]} onChange={set(k)} className={inputCls} {...extra} />
    </div>
  );

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded bg-accent text-white text-sm font-semibold grid place-items-center">C</span>
          <span className="font-semibold text-lg">Clientbook</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold">{mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}</h1>
        <p className="text-ink-500 mt-1">{mode === 'login' ? 'Use the email your administrator added.' : 'You will be the administrator and can invite your team afterwards.'}</p>
        <form onSubmit={submit} className="mt-5 bg-white border border-ink-200 rounded-lg p-5 space-y-3">
          {mode === 'register' && <>{field('org_name', 'Business name', 'text', { maxLength: 200 })}{field('name', 'Your name', 'text', { autoComplete: 'name' })}</>}
          {field('email', 'Email', 'email', { autoComplete: 'email' })}
          {field('password', 'Password', 'password', { minLength: mode === 'register' ? 8 : undefined, maxLength: 72, autoComplete: mode === 'login' ? 'current-password' : 'new-password' })}
          {mode === 'register' && <p className="text-xs text-ink-500">At least 8 characters.</p>}
          {err && <ErrorBox message={err} />}
          <Button type="submit" variant="primary" loading={busy} className="w-full">{mode === 'login' ? 'Sign in' : 'Create workspace'}</Button>
        </form>
        <button className="mt-4 text-sm text-accent hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'New business? Create a workspace' : 'Already have a workspace? Sign in'}
        </button>
      </div>
    </div>
  );
}
