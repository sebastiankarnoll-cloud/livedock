create extension if not exists citext;
create extension if not exists pgcrypto;

-- Accounts and login. Looked up by e-mail before the user is known, so no row level security here.
create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  consent_at timestamptz not null,
  consent_version text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table login_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Customer data: strictly separated per user by row level security (hard rule 6).
create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  delete_after timestamptz not null default now() + interval '30 days'
);

alter table cases enable row level security;
alter table cases force row level security;
create policy cases_owner on cases
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

-- Development mail outbox (replaced by a real EU mail service later).
create table outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on users, login_tokens, sessions, outbox to livedock_app;
grant select, insert, update, delete on cases to livedock_app;
