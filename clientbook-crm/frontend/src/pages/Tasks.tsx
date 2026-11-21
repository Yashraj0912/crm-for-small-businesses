import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ListChecks, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Async, Avatar, Badge, Button, Empty, FormModal, PageHeader, Pagination, useToast } from '../components/ui';
import { lookupOptions, useList, useLookup, useRemove, useSave, useUsers, userOptions } from '../lib/hooks';
import { taskFields } from '../lib/forms';
import { PRIORITY_TONE } from '../lib/meta';
import type { Task } from '../lib/types';
import { cx, fmtDate, isOverdue } from '../lib/utils';

const TABS = [{ key: 'pending', label: 'Pending' }, { key: 'done', label: 'Completed' }, { key: '', label: 'All' }];

export default function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Task | 'new' | null>(null);
  const q = useList<Task>('tasks', { status, assigned_to: mine ? user?.id : '', page, page_size: 25 });
  const users = useUsers();
  const customers = useLookup('customers');
  const deals = useLookup('deals');
  const save = useSave('tasks');
  const remove = useRemove('tasks');
  const toggle = useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast((e as Error).message, 'error'),
  });
  const fields = taskFields(userOptions(users.data), lookupOptions(customers.data), lookupOptions(deals.data));

  return (
    <>
      <PageHeader title="Tasks" subtitle="Follow-ups and to-dos for your team." actions={<Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add task</Button>} />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex rounded-md border border-ink-300 bg-white p-0.5" role="tablist">
          {TABS.map((t) => (
            <button key={t.label} role="tab" aria-selected={status === t.key} onClick={() => { setStatus(t.key); setPage(1); }}
              className={cx('h-9 md:h-7 px-3 rounded text-sm', status === t.key ? 'bg-ink-100 text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900')}>{t.label}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-600"><input type="checkbox" className="h-4 w-4 accent-[#1f6f5c]" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} />Assigned to me</label>
      </div>
      <Async q={q}>
        {(d) => d.items.length ? (
          <>
            <ul className="bg-white border border-ink-200 rounded-md divide-y divide-ink-100">
              {d.items.map((t) => {
                const done = t.status === 'done';
                return (
                  <li key={t.id} className="flex items-start gap-3 px-3 py-3">
                    <button onClick={() => toggle.mutate(t.id)} aria-label={done ? `Mark "${t.title}" as pending` : `Mark "${t.title}" as done`} aria-pressed={done}
                      className={cx('mt-0.5 h-5 w-5 rounded border grid place-items-center shrink-0', done ? 'bg-accent border-accent text-white' : 'border-ink-300 hover:border-ink-500')}>
                      {done && <Check size={12} strokeWidth={3} />}
                    </button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setModal(t)}>
                      <div className={cx('font-medium', done && 'line-through text-ink-400')}>{t.title}</div>
                      <div className="text-xs text-ink-500 mt-0.5 flex flex-wrap gap-x-2">
                        <span className={cx(!done && isOverdue(t.due_date) && 'text-red-700')}>{t.due_date ? `${!done && isOverdue(t.due_date) ? 'Overdue · ' : ''}${fmtDate(t.due_date)}` : 'No due date'}</span>
                        {t.customer_name && <span>{t.customer_name}</span>}
                        {t.deal_title && <span>{t.deal_title}</span>}
                      </div>
                    </button>
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                    {t.assignee_name && <Avatar name={t.assignee_name} />}
                  </li>
                );
              })}
            </ul>
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={setPage} />
          </>
        ) : (
          <Empty icon={ListChecks} title={status === 'done' ? 'No completed tasks yet' : 'No tasks here'} text="Add a task to plan your next follow-up." action={<Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add task</Button>} />
        )}
      </Async>
      <p className="text-xs text-ink-500 mt-3">Tasks can be linked to a customer or deal when you create them. <Link className="text-accent hover:underline" to="/customers">Browse customers</Link></p>
      {modal && (
        <FormModal title={modal === 'new' ? 'New task' : 'Edit task'} submitLabel={modal === 'new' ? 'Add task' : 'Save changes'} fields={fields}
          initial={modal === 'new' ? { priority: 'medium', status: 'pending', assigned_to: user?.id } : modal}
          onSubmit={async (v) => { await save.mutateAsync({ id: modal === 'new' ? undefined : modal.id, data: v }); setModal(null); }}
          onDelete={modal !== 'new' ? async () => { await remove.mutateAsync(modal.id); setModal(null); } : undefined}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}
