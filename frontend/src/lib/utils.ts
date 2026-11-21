export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const fmtMoney = (n?: number | null) => money.format(n || 0);
export const fmtCompact = (n: number) => (n >= 1000 ? `$${Math.round(n / 100) / 10}k` : `$${n}`);

export const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
export const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const isOverdue = (d?: string | null) => !!d && d < todayStr();

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}

export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export function qs(p: Record<string, unknown>) {
  const u = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && u.set(k, String(v)));
  const s = u.toString();
  return s ? `?${s}` : '';
}
