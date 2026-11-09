create table courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_on date not null
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (course_id, user_id)
);

alter table courses enable row level security;
alter table participants enable row level security;

create policy "owner manages own courses" on courses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "participant reads own enrolment" on participants
  for select using (user_id = auth.uid());

-- Data erasure: deleting the auth user removes participants via cascade.
