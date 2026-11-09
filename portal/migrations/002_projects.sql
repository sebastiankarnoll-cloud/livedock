-- Uploaded project (one per case) and deletion protocol.
alter table cases add column code_deleted_at timestamptz;

create table projects (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references cases(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  original_name text not null,
  zip_bytes bigint not null,
  file_count int not null,
  byte_count bigint not null,
  created_at timestamptz not null default now()
);
alter table projects enable row level security;
alter table projects force row level security;
create policy projects_owner on projects
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

create table deletion_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  what text not null,
  files int not null default 0,
  bytes bigint not null default 0,
  deleted_at timestamptz not null default now()
);

grant select, insert, update, delete on projects to livedock_app;
-- The background worker is the only role that sees all cases (needed for the 30-day deletion).
grant select, update on cases to livedock_worker;
grant select, delete on projects to livedock_worker;
grant select on users to livedock_worker;
grant select, insert on deletion_log to livedock_worker;
