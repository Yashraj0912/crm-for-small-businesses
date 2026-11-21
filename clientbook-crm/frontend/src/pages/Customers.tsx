import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Contact, Plus, Search } from 'lucide-react';
import { Async, Badge, Button, DataTable, Empty, FormModal, inputCls, PageHeader, Pagination, type Col } from '../components/ui';
import { useDebounce, useList, useSave, useUsers, userOptions } from '../lib/hooks';
import { customerFields } from '../lib/forms';
import { CATEGORIES } from '../lib/meta';
import type { Customer } from '../lib/types';
import { fmtDate } from '../lib/utils';

const cols: Col<Customer>[] = [
  { header: 'Name', primary: true, cell: (c) => (<div><div className="font-medium text-ink-900">{c.name}</div>{c.company && <div className="text-xs text-ink-500">{c.company}</div>}</div>) },
  { header: 'Contact', cell: (c) => <span className="text-ink-600">{c.email || c.phone || '—'}</span> },
  { header: 'Category', cell: (c) => (c.category ? <Badge>{c.category}</Badge> : <span className="text-ink-400">—</span>) },
  { header: 'Tags', hideMobile: true, cell: (c) => <div className="flex flex-wrap gap-x-2">{c.tags.slice(0, 3).map((t) => <span key={t} className="text-xs text-ink-500">#{t}</span>)}</div> },
  { header: 'Added', hideMobile: true, cell: (c) => <span className="text-ink-500">{fmtDate(c.created_at)}</span> },
];

export default function Customers() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [search, setSearch] = useState(sp.get('q') || '');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const qd = useDebounce(search, 300);
  useEffect(() => setSearch(sp.get('q') || ''), [sp]);
  useEffect(() => setPage(1), [qd, category]);

  const q = useList<Customer>('customers', { q: qd, category, page, page_size: 20 });
  const users = useUsers();
  const save = useSave('customers');
  const filtered = !!(qd || category);

  return (
    <>
      <PageHeader title="Customers" subtitle="People and companies you do business with." actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} />Add customer</Button>} />
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className={inputCls + ' pl-8'} placeholder="Search name, email, company or tag" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
        </div>
        <select className={inputCls + ' sm:w-44'} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Async q={q}>
        {(d) => d.items.length ? (
          <>
            <DataTable rows={d.items} cols={cols} onRowClick={(c) => nav(`/customers/${c.id}`)} />
            <Pagination page={d.page} pageSize={d.page_size} total={d.total} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Contact} title={filtered ? 'No customers match your search' : 'No customers yet'} text={filtered ? 'Try a different search or clear the filter.' : 'Add your first customer to start tracking conversations and deals.'}
            action={!filtered && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} />Add customer</Button>} />
        )}
      </Async>
      {creating && (
        <FormModal title="New customer" submitLabel="Add customer" fields={customerFields(userOptions(users.data))}
          onSubmit={async (v) => { const c: any = await save.mutateAsync({ data: v }); setCreating(false); nav(`/customers/${c.id}`); }} onClose={() => setCreating(false)} />
      )}
    </>
  );
}
