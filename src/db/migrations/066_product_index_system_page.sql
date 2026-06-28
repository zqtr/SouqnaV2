alter table briefs
  add column if not exists products_index_settings jsonb not null default '{}'::jsonb;
