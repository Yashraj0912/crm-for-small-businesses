import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import type { Dashboard } from '../lib/types';
import { Async, Avatar, Badge, PageHeader, Panel } from '../components/ui';
import { ACTIVITY_ICON, PRIORITY_TONE, STAGES } from '../lib/meta';
import { cx, fmtCompact, fmtDate, fmtMoney, isOverdue, timeAgo } from '../lib/utils';

export default function DashboardPage() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard') });
  return (
    <>
      <PageHeader title="Overview" subtitle="Where your business stands today." />
      <Async q={q}>{(d) => <Body d={d} />}</Async>
    </>
  );
}

function Body({ d }: { d: Dashboard }) {
  const s = d.stats;
  const thisMonth = d.revenue_by_month[d.revenue_by_month.length - 1]?.revenue ?? 0;
  const stats = [
    { label: 'Customers', value: s.customers },
    { label: 'New, last 30 days', value: s.new_customers },
    { label: 'Leads', value: s.leads, sub: `${s.open_leads} open` },
    { label: 'Active deals', value: s.active_deals, sub: fmtMoney(d.open_pipeline_value) },
    { label: 'Pending tasks', value: s.pending_tasks, sub: s.overdue_tasks ? `${s.overdue_tasks} overdue` : 'None overdue', warn: s.overdue_tasks > 0 },
    { label: 'Revenue won', value: fmtMoney(d.revenue_won_total), sub: `${fmtMoney(thisMonth)} this month` },
  ];
  const maxVal = Math.max(1, ...d.pipeline.map((p) => p.value));
  const hasRevenue = d.revenue_by_month.some((m) => m.revenue > 0);
  const monthLabel = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short' });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-ink-200 border border-ink-200 rounded-md overflow-hidden">
        {stats.map((x) => (
          <div key={x.label} className="bg-white px-4 py-3">
            <div className="text-xs text-ink-500">{x.label}</div>
            <div className="text-xl font-semibold mt-0.5 tabular-nums">{x.value}</div>
            {x.sub && <div className={cx('text-xs mt-0.5', x.warn ? 'text-red-700' : 'text-ink-500')}>{x.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Revenue won, last 6 months" className="lg:col-span-2">
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.revenue_by_month.map((m) => ({ label: monthLabel(m.month), revenue: m.revenue }))} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e3e1db" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#76736a' }} />
                <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12, fill: '#76736a' }} tickFormatter={(v) => fmtCompact(Number(v))} />
                <Tooltip formatter={(v) => fmtMoney(Number(v))} cursor={{ fill: '#f0efec' }} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e3e1db' }} />
                <Bar dataKey="revenue" fill="#1f6f5c" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-ink-500 py-10 text-center">Revenue appears here once you mark a deal as won.</p>}
        </Panel>

        <Panel title="Pipeline" link={{ to: '/deals', label: 'Open board' }}>
          <ul className="space-y-3">
            {d.pipeline.map((p) => (
              <li key={p.stage}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{STAGES.find((x) => x.key === p.stage)?.label}<span className="text-ink-400 ml-1.5 text-xs">{p.count}</span></span>
                  <span className="text-sm tabular-nums text-ink-600">{fmtMoney(p.value)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-100">
                  <div className={cx('h-full rounded-full', p.stage === 'lost' ? 'bg-red-300' : 'bg-accent')} style={{ width: `${(p.value / maxVal) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Recent activity">
          {d.recent_activities.length ? (
            <ul className="divide-y divide-ink-100 -my-2">
              {d.recent_activities.map((a) => {
                const Icon = ACTIVITY_ICON[a.type];
                return (
                  <li key={a.id} className="flex gap-3 py-2.5">
                    <span className="h-7 w-7 rounded-full bg-ink-100 text-ink-600 grid place-items-center shrink-0"><Icon size={14} strokeWidth={1.75} /></span>
                    <div className="min-w-0">
                      <div className="truncate">{a.subject}</div>
                      <div className="text-xs text-ink-500">
                        {a.customer_id ? <Link className="hover:underline text-ink-700" to={`/customers/${a.customer_id}`}>{a.customer_name}</Link> : 'General'} · {a.user_name || 'Unknown'} · {timeAgo(a.created_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-ink-500 py-6 text-center">No activity yet. Log a call or note from a customer profile.</p>}
        </Panel>

        <Panel title="Upcoming tasks" link={{ to: '/tasks', label: 'All tasks' }}>
          {d.upcoming_tasks.length ? (
            <ul className="divide-y divide-ink-100 -my-2">
              {d.upcoming_tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{t.title}</div>
                    <div className={cx('text-xs', isOverdue(t.due_date) ? 'text-red-700' : 'text-ink-500')}>{t.due_date ? fmtDate(t.due_date) : 'No due date'}{t.customer_name ? ` · ${t.customer_name}` : ''}</div>
                  </div>
                  <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  {t.assignee_name && <Avatar name={t.assignee_name} />}
                </li>
              ))}
            </ul>
          ) : <p className="text-ink-500 py-6 text-center">Nothing pending. Add a task to plan your next follow-up.</p>}
        </Panel>
      </div>
    </div>
  );
}
