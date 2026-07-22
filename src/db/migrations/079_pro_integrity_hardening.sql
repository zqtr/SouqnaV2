-- Reconcile intermediate Pro development databases that may have applied
-- 076/077 before the workspace and consent-version integrity constraints
-- were finalized. Fresh databases already satisfy these definitions.

begin;

alter table pro_jobs
  drop constraint if exists pro_jobs_storefront_slug_fkey;

alter table pro_jobs
  add constraint pro_jobs_storefront_slug_fkey
  foreign key (storefront_slug)
  references pro_workspaces(storefront_slug)
  on delete cascade;

alter table storefront_snapshots
  drop constraint if exists storefront_snapshots_storefront_slug_kind_state_hash_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'storefront_snapshots_store_kind_hash_consent_key'
      and conrelid = 'storefront_snapshots'::regclass
  ) then
    alter table storefront_snapshots
      add constraint storefront_snapshots_store_kind_hash_consent_key
      unique (storefront_slug, kind, state_hash, consent_version);
  end if;
end;
$$;

commit;
