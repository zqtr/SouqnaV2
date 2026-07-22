begin;

create table if not exists pro_sessions (
  id                uuid primary key default gen_random_uuid(),
  storefront_slug   text not null references pro_workspaces(storefront_slug) on delete cascade,
  clerk_user_id     text not null,
  title             text not null,
  status            text not null default 'active' check (status in ('active', 'archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists pro_sessions_storefront_owner_updated_idx
  on pro_sessions (storefront_slug, clerk_user_id, updated_at desc);

create table if not exists pro_session_events (
  id           uuid primary key default gen_random_uuid(),
  sequence_no  bigint generated always as identity,
  session_id   uuid not null references pro_sessions(id) on delete cascade,
  event_type   text not null check (event_type in (
                 'user_prompt', 'souqy_response', 'job', 'publish', 'error'
               )),
  content      text,
  job_id       uuid references pro_jobs(id) on delete set null,
  revision     text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

alter table pro_session_events
  add column if not exists sequence_no bigint generated always as identity;

create index if not exists pro_session_events_session_created_idx
  on pro_session_events (session_id, created_at asc, sequence_no asc);

alter table pro_jobs
  add column if not exists session_id uuid references pro_sessions(id) on delete set null;

create index if not exists pro_jobs_session_created_idx
  on pro_jobs (session_id, created_at desc)
  where session_id is not null;

commit;
