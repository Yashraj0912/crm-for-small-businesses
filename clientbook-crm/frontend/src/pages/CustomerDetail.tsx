import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Async, Badge, Button, FormModal, Panel } from '../components/ui';
import { useList, useRemove, useSave, useUsers, userOptions } from '../lib/hooks';
import { activityFields, customerFields } from '../lib/forms';
import { ACTIVITY_ICON, PRIORITY_TONE, STAGE_TONE, stageLabel } from '../lib/meta';
import type { Activity, Customer, Deal, Task } from '../lib/types';
import { cx, fmtDate, fmtMoney, isOverdue, timeAgo } from '../lib/utils';

export default function CustomerDetail() {
  const cid = Number(useParams().id);
  const nav = useNavigate();
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const q = useQuery({ queryKey: ['customers', 'detail', cid], queryFn: () => api.get<Customer>(`/customers/${cid}`) });
  const acts = useList<Activity>('activities', { customer_id: cid, page_size: 50 });
  const deals = useList<Deal>('deals', { customer_id: cid, page_size: 20 });
  const tasks = useList<Task>('tasks', { customer_id: cid, status: 'pending', page_size: 20 });
  const users = useUsers();
  const saveCustomer = useSave('customers');
  const saveActivity = useSave('activities');
  const removeActivity = useRemove('activities');
  const removeCustomer = useRemove('customers');
  const [modal, setModal] = useState<'edit' | 'activity' | Activity | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <>
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 mb-3"><ArrowLeft size={14} />Customers</Link>
      <Async q={q}>
        {(c) => (
          <>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">{c.name}</h1>
                <p className="text-ink-500">{[c.job_title, c.company].filter(Boolean).join(' at ') || 'No company'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => setModal('edit')}><Pencil size={14} />Edit</Button>
                {admin && <Button variant="danger" loading={removeCustomer.isPending} onClick={() => (confirmDel ? removeCustomer.mutateAsync(cid).then(() => nav('/customers')) : setConfirmDel(true))}>{confirmDel ? 'Confirm delete' : 'Delete'}</Button>}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              <div className="space-y-5">
                <Panel title="Details">
                  <dl className="space-y-2.5 text-sm">
                    {([['Email', c.email], ['Phone', c.phone], ['Owner', c.owner_name], ['Address', c.address], ['Added', fmtDate(c.created_at)]] as const).map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-ink-500">{k}</dt><dd className="whitespace-pre-wrap break-words">{v || '—'}</dd></div>
                    ))}
                    <div><dt className="text-xs text-ink-500 mb-1">Category and tags</dt><dd className="flex flex-wrap gap-1.5">{c.category && <Badge tone="green">{c.category}</Badge>}{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}{!c.category && !c.tags.length && '—'}</dd></div>
                  </dl>
                </Panel>
                {c.notes && <Panel title="Notes"><p className="whitespace-pre-wrap text-sm">{c.notes}</p></Panel>}
                <Panel title="Open tasks" link={{ to: '/tasks', label: 'All tasks' }}>
                  {tasks.data?.items.length ? (
                    <ul className="space-y-2">{tasks.data.items.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2"><span className="truncate">{t.title}</span><span className={cx('text-xs shrink-0', isOverdue(t.due_date) ? 'text-red-700' : 'text-ink-500')}>{fmtDate(t.due_date)}</span></li>
                    ))}</ul>
                  ) : <p className="text-ink-500 text-sm">No open tasks for this customer.</p>}
                </Panel>
              </div>

              <div className="lg:col-span-2 space-y-5">
                <Panel title="Deals" link={{ to: '/deals', label: 'Pipeline' }}>
                  {deals.data?.items.length ? (
                    <ul className="divide-y divide-ink-100 -my-2">{deals.data.items.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 py-2.5"><span className="truncate">{d.title}</span><span className="flex items-center gap-3 shrink-0"><span className="tabular-nums text-ink-600">{fmtMoney(d.value)}</span><Badge tone={STAGE_TONE[d.stage]}>{stageLabel(d.stage)}</Badge></span></li>
                    ))}</ul>
                  ) : <p className="text-ink-500 text-sm">No deals yet. Create one from the pipeline board.</p>}
                </Panel>

                <section className="bg-white border border-ink-200 rounded-md">
                  <header className="flex items-center justify-between px-4 h-10 border-b border-ink-200">
                    <h2 className="text-sm font-semibold">Interaction history</h2>
                    <Button className="!h-8 md:!h-7" onClick={() => setModal('activity')}><Plus size={14} />Log activity</Button>
                  </header>
                  <div className="px-4">
                    <Async q={acts}>
                      {(a) => a.items.length ? (
                        <ul className="divide-y divide-ink-100">{a.items.map((x) => {
                          const Icon = ACTIVITY_ICON[x.type];
                          return (
                            <li key={x.id} className="flex gap-3 py-3 cursor-pointer" onClick={() => setModal(x)}>
                              <span className="mt-0.5 h-7 w-7 rounded-full bg-ink-100 text-ink-600 grid place-items-center shrink-0"><Icon size={14} strokeWidth={1.75} /></span>
                              <div className="min-w-0">
                                <div className="font-medium">{x.subject}</div>
                                {x.body && <p className="text-ink-600 whitespace-pre-wrap break-words">{x.body}</p>}
                                <div className="text-xs text-ink-500 mt-0.5">{x.user_name || 'Unknown'} · {timeAgo(x.created_at)}</div>
                              </div>
                            </li>
                          );
                        })}</ul>
                      ) : <p className="text-ink-500 py-8 text-center">No interactions logged. Record a call, meeting, email or note.</p>}
                    </Async>
                  </div>
                </section>
              </div>
            </div>

            {modal === 'edit' && (
              <FormModal title="Edit customer" fields={customerFields(userOptions(users.data))} initial={c}
                onSubmit={async (v) => { await saveCustomer.mutateAsync({ id: cid, data: v }); setModal(null); }} onClose={() => setModal(null)} />
            )}
            {modal === 'activity' && (
              <FormModal title="Log activity" submitLabel="Log activity" fields={activityFields} initial={{ type: 'note' }}
                onSubmit={async (v) => { await saveActivity.mutateAsync({ data: { ...v, customer_id: cid } }); setModal(null); }} onClose={() => setModal(null)} />
            )}
            {modal && typeof modal === 'object' && (
              <FormModal title="Edit activity" fields={activityFields} initial={modal}
                onSubmit={async (v) => { await saveActivity.mutateAsync({ id: modal.id, data: { ...v, customer_id: cid } }); setModal(null); }}
                onDelete={async () => { await removeActivity.mutateAsync(modal.id); setModal(null); }} onClose={() => setModal(null)} />
            )}
          </>
        )}
      </Async>
    </>
  );
}
