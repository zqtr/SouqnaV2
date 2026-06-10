begin;

create table if not exists account_profiles (
  clerk_user_id text primary key,
  username text,
  display_name text,
  primary_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_profiles_username_unique
  on account_profiles (lower(username))
  where username is not null;

commit;
