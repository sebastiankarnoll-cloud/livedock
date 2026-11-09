create table customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  notes text
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  amount numeric,
  formula text
);

-- no row level security, no policies, no roles
