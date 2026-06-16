create table if not exists waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone_number text null,
  email_address text unique not null,
  created_at timestamptz default now()
);

create index if not exists waiting_list_email_idx on waiting_list(email_address);