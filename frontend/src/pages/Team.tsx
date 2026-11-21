import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '../auth';
import { Async, Avatar, Badge, Button, DataTable, FormModal, PageHeader, type Col, type FieldDef } from '../components/ui';
import { useSave, useUsers } from '../lib/hooks';
import type { User } from '../lib/types';
import { timeAgo } from '../lib/utils';

export default function Team() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const q = useUsers();
  const save = useSave('users');
  const [modal, setModal] = useState<User | 'new' | null>(null);

  const cols: Col<User>[] = [
    { header: 'Member', primary: true, cell: (u) => (<div className="flex items-center gap-2.5"><Avatar name={u.name} size={28} /><div><div className="font-medium text-ink-900">{u.name}{u.id === user?.id && <span className="text-ink-400 font-normal"> (you)</span>}</div><div className="text-xs text-ink-500">{u.email}</div></div></div>) },
    { header: 'Role', cell: (u) => <Badge tone={u.role === 'admin' ? 'green' : 'gray'}>{u.role === 'admin' ? 'Administrator' : 'Team member'}</Badge> },
    { header: 'Status', cell: (u) => <Badge tone={u.is_active ? 'gray' : 'red'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge> },
    { header: 'Activities, 30 days', cell: (u) => <span className="tabular-nums">{u.activities_30d ?? 0}</span> },
    { header: 'Last sign-in', cell: (u) => <span className="text-ink-500">{u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}</span> },
  ];
  const isNew = modal === 'new';
  const fields: FieldDef[] = [
    { name: 'name', label: 'Full name', required: true },
    ...(isNew ? [{ name: 'email', label: 'Email', type: 'email' as const, required: true }] : []),
    { name: 'password', label: isNew ? 'Temporary password' : 'New password', type: 'password', required: isNew, hint: isNew ? 'At least 8 characters. Share it securely.' : 'Leave blank to keep the current password.' },
    { name: 'role', label: 'Role', type: 'select', required: true, options: [{ value: 'employee', label: 'Team member' }, { value: 'admin', label: 'Administrator' }] },
    ...(!isNew ? [{ name: 'is_active', label: 'Status', type: 'select' as const, required: true, bool: true, options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }] }] : []),
  ];

  return (
    <>
      <PageHeader title="Team" subtitle={admin ? 'Add teammates and manage their access.' : 'People in your workspace.'} actions={admin && <Button variant="primary" onClick={() => setModal('new')}><Plus size={14} />Add member</Button>} />
      <Async q={q}>{(users) => <DataTable rows={users} cols={cols} onRowClick={admin ? (u) => setModal(u) : undefined} />}</Async>
      {!admin && <p className="text-xs text-ink-500 mt-3 flex items-center gap-1.5"><Users size={12} />Only administrators can add or edit team members.</p>}
      {modal && (
        <FormModal title={isNew ? 'Add team member' : 'Edit team member'} submitLabel={isNew ? 'Add member' : 'Save changes'} fields={fields}
          initial={isNew ? { role: 'employee' } : modal}
          onSubmit={async (v) => { const data = isNew ? v : { ...v, password: v.password || null }; await save.mutateAsync({ id: isNew ? undefined : modal.id, data }); setModal(null); }}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}
