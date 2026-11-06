-- Failed sign-in attempts, used to slow down password guessing (works across serverless instances).
create table auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index auth_attempts_key_idx on auth_attempts(key, created_at desc);
alter table auth_attempts enable row level security;
