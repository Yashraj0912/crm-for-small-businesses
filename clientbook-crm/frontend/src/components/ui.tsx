import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { cx, initials } from '../lib/utils';
import type { Tone } from '../lib/meta';

export const inputCls =
  'w-full h-10 md:h-8 rounded-md border border-ink-300 bg-white px-2.5 text-[16px] md:text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-ink-50';
export const textareaCls =
  'w-full min-h-[84px] rounded-md border border-ink-300 bg-white px-2.5 py-2 text-[16px] md:text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent';

// ---------- Toasts
const ToastCtx = createContext<(m: string, kind?: 'ok' | 'error') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; m: string; kind: string }[]>([]);
  const push = useCallback((m: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((a) => [...a, { id, m, kind }]);
    setTimeout(() => setItems((a) => a.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[60] bottom-20 md:bottom-6 inset-x-0 md:inset-x-auto md:right-6 px-4 flex flex-col items-center md:items-end gap-2 pointer-events-none" role="status">
        {items.map((t) => (
          <div key={t.id} className={cx('rounded-md px-3 py-2 text-sm shadow-lg text-white', t.kind === 'error' ? 'bg-red-700' : 'bg-ink-900')}>{t.m}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Basics
const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-white border border-ink-300 text-ink-800 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100',
  danger: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
};
export function Button({ variant = 'secondary', loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} className={cx('inline-flex items-center justify-center gap-1.5 h-10 md:h-8 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap', variants[variant], className)}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

const tones: Record<Tone, string> = {
  gray: 'bg-ink-100 text-ink-600', green: 'bg-accent-soft text-accent', amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700', sky: 'bg-sky-50 text-sky-800',
};
export const Badge = ({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone])}>{children}</span>
);

export const Avatar = ({ name, size = 24 }: { name: string; size?: number }) => (
  <span style={{ width: size, height: size, fontSize: size * 0.42 }} className="inline-grid place-items-center rounded-full bg-ink-200 text-ink-700 font-medium shrink-0" title={name}>{initials(name)}</span>
);

export const Loader = () => (
  <div className="py-16 grid place-items-center text-ink-400"><Loader2 className="animate-spin" size={20} /></div>
);
export const ErrorBox = ({ message }: { message: string }) => (
  <div className="border border-red-200 bg-red-50 text-red-800 rounded-md p-3 text-sm" role="alert">{message}</div>
);

export function Async<T>({ q, children }: { q: { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined }; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <Loader />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (!q.data) return null;
  return <>{children(q.data)}</>;
}

export function Empty({ icon: Icon, title, text, action }: { icon: typeof X; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-ink-300 rounded-md py-12 px-4 text-center bg-white">
      <Icon className="mx-auto text-ink-400" size={20} />
      <p className="mt-3 font-medium text-ink-900">{title}</p>
      {text && <p className="text-ink-500 mt-1">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 mb-5">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-ink-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Panel = ({ title, link, children, className }: { title: string; link?: { to: string; label: string }; children: ReactNode; className?: string }) => (
  <section className={cx('bg-white border border-ink-200 rounded-md', className)}>
    <header className="flex items-center justify-between px-4 h-10 border-b border-ink-200">
      <h2 className="text-sm font-semibold">{title}</h2>
      {link && <Link to={link.to} className="text-xs text-accent hover:underline">{link.label}</Link>}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

// ---------- Modal + form
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('bg-white w-full max-h-[92dvh] flex flex-col rounded-t-lg md:rounded-lg border border-ink-200 shadow-xl', wide ? 'md:max-w-2xl' : 'md:max-w-lg')}>
        <header className="flex items-center justify-between px-4 h-12 border-b border-ink-200 shrink-0">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-ink-500 hover:text-ink-900" aria-label="Close"><X size={16} /></button>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export interface FieldDef {
  name: string; label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'tags';
  options?: { value: string | number; label: string }[];
  required?: boolean; numeric?: boolean; bool?: boolean; full?: boolean; placeholder?: string; hint?: string;
}

export function FormModal({ title, fields, initial, onSubmit, onClose, onDelete, submitLabel = 'Save changes' }: {
  title: string; fields: FieldDef[]; initial?: Record<string, any>; submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<unknown>; onClose: () => void; onDelete?: () => Promise<unknown>;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => {
      const v = initial?.[f.name];
      return [f.name, v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v)];
    })));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const out: Record<string, any> = {};
    for (const f of fields) {
      const v = (vals[f.name] ?? '').trim();
      if (f.type === 'tags') out[f.name] = v ? v.split(',').map((t) => t.trim()).filter(Boolean) : [];
      else if (v === '') out[f.name] = null;
      else if (f.type === 'number' || f.numeric) out[f.name] = Number(v);
      else if (f.bool) out[f.name] = v === 'true';
      else out[f.name] = v;
    }
    run(() => onSubmit(out));
  };

  return (
    <Modal title={title} onClose={onClose} wide={fields.length > 6}>
      <form onSubmit={submit}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => {
            const common = { id: `f-${f.name}`, value: vals[f.name], required: f.required, placeholder: f.placeholder, onChange: (e: any) => setVals((s) => ({ ...s, [f.name]: e.target.value })) };
            return (
              <div key={f.name} className={cx(f.full || f.type === 'textarea' ? 'sm:col-span-2' : '')}>
                <label htmlFor={common.id} className="block text-xs font-medium text-ink-600 mb-1">{f.label}{f.required && <span className="text-red-600"> *</span>}</label>
                {f.type === 'textarea' ? <textarea {...common} className={textareaCls} />
                  : f.type === 'select' ? (
                    <select {...common} className={inputCls}>
                      {!f.required && <option value="">—</option>}
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : <input {...common} type={f.type === 'tags' ? 'text' : f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} min={f.type === 'number' ? 0 : undefined} className={inputCls} autoComplete="off" />}
                {f.hint && <p className="text-xs text-ink-500 mt-1">{f.hint}</p>}
              </div>
            );
          })}
        </div>
        {err && <div className="px-4 pb-3"><ErrorBox message={err} /></div>}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-200 bg-ink-50 sticky bottom-0">
          {onDelete && (
            <Button type="button" variant="danger" disabled={busy} onClick={() => (confirmDel ? run(onDelete) : setConfirmDel(true))}>
              {confirmDel ? 'Confirm delete' : 'Delete'}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>{submitLabel}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Table (desktop) / stacked list (mobile)
export interface Col<T> { header: string; cell: (r: T) => ReactNode; primary?: boolean; hideMobile?: boolean }
export function DataTable<T extends { id: number }>({ rows, cols, onRowClick, actions }: { rows: T[]; cols: Col<T>[]; onRowClick?: (r: T) => void; actions?: (r: T) => ReactNode }) {
  const primary = cols.find((c) => c.primary) || cols[0];
  const rest = cols.filter((c) => c !== primary && !c.hideMobile);
  return (
    <>
      <div className="hidden md:block border border-ink-200 rounded-md bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-xs text-ink-500">
              {cols.map((c) => <th key={c.header} className="text-left font-medium px-3 py-2">{c.header}</th>)}
              {actions && <th className="w-px" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={cx('border-b border-ink-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-ink-50')}>
                {cols.map((c) => <td key={c.header} className="px-3 py-2.5 align-middle">{c.cell(r)}</td>)}
                {actions && <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden border border-ink-200 rounded-md bg-white divide-y divide-ink-100">
        {rows.map((r) => (
          <li key={r.id} className="p-3" onClick={() => onRowClick?.(r)}>
            <div>{primary.cell(r)}</div>
            <dl className="mt-1.5 space-y-0.5">
              {rest.map((c) => (
                <div key={c.header} className="flex gap-2 text-xs"><dt className="text-ink-500 w-16 shrink-0">{c.header}</dt><dd className="min-w-0 text-ink-700">{c.cell(r)}</dd></div>
              ))}
            </dl>
            {actions && <div className="mt-2" onClick={(e) => e.stopPropagation()}>{actions(r)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-ink-500">
      <span>{from}–{to} of {total}</span>
      <div className="flex gap-1">
        <Button className="!px-2" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></Button>
        <Button className="!px-2" disabled={to >= total} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></Button>
      </div>
    </div>
  );
}
