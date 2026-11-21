import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Async, Badge, Button, DataTable, Empty, FormModal, inputCls, PageHeader, Pagination, useToast, type Col, type FieldDef } from '../components/ui';
import { useDebounce, useList, useRemove, useSave, useUsers, userOptions } from '../lib/hooks';
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_TONE, cap, opts } from '../lib/meta';
import type { Customer, Lead } from '../lib/types';
import { cx, fmtDate, isOverdue } from '../lib/utils';

export default function Leads() {
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Lead | 'new' | null>(null);
  const qd = useDebounce(search, 300);
  useEffect(() => setPage(1), [qd, status]);

  const q = useList<Lead>('leads', { q: qd, status, page, page_size: 20 });
  const users = useUsers();
  const save = useSave('leads');
  const remove = useRemove('leads');
  const convert = useMutation({
    mutationFn: (id: number) => api.post<Customer>(`/leads/${id}/convert`),
    onSuccess: (c) => { qc.invalidateQueries(); toast('Lead converted to customer'); nav(`/customers/${c.id}`); },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const fields: FieldDef[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'company', label: 'Company' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'source', label: 'Source', type: 'select', options: LEAD_SOURCES.map((s) => ({ value: s, label: s })) },
    { name: 'status', label: 'Status', type: 'select', required: true, options: opts(LEAD_STATUSES.filter((s) => s !== 'converted')) },
    { name: 'assigned_to', label: 'Assigned to', type: 'select', numeric: true, options: userOptions(users.data) },
    { name: 'follow_up_date', label: 'Follow-up date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const cols: Col<Lead>[] = [
    { header: 'Lead', primary: true, cell: (l) => (<div><div className="font-medium text-ink-900">{l.name}</div>{l.company && <div className="text-xs text-ink-500">{l.company}</div>}</div>) },
    { header: 'Status', cell: (l) => <Badge tone={LEAD_TONE[l.status]}>{cap(l.status)}</Badge> },
    { header: 'Source', cell: (l) => <span className="text-ink-600">{l.source || '—'}</span> },
    { header: 'Follow-up', cell: (l) => <span className={cx(l.status !== 'converted' && isOverdue(l.follow_up_date) ? 'text-red-700' : 'text-ink-600')}>{fmtDate(l.follow_up_date)}</span> },
    { header: 'Assigned', cell: (l) => <span className="text-ink-600">{l.assignee_name || '—'}</span> },
  ];
  const filtered = !!(qd || status);

  return (
    <>
      <PageHeader title="Leads" subtitle="Prospects you are still qualifying." actions={<Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add lead</Button>} />
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className={inputCls + ' pl-8'} placeholder="Search leads" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search leads" />
        </div>
        <select className={inputCls + ' sm:w-44'} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
      </div>
      <Async q={q}>
        {(d) => d.items.length ? (
          <>
            <DataTable rows={d.items} cols={cols} onRowClick={(l) => setModal(l)}
              actions={(l) => l.converted_customer_id ? (
                <Button className="!h-8 md:!h-7" onClick={() => nav(`/customers/${l.converted_customer_id}`)}>View customer</Button>
              ) : (
                <Button className="!h-8 md:!h-7" loading={convert.isPending && convert.variables === l.id} onClick={() => convert.mutate(l.id)}>Convert to customer</Button>
              )} />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={setPage} />
          </>
        ) : (
          <Empty icon={UserPlus} title={filtered ? 'No leads match your filters' : 'No leads yet'} text={filtered ? 'Try a different search or status.' : 'Add a lead to track where it came from and when to follow up.'}
            action={!filtered && <Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add lead</Button>} />
        )}
      </Async>
      {modal && (
        <FormModal title={modal === 'new' ? 'New lead' : 'Edit lead'} submitLabel={modal === 'new' ? 'Add lead' : 'Save changes'} fields={modal !== 'new' && modal.status === 'converted' ? fields.filter((f) => f.name !== 'status') : fields}
          initial={modal === 'new' ? { status: 'new' } : modal}
          onSubmit={async (v) => { await save.mutateAsync({ id: modal === 'new' ? undefined : modal.id, data: { status: 'new', ...v } }); setModal(null); }}
          onDelete={modal !== 'new' && user?.role === 'admin' ? async () => { await remove.mutateAsync(modal.id); setModal(null); } : undefined}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}
