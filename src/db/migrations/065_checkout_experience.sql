-- Controlled checkout experience options edited from Builder.
alter table briefs
  add column if not exists checkout_experience jsonb not null default '{}'::jsonb;
