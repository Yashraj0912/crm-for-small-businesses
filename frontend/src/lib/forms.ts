import type { FieldDef } from '../components/ui';
import { ACTIVITY_TYPES, CATEGORIES, opts } from './meta';

type O = { value: string | number; label: string }[];

export const customerFields = (users: O): FieldDef[] => [
  { name: 'name', label: 'Full name', required: true },
  { name: 'company', label: 'Company' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'job_title', label: 'Job title' },
  { name: 'category', label: 'Category', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })) },
  { name: 'owner_id', label: 'Account owner', type: 'select', numeric: true, options: users },
  { name: 'tags', label: 'Tags', type: 'tags', hint: 'Separate with commas' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const activityFields: FieldDef[] = [
  { name: 'type', label: 'Type', type: 'select', required: true, options: ACTIVITY_TYPES },
  { name: 'subject', label: 'Subject', required: true, full: true },
  { name: 'body', label: 'Details', type: 'textarea' },
];

export const taskFields = (users: O, customers: O, deals: O): FieldDef[] => [
  { name: 'title', label: 'Task', required: true, full: true },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'priority', label: 'Priority', type: 'select', required: true, options: opts(['low', 'medium', 'high']) },
  { name: 'assigned_to', label: 'Assigned to', type: 'select', numeric: true, options: users },
  { name: 'status', label: 'Status', type: 'select', required: true, options: opts(['pending', 'done']) },
  { name: 'customer_id', label: 'Customer', type: 'select', numeric: true, options: customers },
  { name: 'deal_id', label: 'Deal', type: 'select', numeric: true, options: deals },
  { name: 'description', label: 'Notes', type: 'textarea' },
];
