import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, FileText, Mail, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth';
import { Badge, Button, ErrorBox, Modal, Panel, inputCls, textareaCls, useToast } from './ui';
import { cap } from '../lib/meta';
import { fmtDate } from '../lib/utils';

interface Status { enabled: boolean; remaining: number }
interface Parsed { type: string; subject: string; body?: string | null; tasks: { title: string; due_date?: string | null; priority: string }[] }

export default function AiPanel({ customerId }: { customerId: number }) {
  const toast = useToast();
  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: () => api.get<Status>('/ai/status'), staleTime: 60_000 });
  const [summary, setSummary] = useState('');
  const [modal, setModal] = useState<'draft' | 'notes' | null>(null);
  const sum = useMutation({
    mutationFn: () => api.post<{ text: string }>(`/ai/customers/${customerId}/summary`),
    onSuccess: (r) => { setSummary(r.text); status.refetch(); },
    onError: (e) => toast((e as Error).message, 'error'),
  });
  if (!status.data?.enabled) return null;
  const used = () => status.refetch();

  return (
    <>
      <Panel title="Assistant">
        <p className="text-xs text-ink-500 mb-3">AI-generated. Check it before you rely on it or send it. {status.data.remaining} requests left today.</p>
        <div className="flex flex-col gap-2">
          <Button loading={sum.isPending} disabled={status.data.remaining < 1} onClick={() => sum.mutate()}><Sparkles size={14} />Catch me up</Button>
          <Button disabled={status.data.remaining < 1} onClick={() => setModal('draft')}><Mail size={14} />Draft a follow-up</Button>
          <Button disabled={status.data.remaining < 1} onClick={() => setModal('notes')}><FileText size={14} />Turn notes into records</Button>
        </div>
        {summary && <p className="mt-3 pt-3 border-t border-ink-100 text-sm whitespace-pre-wrap">{summary}</p>}
      </Panel>
      {modal === 'draft' && <DraftModal customerId={customerId} onUsed={used} onClose={() => setModal(null)} />}
      {modal === 'notes' && <NotesModal customerId={customerId} onUsed={used} onClose={() => setModal(null)} />}
    </>
  );
}

function DraftModal({ customerId, onUsed, onClose }: { customerId: number; onUsed: () => void; onClose: () => void }) {
  const [channel, setChannel] = useState('email');
  const [goal, setGoal] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true); setErr(''); setCopied(false);
    try { setText((await api.post<{ text: string }>(`/ai/customers/${customerId}/draft`, { channel, goal })).text); onUsed(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Draft a follow-up" onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label htmlFor="ai-channel" className="block text-xs font-medium text-ink-600 mb-1">Format</label>
          <select id="ai-channel" className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="email">Email</option><option value="message">Short message</option>
          </select>
        </div>
        <div>
          <label htmlFor="ai-goal" className="block text-xs font-medium text-ink-600 mb-1">What should it achieve?</label>
          <textarea id="ai-goal" className={textareaCls} maxLength={500} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Example: Ask if they reviewed the proposal and offer a call this week." />
        </div>
        {err && <ErrorBox message={err} />}
        <Button variant="primary" loading={busy} disabled={goal.trim().length < 3} onClick={run}>{text ? 'Write again' : 'Write draft'}</Button>
        {text && (
          <div className="space-y-2 pt-3 border-t border-ink-100">
            <textarea className={textareaCls + ' min-h-[220px]'} value={text} onChange={(e) => setText(e.target.value)} aria-label="Draft" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-500">Edit freely. Nothing is sent from here.</span>
              <Button onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy</>}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function NotesModal({ customerId, onUsed, onClose }: { customerId: number; onUsed: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [keepActivity, setKeepActivity] = useState(true);
  const [keep, setKeep] = useState<boolean[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    setBusy(true); setErr('');
    try {
      const p = await api.post<Parsed>('/ai/parse-notes', { notes });
      setParsed(p); setKeep(p.tasks.map(() => true)); setKeepActivity(true); onUsed();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!parsed) return;
    setBusy(true); setErr('');
    try {
      if (keepActivity) await api.post('/activities', { type: parsed.type, subject: parsed.subject, body: parsed.body, customer_id: customerId });
      for (const [i, t] of parsed.tasks.entries()) {
        if (keep[i]) await api.post('/tasks', { title: t.title, due_date: t.due_date, priority: t.priority, customer_id: customerId, assigned_to: user?.id });
      }
      qc.invalidateQueries();
      toast('Records saved');
      onClose();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <Modal title="Turn notes into records" onClose={onClose}>
      <div className="p-4 space-y-3">
        {!parsed ? (
          <>
            <label htmlFor="ai-notes" className="block text-xs font-medium text-ink-600">Paste your notes</label>
            <textarea id="ai-notes" className={textareaCls + ' min-h-[160px]'} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: Spoke with Maya today. She wants a revised quote by next Friday and will check with her partner." />
            {err && <ErrorBox message={err} />}
            <Button variant="primary" loading={busy} disabled={notes.trim().length < 3} onClick={analyze}>Find records</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-600">Choose what to save to this customer.</p>
            <label className="flex gap-3 border border-ink-200 rounded-md p-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#1f6f5c]" checked={keepActivity} onChange={(e) => setKeepActivity(e.target.checked)} />
              <span className="min-w-0"><Badge>{cap(parsed.type)}</Badge><span className="block font-medium mt-1">{parsed.subject}</span>{parsed.body && <span className="block text-sm text-ink-600 whitespace-pre-wrap">{parsed.body}</span>}</span>
            </label>
            {parsed.tasks.map((t, i) => (
              <label key={i} className="flex gap-3 border border-ink-200 rounded-md p-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#1f6f5c]" checked={keep[i]} onChange={(e) => setKeep((k) => k.map((v, j) => (j === i ? e.target.checked : v)))} />
                <span><span className="block font-medium">Task: {t.title}</span><span className="text-xs text-ink-500">{t.due_date ? `Due ${fmtDate(t.due_date)}` : 'No due date'} · {t.priority} priority</span></span>
              </label>
            ))}
            {err && <ErrorBox message={err} />}
            <div className="flex gap-2">
              <Button variant="primary" loading={busy} disabled={!keepActivity && !keep.some(Boolean)} onClick={save}>Save selected</Button>
              <Button onClick={() => setParsed(null)}>Back</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
