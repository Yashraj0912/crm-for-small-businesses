import { Mail, Phone, StickyNote, Users } from 'lucide-react';

export type Tone = 'gray' | 'green' | 'amber' | 'red' | 'sky';
export const STAGES = [
  { key: 'new', label: 'New' }, { key: 'qualified', label: 'Qualified' }, { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' }, { key: 'won', label: 'Won' }, { key: 'lost', label: 'Lost' },
];
export const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k;
export const STAGE_TONE: Record<string, Tone> = { new: 'gray', qualified: 'sky', proposal: 'amber', negotiation: 'amber', won: 'green', lost: 'red' };
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
export const LEAD_TONE: Record<string, Tone> = { new: 'gray', contacted: 'sky', qualified: 'amber', unqualified: 'red', converted: 'green' };
export const LEAD_SOURCES = ['Website', 'Referral', 'Social media', 'Email campaign', 'Cold outreach', 'Event', 'Other'];
export const CATEGORIES = ['Prospect', 'Customer', 'Partner', 'Vendor', 'Other'];
export const PRIORITY_TONE: Record<string, Tone> = { low: 'gray', medium: 'amber', high: 'red' };
export const ACTIVITY_TYPES = [{ value: 'call', label: 'Call' }, { value: 'meeting', label: 'Meeting' }, { value: 'email', label: 'Email' }, { value: 'note', label: 'Note' }];
export const ACTIVITY_ICON = { call: Phone, meeting: Users, email: Mail, note: StickyNote } as Record<string, typeof Phone>;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const opts = (list: string[]) => list.map((v) => ({ value: v, label: cap(v) }));
