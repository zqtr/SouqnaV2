-- Versioned Souqna Pro model preferences, immutable per-job AI configuration,
-- and weighted generation-credit reservations.

begin;

alter table pro_workspaces
  add column if not exists ai_preferences jsonb not null default
    '{"selectedModelId":"alibaba/qwen3.7-plus","catalogVersion":"2026-07-21","models":{"alibaba/qwen3.7-plus":{"reasoning":"medium","speed":"standard"}}}'::jsonb,
  add column if not exists ai_preferences_version bigint not null default 1
    check (ai_preferences_version > 0);

alter table pro_jobs
  add column if not exists ai_model_id text,
  add column if not exists ai_reasoning_level text,
  add column if not exists ai_speed_mode text,
  add column if not exists ai_catalog_version text,
  add column if not exists credit_cost smallint not null default 0,
  add column if not exists request_hash text;

update pro_jobs
set ai_model_id = 'alibaba/qwen3.7-plus',
    ai_reasoning_level = 'medium',
    ai_speed_mode = 'standard',
    ai_catalog_version = '2026-07-21',
    credit_cost = 1
where kind in ('bespoke_generate', 'ai_edit')
  and ai_model_id is null;

alter table pro_jobs
  drop constraint if exists pro_jobs_credit_cost_check,
  add constraint pro_jobs_credit_cost_check check (credit_cost between 0 and 3),
  drop constraint if exists pro_jobs_ai_configuration_check,
  add constraint pro_jobs_ai_configuration_check check (
    (
      kind in ('bespoke_generate', 'ai_edit')
      and ai_model_id is not null
      and ai_reasoning_level in ('low', 'medium', 'high')
      and ai_speed_mode in ('standard', 'fast')
      and ai_catalog_version is not null
      and credit_cost between 1 and 3
    )
    or
    (
      kind in ('foundation_build', 'manual_build')
      and ai_model_id is null
      and ai_reasoning_level is null
      and ai_speed_mode is null
      and ai_catalog_version is null
      and credit_cost = 0
    )
  );

alter table souqy_audit
  add column if not exists credit_cost smallint not null default 0;

update souqy_audit
set credit_cost = 1
where kind in ('generate', 'reprompt')
  and credit_cost = 0;

alter table souqy_audit
  drop constraint if exists souqy_audit_credit_cost_check,
  add constraint souqy_audit_credit_cost_check check (credit_cost between 0 and 3);

create index if not exists souqy_audit_weighted_allowance_idx
  on souqy_audit (clerk_user_id, occurred_at desc)
  where kind in ('generate', 'reprompt')
    and status in ('pending', 'success');

create or replace function prevent_pro_job_ai_configuration_mutation()
returns trigger
language plpgsql
as $$
begin
  if new.ai_model_id is distinct from old.ai_model_id
    or new.ai_reasoning_level is distinct from old.ai_reasoning_level
    or new.ai_speed_mode is distinct from old.ai_speed_mode
    or new.ai_catalog_version is distinct from old.ai_catalog_version
    or new.credit_cost is distinct from old.credit_cost
    or new.request_hash is distinct from old.request_hash then
    raise exception 'Pro job AI configuration is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists pro_jobs_immutable_ai_configuration on pro_jobs;
create trigger pro_jobs_immutable_ai_configuration
before update of
  ai_model_id, ai_reasoning_level, ai_speed_mode,
  ai_catalog_version, credit_cost, request_hash
on pro_jobs
for each row execute function prevent_pro_job_ai_configuration_mutation();

commit;
