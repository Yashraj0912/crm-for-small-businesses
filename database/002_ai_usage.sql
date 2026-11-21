-- AI usage counter (one row per organization per day). Run once in Neon > SQL Editor. Safe to re-run.
create table if not exists ai_usage (
  org_id integer not null references organizations(id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  primary key (org_id, day)
);
