-- Souqna Pro authoring is intentionally separate from Easy builder drafts
-- and from the published Souqy pointer on briefs. No experimental
-- user_plans.meta data is migrated.

begin;

create table if not exists pro_user_preferences (
  clerk_user_id                  text primary key,
  completed_onboarding_version   integer not null default 0
                                   check (completed_onboarding_version >= 0),
  onboarding_completed_at        timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create table if not exists pro_workspaces (
  storefront_slug       text primary key references briefs(slug) on delete cascade,
  foundation            text not null check (foundation in ('structure','motion','bespoke')),
  preferred_mode        text not null default 'pro' check (preferred_mode in ('easy','pro')),
  draft_source          text not null default '',
  draft_source_hash     text not null,
  draft_version         bigint not null default 1 check (draft_version > 0),
  built_revision        text,
  built_blob_url        text,
  built_source          text,
  built_source_hash     text,
  built_source_version  bigint,
  build_status          text not null default 'idle'
                          check (build_status in (
                            'idle','queued','generating','validating','building',
                            'repairing','succeeded','failed'
                          )),
  last_error_code       text,
  last_error_message    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (
    (built_revision is null and built_blob_url is null and built_source is null and built_source_hash is null and built_source_version is null)
    or
    (built_revision is not null and built_blob_url is not null and built_source is not null and built_source_hash is not null and built_source_version is not null)
  )
);

create table if not exists pro_jobs (
  id                  uuid primary key default gen_random_uuid(),
  storefront_slug     text not null references pro_workspaces(storefront_slug) on delete cascade,
  clerk_user_id       text not null,
  kind                text not null check (kind in (
                        'foundation_build','bespoke_generate','manual_build','ai_edit'
                      )),
  status              text not null default 'queued' check (status in (
                        'queued','generating','validating','building',
                        'repairing','succeeded','failed'
                      )),
  foundation          text check (foundation in ('structure','motion','bespoke')),
  expected_version    bigint not null check (expected_version > 0),
  source_hash         text,
  candidate_source    text,
  prompt              text,
  idempotency_key     text not null unique,
  souqy_audit_id      bigint references souqy_audit(id) on delete set null,
  attempts            integer not null default 0 check (attempts >= 0),
  error_code          text,
  error_message       text,
  diagnostics         text,
  revision            text,
  blob_url            text,
  bytes               integer,
  build_ms            integer,
  meta                jsonb not null default '{}'::jsonb,
  lease_token         uuid,
  lease_expires_at    timestamptz,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists pro_jobs_storefront_created_idx
  on pro_jobs (storefront_slug, created_at desc);
create index if not exists pro_jobs_owner_created_idx
  on pro_jobs (clerk_user_id, created_at desc);
create index if not exists pro_jobs_resumable_idx
  on pro_jobs (status, updated_at)
  where status not in ('succeeded','failed');
create unique index if not exists pro_jobs_one_active_per_store_idx
  on pro_jobs (storefront_slug)
  where status not in ('succeeded','failed');

commit;
