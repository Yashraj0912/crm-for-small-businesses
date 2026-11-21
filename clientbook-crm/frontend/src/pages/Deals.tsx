import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Async, Avatar, Button, Empty, FormModal, PageHeader, useToast, type FieldDef } from '../components/ui';
import { lookupOptions, useList, useLookup, useRemove, useSave, useUsers, userOptions } from '../lib/hooks';
import { STAGES } from '../lib/meta';
import type { Deal, Page } from '../lib/types';
import { cx, fmtDate, fmtMoney } from '../lib/utils';

const KEY = { page_size: 300 };

export default function Deals() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useList<Deal>('deals', KEY);
  const users = useUsers();
  const customers = useLookup('customers');
  const save = useSave('deals');
  const remove = useRemove('deals');
  const [modal, setModal] = useState<Deal | 'new' | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => api.patch<Deal>(`/deals/${id}/stage`, { stage }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['deals'] });
      const prev = qc.getQueriesData<Page<Deal>>({ queryKey: ['deals'] });
      prev.forEach(([k, d]) => d && qc.setQueryData(k, { ...d, items: d.items.map((x) => (x.id === id ? { ...x, stage } : x)) }));
      return { prev };
    },
    onError: (e, _v, ctx) => { ctx?.prev.forEach(([k, d]) => qc.setQueryData(k, d)); toast((e as Error).message, 'error'); },
    onSettled: () => qc.invalidateQueries(),
  });

  const fields: FieldDef[] = [
    { name: 'title', label: 'Deal title', required: true, full: true },
    { name: 'value', label: 'Value (USD)', type: 'number' },
    { name: 'stage', label: 'Stage', type: 'select', required: true, options: STAGES.map((s) => ({ value: s.key, label: s.label })) },
    { name: 'expected_close', label: 'Expected close', type: 'date' },
    { name: 'customer_id', label: 'Customer', type: 'select', numeric: true, options: lookupOptions(customers.data) },
    { name: 'owner_id', label: 'Owner', type: 'select', numeric: true, options: userOptions(users.data) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <>
      <PageHeader title="Pipeline" subtitle="Drag deals between stages, or use the stage menu on a card." actions={<Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add deal</Button>} />
      <Async q={q}>
        {(d) => {
          const sum = (st: string[]) => d.items.filter((x) => st.includes(x.stage));
          const open = sum(['new', 'qualified', 'proposal', 'negotiation']);
          const won = sum(['won']);
          const lost = sum(['lost']);
          const total = (a: Deal[]) => a.reduce((s, x) => s + x.value, 0);
          if (!d.items.length) return <Empty icon={TrendingUp} title="No deals yet" text="Create a deal to see it move across your pipeline." action={<Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add deal</Button>} />;
          return (
            <>
              <div className="grid grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-md overflow-hidden mb-4 text-sm">
                {[['Pending', open], ['Won', won], ['Lost', lost]].map(([label, a]) => (
                  <div key={label as string} className="bg-white px-3 py-2"><div className="text-xs text-ink-500">{label as string} · {(a as Deal[]).length}</div><div className="font-semibold tabular-nums">{fmtMoney(total(a as Deal[]))}</div></div>
                ))}
              </div>
              <div className="-mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto pb-3">
                <div className="flex gap-3 min-w-max">
                  {STAGES.map((s) => {
                    const items = d.items.filter((x) => x.stage === s.key);
                    return (
                      <div key={s.key}
                        onDragOver={(e) => { e.preventDefault(); setOver(s.key); }} onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
                        onDrop={(e) => { e.preventDefault(); setOver(null); const id = Number(e.dataTransfer.getData('text/plain')); const deal = d.items.find((x) => x.id === id); if (deal && deal.stage !== s.key) move.mutate({ id, stage: s.key }); }}
                        className={cx('w-[260px] shrink-0 rounded-md border bg-ink-100/60 flex flex-col', over === s.key ? 'border-accent bg-accent-soft' : 'border-ink-200')}>
                        <div className="px-3 py-2 flex items-baseline justify-between">
                          <h2 className="text-sm font-semibold">{s.label}<span className="ml-1.5 text-xs font-normal text-ink-500">{items.length}</span></h2>
                          <span className="text-xs tabular-nums text-ink-500">{fmtMoney(total(items))}</span>
                        </div>
                        <ul className="px-2 pb-2 space-y-2 min-h-[56px]">
                          {items.map((x) => (
                            <li key={x.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(x.id))}
                              className="bg-white border border-ink-200 rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-ink-300">
                              <button className="text-left w-full" onClick={() => setModal(x)}>
                                <div className="font-medium text-ink-900 leading-snug">{x.title}</div>
                                {x.customer_name && <div className="text-xs text-ink-500 mt-0.5 truncate">{x.customer_name}</div>}
                              </button>
                              <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="font-semibold tabular-nums text-ink-800">{fmtMoney(x.value)}</span>
                                <span className="flex items-center gap-1.5 text-ink-500">{x.expected_close && fmtDate(x.expected_close)}{x.owner_name && <Avatar name={x.owner_name} size={20} />}</span>
                              </div>
                              <select aria-label={`Move ${x.title} to stage`} value={x.stage} onChange={(e) => move.mutate({ id: x.id, stage: e.target.value })}
                                className="mt-2 w-full h-8 md:h-7 rounded border border-ink-200 bg-white text-[16px] md:text-xs text-ink-600">
                                {STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
                              </select>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
              {d.total > d.items.length && <p className="text-xs text-ink-500 mt-2">Showing the {d.items.length} most recent of {d.total} deals.</p>}
              <p className="text-xs text-ink-500 mt-2">Need the full list for a customer? Open their <Link className="text-accent hover:underline" to="/customers">profile</Link>.</p>
            </>
          );
        }}
      </Async>
      {modal && (
        <FormModal title={modal === 'new' ? 'New deal' : 'Edit deal'} submitLabel={modal === 'new' ? 'Add deal' : 'Save changes'} fields={fields}
          initial={modal === 'new' ? { stage: 'new', value: 0 } : modal}
          onSubmit={async (v) => { await save.mutateAsync({ id: modal === 'new' ? undefined : modal.id, data: { ...v, value: v.value ?? 0 } }); setModal(null); }}
          onDelete={modal !== 'new' && user?.role === 'admin' ? async () => { await remove.mutateAsync(modal.id); setModal(null); } : undefined}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}
