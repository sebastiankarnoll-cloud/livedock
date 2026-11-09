create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  name text,
  email text,
  notes text
);

-- no row level security, no policies
