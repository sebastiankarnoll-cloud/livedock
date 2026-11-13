-- Staff review (2d): release queue, customer-facing result, review protocol.
-- Role livedock_staff: sees all cases (BYPASSRLS), only for the control center. Created by the setup script.

alter table check_results_internal add column alerted_at timestamptz, add column held_at timestamptz;

-- What the customer may see after release (hard rules 4 and 5): customer view only, no evidence.
create table check_results_public (
  job_id uuid primary key references jobs(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  result_code text not null,
  result_json jsonb not null,
  released_at timestamptz not null default now(),
  released_by text not null,
  mail_sent_at timestamptz
);
alter table check_results_public enable row level security;
alter table check_results_public force row level security;
create policy check_results_public_owner on check_results_public for select
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

-- Who did what and when. Details contain codes only, never customer content.
create table review_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  action text not null check (action in ('alerted','released','held','mail_sent','mail_failed')),
  actor text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- The customer app can only read its own released result.
grant select on check_results_public to livedock_app;

-- Control center.
grant select on jobs, cases, case_answers, projects, users to livedock_staff;
grant select on check_results_internal to livedock_staff;
grant update (released_at, held_at) on check_results_internal to livedock_staff;
grant select, insert on check_results_public to livedock_staff;
grant update (mail_sent_at) on check_results_public to livedock_staff;
grant select, insert on review_log to livedock_staff;

-- Immediate alert for an acute finding is sent by the worker.
grant update (alerted_at) on check_results_internal to livedock_worker;
grant insert on review_log to livedock_worker;
grant insert on outbox to livedock_worker; -- development mail outbox only
