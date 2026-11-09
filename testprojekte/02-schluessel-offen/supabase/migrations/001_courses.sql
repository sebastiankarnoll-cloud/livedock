create table courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null
);

alter table courses enable row level security;

create policy "owner manages own courses" on courses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
