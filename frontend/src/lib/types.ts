export interface Page<T> { items: T[]; total: number; page: number; page_size: number }
export interface User { id: number; org_id: number; org_name?: string; name: string; email: string; role: 'admin' | 'employee'; is_active: boolean; last_login_at?: string | null; activities_30d?: number; notify_email?: boolean }
export interface Customer { id: number; name: string; email?: string | null; phone?: string | null; company?: string | null; job_title?: string | null; category?: string | null; tags: string[]; address?: string | null; notes?: string | null; owner_id?: number | null; owner_name?: string | null; created_at: string }
export interface Lead { id: number; name: string; email?: string | null; phone?: string | null; company?: string | null; source?: string | null; status: string; assigned_to?: number | null; assignee_name?: string | null; follow_up_date?: string | null; notes?: string | null; converted_customer_id?: number | null; created_at: string }
export interface Deal { id: number; title: string; value: number; stage: string; expected_close?: string | null; customer_id?: number | null; customer_name?: string | null; owner_id?: number | null; owner_name?: string | null; notes?: string | null; closed_at?: string | null; created_at: string }
export interface Task { id: number; title: string; description?: string | null; due_date?: string | null; priority: string; status: string; assigned_to?: number | null; assignee_name?: string | null; customer_id?: number | null; customer_name?: string | null; deal_id?: number | null; deal_title?: string | null }
export interface Activity { id: number; type: string; subject: string; body?: string | null; customer_id?: number | null; customer_name?: string | null; deal_id?: number | null; user_name?: string | null; created_at: string }
export interface Dashboard {
  stats: { customers: number; new_customers: number; leads: number; open_leads: number; active_deals: number; pending_tasks: number; overdue_tasks: number; due_today: number };
  pipeline: { stage: string; count: number; value: number }[];
  open_pipeline_value: number;
  revenue_won_total: number;
  revenue_by_month: { month: string; revenue: number }[];
  recent_activities: Activity[];
  upcoming_tasks: Task[];
}
