begin;

alter table pro_workspaces
  add column if not exists brand_intent jsonb not null default '{}'::jsonb,
  add column if not exists recommendation_version integer not null default 0
    check (recommendation_version >= 0);

commit;
