import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Contact, LayoutDashboard, ListChecks, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, TrendingUp, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import type { Dashboard, User } from '../lib/types';
import { cx, fmtDate, isOverdue } from '../lib/utils';
import { Avatar, Modal } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Contact },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/deals', label: 'Pipeline', icon: TrendingUp },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/team', label: 'Team', icon: Users },
];
const TABS = ['/', '/customers', '/deals', '/tasks'];

function Popover({ trigger, children, width = 'w-72' }: { trigger: ReactNode; children: (close: () => void) => ReactNode; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && <div className={cx('absolute right-0 top-full mt-1 max-w-[calc(100vw-1.5rem)] bg-white border border-ink-200 rounded-md shadow-lg z-40', width)}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export default function Layout() {
  const { user, logout, updateUser } = useAuth();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('clientbook_nav') === '1');
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState('');
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard'), staleTime: 60_000 });
  const alerts = (dash.data?.stats.overdue_tasks ?? 0) + (dash.data?.stats.due_today ?? 0);

  const toggle = () => setCollapsed((c) => { localStorage.setItem('clientbook_nav', c ? '0' : '1'); return !c; });
  const onSearch = (e: FormEvent) => { e.preventDefault(); nav(`/customers${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`); };
  const org = user?.org_name || 'Clientbook';

  return (
    <div className="h-dvh flex">
      <aside className={cx('hidden md:flex flex-col shrink-0 border-r border-ink-200 bg-white transition-[width] duration-150', collapsed ? 'w-14' : 'w-56')}>
        <div className="h-12 flex items-center gap-2 px-3 border-b border-ink-200">
          <span className="h-6 w-6 rounded bg-accent text-white text-xs font-semibold grid place-items-center shrink-0">{org[0]?.toUpperCase()}</span>
          {!collapsed && <span className="font-semibold truncate">{org}</span>}
        </div>
        <nav className="flex-1 p-2 space-y-0.5" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => cx('flex items-center gap-2.5 h-8 px-2.5 rounded-md text-sm', isActive ? 'bg-ink-100 text-ink-900 font-medium' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900')}>
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <button onClick={toggle} className="m-2 h-8 px-2.5 flex items-center gap-2.5 rounded-md text-ink-500 hover:bg-ink-50 text-sm" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.75} /> : <><PanelLeftClose size={16} strokeWidth={1.75} />Collapse</>}
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 border-b border-ink-200 bg-white flex items-center gap-2 px-3 md:px-4">
          <form onSubmit={onSearch} className="relative flex-1 max-w-md" role="search">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers" aria-label="Search customers"
              className="w-full h-9 md:h-8 pl-8 pr-2 rounded-md bg-ink-50 border border-ink-200 text-[16px] md:text-sm placeholder:text-ink-400 focus:outline-none focus:border-accent focus:bg-white" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Popover width="w-80" trigger={
              <button className="relative h-9 w-9 md:h-8 md:w-8 grid place-items-center rounded-md text-ink-600 hover:bg-ink-100" aria-label={`Notifications${alerts ? `, ${alerts} due` : ''}`}>
                <Bell size={16} strokeWidth={1.75} />
                {alerts > 0 && <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-600 text-white text-[9px] leading-[14px] text-center">{alerts}</span>}
              </button>}>
              {(close) => (
                <div>
                  <div className="px-3 py-2 border-b border-ink-100 text-sm font-semibold">Tasks needing attention</div>
                  {dash.data?.upcoming_tasks.length ? (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-ink-100">
                      {dash.data.upcoming_tasks.map((t) => (
                        <li key={t.id}><Link to="/tasks" onClick={close} className="block px-3 py-2 hover:bg-ink-50">
                          <div className="truncate">{t.title}</div>
                          <div className={cx('text-xs', isOverdue(t.due_date) ? 'text-red-700' : 'text-ink-500')}>{t.due_date ? `${isOverdue(t.due_date) ? 'Overdue · ' : 'Due '}${fmtDate(t.due_date)}` : 'No due date'}</div>
                        </Link></li>
                      ))}
                    </ul>
                  ) : <p className="px-3 py-6 text-center text-ink-500">You are all caught up.</p>}
                </div>
              )}
            </Popover>
            <Popover width="w-60" trigger={<button className="h-9 md:h-8 px-1 grid place-items-center rounded-md hover:bg-ink-100" aria-label="Account menu"><Avatar name={user?.name || '?'} size={26} /></button>}>
              {() => (
                <div>
                  <div className="px-3 py-2.5 border-b border-ink-100">
                    <div className="font-medium truncate">{user?.name}</div>
                    <div className="text-xs text-ink-500 truncate">{user?.email}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{user?.role === 'admin' ? 'Administrator' : 'Team member'}</div>
                  </div>
                  <label className="flex items-center gap-2 px-3 py-2 border-b border-ink-100 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-[#1f6f5c]" checked={user?.notify_email !== false}
                      onChange={async (e) => { try { updateUser(await api.patch<User>('/auth/me', { notify_email: e.target.checked })); } catch { /* keep current setting */ } }} />
                    Email me about assignments
                  </label>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-ink-50"><LogOut size={14} strokeWidth={1.75} />Sign out</button>
                </div>
              )}
            </Popover>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-7 pb-24 md:pb-10"><Outlet /></div>
        </main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-ink-200 grid grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
          {NAV.filter((n) => TABS.includes(n.to)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('h-14 flex flex-col items-center justify-center gap-0.5 text-[11px]', isActive ? 'text-accent font-medium' : 'text-ink-500')}>
              <Icon size={18} strokeWidth={1.75} />{label}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className="h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-500"><Menu size={18} strokeWidth={1.75} />More</button>
        </nav>
      </div>

      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <ul className="p-2">
            {NAV.filter((n) => !TABS.includes(n.to)).map(({ to, label, icon: Icon }) => (
              <li key={to}><Link to={to} onClick={() => setMore(false)} className="flex items-center gap-3 h-11 px-3 rounded-md hover:bg-ink-50"><Icon size={18} strokeWidth={1.75} />{label}</Link></li>
            ))}
            <li><button onClick={logout} className="w-full flex items-center gap-3 h-11 px-3 rounded-md hover:bg-ink-50 text-left"><LogOut size={18} strokeWidth={1.75} />Sign out</button></li>
          </ul>
        </Modal>
      )}
    </div>
  );
}
