-- Per-user opt-out for assignment emails. Run in Neon > SQL Editor BEFORE deploying the new code. Safe to re-run.
alter table users add column if not exists notify_email boolean not null default true;
