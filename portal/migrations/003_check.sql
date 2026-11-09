-- Questions before the check, the check job, and the internal result.
create table case_answers (
  case_id uuid primary key references cases(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  skipped boolean not null default false,
  purpose text,
  audience text,
  task text,
  target text,
  created_at timestamptz not null default now()
);
alter table case_answers enable row level security;
alter table case_answers force row level security;
create policy case_answers_owner on case_answers
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

-- One free check per case (a case is one project of one e-mail address).
create table jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references cases(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  steps_done text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table jobs enable row level security;
alter table jobs force row level security;
create policy jobs_owner on jobs
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

-- Full result with evidence, for Sebastian only (hard rules 4 and 5). The app role gets no access.
create table check_results_internal (
  job_id uuid primary key references jobs(id) on delete cascade,
  case_id uuid not null,
  user_id uuid not null,
  engine_version text not null,
  result_code text,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

grant select, insert on case_answers to livedock_app;
grant update (skipped, purpose, audience, task, target) on case_answers to livedock_app;
grant select, insert on jobs to livedock_app;

grant select, update on jobs to livedock_worker;
grant select on case_answers to livedock_worker;
grant select, insert on check_results_internal to livedock_worker;
