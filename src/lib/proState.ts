import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { db, hasDb } from '@/lib/db';
import { configurationFromJobColumns, isResolvedProAiConfiguration } from '@/lib/pro/aiConfig';
import {
  PRO_AI_CATALOG_VERSION,
  getDefaultProAiPreferences,
  isProAiPreferences,
  isProAiModelId,
  type ProAiConfiguration,
  type ProAiModelPreference,
  type ProAiPreferences,
} from '@/lib/pro/modelCatalog';
import {
  isProEditorMode,
  isProBrandIntent,
  isProTemplateId,
  type ProEditorMode,
  type ProFoundationId,
  type ProJobKind,
  type ProJobSnapshot,
  type ProJobStatus,
  type ProPromptIntent,
  type ProPromptTarget,
  type ProSessionEventSnapshot,
  type ProSessionEventType,
  type ProSessionSnapshot,
  type ProWorkspaceSnapshot,
  type ProBrandIntent,
} from '@/lib/proMode';

type DbWorkspaceRow = {
  storefront_slug: string;
  foundation: string;
  preferred_mode: string;
  draft_source: string;
  draft_source_hash: string;
  draft_version: string | number;
  built_revision: string | null;
  built_blob_url: string | null;
  built_source: string | null;
  built_source_hash: string | null;
  built_source_version: string | number | null;
  build_status: ProWorkspaceSnapshot['buildStatus'];
  last_error_code: string | null;
  last_error_message: string | null;
  ai_preferences: unknown;
  ai_preferences_version: string | number;
  brand_intent: unknown;
  recommendation_version: string | number;
  created_at: string;
  updated_at: string;
};

type DbJobRow = {
  id: string;
  storefront_slug: string;
  clerk_user_id: string;
  kind: ProJobKind;
  status: ProJobStatus;
  foundation: string | null;
  expected_version: string | number;
  source_hash: string | null;
  candidate_source: string | null;
  prompt: string | null;
  idempotency_key: string;
  souqy_audit_id: string | number | null;
  attempts: number;
  error_code: string | null;
  error_message: string | null;
  diagnostics: string | null;
  revision: string | null;
  blob_url: string | null;
  bytes: number | null;
  build_ms: number | null;
  ai_model_id: string | null;
  ai_reasoning_level: string | null;
  ai_speed_mode: string | null;
  ai_catalog_version: string | null;
  credit_cost: number;
  request_hash: string | null;
  meta: unknown;
  lease_token: string | null;
  lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
  session_id: string | null;
};

type DbSessionRow = {
  id: string;
  storefront_slug: string;
  clerk_user_id: string;
  title: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

type DbSessionEventRow = {
  id: string;
  sequence_no: string | number;
  session_id: string;
  event_type: ProSessionEventType;
  content: string | null;
  job_id: string | null;
  revision: string | null;
  metadata: unknown;
  created_at: string;
};

export type ProJobRecord = ProJobSnapshot & {
  clerkUserId: string;
  idempotencyKey: string;
  candidateSource: string | null;
  prompt: string | null;
  souqyAuditId: number | null;
  meta: Record<string, unknown>;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  requestHash: string | null;
  sessionId?: string | null;
};

function asMeta(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function asAiPreferences(value: unknown): ProAiPreferences {
  const fallback = getDefaultProAiPreferences();
  const parsed = asMeta(value);
  const selectedModelId = isProAiModelId(parsed.selectedModelId)
    ? parsed.selectedModelId
    : fallback.selectedModelId;
  const rawModels = asMeta(parsed.models);
  const models: Partial<Record<keyof typeof fallback.models, ProAiModelPreference>> = {};
  for (const [modelId, preference] of Object.entries(rawModels)) {
    if (!isProAiModelId(modelId)) continue;
    const candidate = asMeta(preference);
    const reasoning = candidate.reasoning;
    const speed = candidate.speed;
    if (
      (reasoning === 'low' || reasoning === 'medium' || reasoning === 'high') &&
      (speed === 'standard' || speed === 'fast')
    ) {
      models[modelId] = { reasoning, speed };
    }
  }
  return {
    selectedModelId,
    catalogVersion: PRO_AI_CATALOG_VERSION,
    models: { ...fallback.models, ...models },
  };
}

function fromWorkspace(row: DbWorkspaceRow): ProWorkspaceSnapshot {
  if (!isProTemplateId(row.foundation) || !isProEditorMode(row.preferred_mode)) {
    throw new Error('Invalid Pro workspace row');
  }
  return {
    storefrontSlug: row.storefront_slug,
    foundation: row.foundation,
    preferredMode: row.preferred_mode,
    draftSource: row.draft_source,
    draftSourceHash: row.draft_source_hash,
    draftVersion: Number(row.draft_version),
    builtRevision: row.built_revision,
    builtBlobUrl: row.built_blob_url,
    builtSource: row.built_source,
    builtSourceHash: row.built_source_hash,
    builtSourceVersion: row.built_source_version == null ? null : Number(row.built_source_version),
    buildStatus: row.build_status,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    aiPreferences: asAiPreferences(row.ai_preferences),
    aiPreferencesVersion: Number(row.ai_preferences_version),
    brandIntent: isProBrandIntent(asMeta(row.brand_intent))
      ? (asMeta(row.brand_intent) as ProBrandIntent)
      : null,
    recommendationVersion: Number(row.recommendation_version ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function fromJob(row: DbJobRow): ProJobRecord {
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    clerkUserId: row.clerk_user_id,
    idempotencyKey: row.idempotency_key,
    kind: row.kind,
    status: row.status,
    foundation: isProTemplateId(row.foundation) ? row.foundation : null,
    expectedVersion: Number(row.expected_version),
    sourceHash: row.source_hash,
    candidateSource: row.candidate_source,
    prompt: row.prompt,
    souqyAuditId: row.souqy_audit_id == null ? null : Number(row.souqy_audit_id),
    attempts: row.attempts,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    diagnostics: row.diagnostics,
    revision: row.revision,
    blobUrl: row.blob_url,
    bytes: row.bytes,
    buildMs: row.build_ms,
    configuration: configurationFromJobColumns({
      modelId: row.ai_model_id,
      reasoning: row.ai_reasoning_level,
      speed: row.ai_speed_mode,
      catalogVersion: row.ai_catalog_version,
      creditCost: row.credit_cost,
    }),
    meta: asMeta(row.meta),
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : null,
    requestHash: row.request_hash,
    sessionId: row.session_id ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function fromSession(row: DbSessionRow): ProSessionSnapshot {
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    title: row.title,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function fromSessionEvent(row: DbSessionEventRow): ProSessionEventSnapshot {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.event_type,
    content: row.content,
    jobId: row.job_id,
    revision: row.revision,
    metadata: asMeta(row.metadata),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function publicValidationDiagnostics(job: ProJobRecord): string | null {
  if (job.errorCode !== 'validation_failed' || !job.diagnostics) return null;
  return job.diagnostics
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/gu, '')
    .split('\n')
    .slice(0, 12)
    .join('\n')
    .slice(0, 2_000);
}

/**
 * The only supported job serializer for pages, actions, and API responses.
 * Server-only prompts, source candidates, raw metadata, leases, audit IDs,
 * idempotency material, request hashes, and Clerk IDs are deliberately omitted.
 */
export function toProJobSnapshot(job: ProJobRecord): ProJobSnapshot {
  return {
    id: job.id,
    storefrontSlug: job.storefrontSlug,
    kind: job.kind,
    status: job.status,
    foundation: job.foundation,
    expectedVersion: job.expectedVersion,
    sourceHash: job.sourceHash,
    attempts: job.attempts,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    diagnostics: publicValidationDiagnostics(job),
    revision: job.revision,
    blobUrl: job.blobUrl,
    bytes: job.bytes,
    buildMs: job.buildMs,
    configuration: job.configuration,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function hashProSource(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

export async function getProOnboardingVersion(clerkUserId: string): Promise<number> {
  if (!hasDb()) return 0;
  const rows = (await db()`
    select completed_onboarding_version
    from pro_user_preferences
    where clerk_user_id = ${clerkUserId}
    limit 1
  `) as unknown as Array<{ completed_onboarding_version: number }>;
  return rows[0]?.completed_onboarding_version ?? 0;
}

export async function completeProOnboarding(clerkUserId: string, version: number): Promise<void> {
  if (!hasDb()) throw new Error('Database unavailable');
  await db()`
    insert into pro_user_preferences (
      clerk_user_id, completed_onboarding_version,
      onboarding_completed_at, updated_at
    ) values (${clerkUserId}, ${version}, now(), now())
    on conflict (clerk_user_id) do update set
      completed_onboarding_version = greatest(
        pro_user_preferences.completed_onboarding_version,
        excluded.completed_onboarding_version
      ),
      onboarding_completed_at = case
        when excluded.completed_onboarding_version > pro_user_preferences.completed_onboarding_version
          then excluded.onboarding_completed_at
        else pro_user_preferences.onboarding_completed_at
      end,
      updated_at = now()
  `;
}

export async function getProWorkspace(slug: string): Promise<ProWorkspaceSnapshot | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    select * from pro_workspaces where storefront_slug = ${slug} limit 1
  `) as unknown as DbWorkspaceRow[];
  return rows[0] ? fromWorkspace(rows[0]) : null;
}

export async function getProWorkspacesForOwner(
  clerkUserId: string,
): Promise<Record<string, ProWorkspaceSnapshot>> {
  if (!hasDb()) return {};
  const rows = (await db()`
    select pw.*
    from pro_workspaces pw
    join briefs b on b.slug = pw.storefront_slug
    where b.clerk_user_id = ${clerkUserId}
    order by pw.updated_at desc
  `) as unknown as DbWorkspaceRow[];
  return Object.fromEntries(rows.map((row) => [row.storefront_slug, fromWorkspace(row)]));
}

export async function createProSession(args: {
  slug: string;
  clerkUserId: string;
  title: string;
}): Promise<ProSessionSnapshot> {
  const rows = (await db()`
    insert into pro_sessions (storefront_slug, clerk_user_id, title)
    values (${args.slug}, ${args.clerkUserId}, ${args.title})
    returning *
  `) as unknown as DbSessionRow[];
  const row = rows[0];
  if (!row) throw new Error('Could not create Pro session');
  return fromSession(row);
}

export async function getProSessionForOwner(args: {
  sessionId: string;
  slug: string;
  clerkUserId: string;
}): Promise<ProSessionSnapshot | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    select * from pro_sessions
    where id = ${args.sessionId}::uuid
      and storefront_slug = ${args.slug}
      and clerk_user_id = ${args.clerkUserId}
    limit 1
  `) as unknown as DbSessionRow[];
  return rows[0] ? fromSession(rows[0]) : null;
}

export async function listProSessions(args: {
  slug: string;
  clerkUserId: string;
  includeArchived?: boolean;
  limit?: number;
}): Promise<ProSessionSnapshot[]> {
  if (!hasDb()) return [];
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 80);
  const rows = (await db()`
    select * from pro_sessions
    where storefront_slug = ${args.slug}
      and clerk_user_id = ${args.clerkUserId}
      and (${args.includeArchived === true} or status = 'active')
    order by updated_at desc
    limit ${limit}
  `) as unknown as DbSessionRow[];
  return rows.map(fromSession);
}

export async function listProSessionEvents(args: {
  sessionId: string;
  slug: string;
  clerkUserId: string;
}): Promise<ProSessionEventSnapshot[]> {
  if (!hasDb()) return [];
  const rows = (await db()`
    select e.*
    from pro_session_events e
    join pro_sessions s on s.id = e.session_id
    where e.session_id = ${args.sessionId}::uuid
      and s.storefront_slug = ${args.slug}
      and s.clerk_user_id = ${args.clerkUserId}
    order by e.created_at asc, e.sequence_no asc
  `) as unknown as DbSessionEventRow[];
  return rows.map(fromSessionEvent);
}

export async function recordProSessionEvent(args: {
  sessionId: string;
  type: ProSessionEventType;
  content?: string | null;
  jobId?: string | null;
  revision?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ProSessionEventSnapshot> {
  const rows = (await db()`
    with inserted as (
      insert into pro_session_events (
        session_id, event_type, content, job_id, revision, metadata
      ) values (
        ${args.sessionId}::uuid, ${args.type}, ${args.content ?? null},
        ${args.jobId ?? null}::uuid, ${args.revision ?? null},
        ${JSON.stringify(args.metadata ?? {})}::jsonb
      )
      returning *
    ), touched as (
      update pro_sessions set updated_at = now()
      where id = ${args.sessionId}::uuid
    )
    select * from inserted
  `) as unknown as DbSessionEventRow[];
  const row = rows[0];
  if (!row) throw new Error('Could not record Pro session event');
  return fromSessionEvent(row);
}

export async function renameProSession(args: {
  sessionId: string;
  slug: string;
  clerkUserId: string;
  title: string;
}): Promise<ProSessionSnapshot | null> {
  const rows = (await db()`
    update pro_sessions set title = ${args.title}, updated_at = now()
    where id = ${args.sessionId}::uuid
      and storefront_slug = ${args.slug}
      and clerk_user_id = ${args.clerkUserId}
    returning *
  `) as unknown as DbSessionRow[];
  return rows[0] ? fromSession(rows[0]) : null;
}

export async function setProSessionArchived(args: {
  sessionId: string;
  slug: string;
  clerkUserId: string;
  archived: boolean;
}): Promise<ProSessionSnapshot | null> {
  const rows = (await db()`
    update pro_sessions
    set status = ${args.archived ? 'archived' : 'active'}, updated_at = now()
    where id = ${args.sessionId}::uuid
      and storefront_slug = ${args.slug}
      and clerk_user_id = ${args.clerkUserId}
    returning *
  `) as unknown as DbSessionRow[];
  return rows[0] ? fromSession(rows[0]) : null;
}

export async function initializeProWorkspace(args: {
  slug: string;
  foundation: ProFoundationId;
  source: string;
  expectedVersion: number | null;
  easySnapshotId?: string | null;
  brandIntent?: ProBrandIntent | null;
  recommendationVersion?: number;
}): Promise<
  | { ok: true; workspace: ProWorkspaceSnapshot }
  | { ok: false; reason: 'conflict'; workspace: ProWorkspaceSnapshot | null }
> {
  const sourceHash = hashProSource(args.source);
  const rows = (args.expectedVersion == null
    ? await db()`
        insert into pro_workspaces (
          storefront_slug, foundation, preferred_mode,
          draft_source, draft_source_hash, draft_version,
          build_status, easy_snapshot_id, brand_intent,
          recommendation_version, updated_at
        ) select
          ${args.slug}, ${args.foundation}, 'pro',
          ${args.source}, ${sourceHash}, 1,
          'idle', s.id, ${JSON.stringify(args.brandIntent ?? {})}::jsonb,
          ${args.recommendationVersion ?? 0}, now()
        from storefront_snapshots s
        where s.id = ${args.easySnapshotId ?? null}
          and s.storefront_slug = ${args.slug}
          and s.kind = 'pre_pro_easy'
        on conflict (storefront_slug) do nothing
        returning *
      `
    : await db()`
        update pro_workspaces set
          foundation = ${args.foundation},
          preferred_mode = 'pro',
          draft_source = ${args.source},
          draft_source_hash = ${sourceHash},
          draft_version = draft_version + 1,
          built_revision = null,
          built_blob_url = null,
          built_source = null,
          built_source_hash = null,
          built_source_version = null,
          build_status = 'idle',
          last_error_code = null,
          last_error_message = null,
          updated_at = now()
        where storefront_slug = ${args.slug}
          and draft_version = ${args.expectedVersion}
          and foundation <> ${args.foundation}
        returning *
      `) as unknown as DbWorkspaceRow[];
  if (rows[0]) return { ok: true, workspace: fromWorkspace(rows[0]) };
  return { ok: false, reason: 'conflict', workspace: await getProWorkspace(args.slug) };
}

export async function removeUnstartedProWorkspace(args: {
  slug: string;
  foundation: ProFoundationId;
  easySnapshotId: string;
}): Promise<boolean> {
  const rows = (await db()`
    delete from pro_workspaces w
    where w.storefront_slug = ${args.slug}
      and w.foundation = ${args.foundation}
      and w.easy_snapshot_id = ${args.easySnapshotId}
      and w.draft_version = 1
      and w.built_revision is null
      and not exists (
        select 1 from pro_jobs j where j.storefront_slug = w.storefront_slug
      )
    returning w.storefront_slug
  `) as unknown as Array<{ storefront_slug: string }>;
  return rows.length > 0;
}

export async function setProWorkspaceMode(
  slug: string,
  mode: ProEditorMode,
): Promise<ProWorkspaceSnapshot | null> {
  const rows = (await db()`
    update pro_workspaces
    set preferred_mode = ${mode}, updated_at = now()
    where storefront_slug = ${slug}
    returning *
  `) as unknown as DbWorkspaceRow[];
  return rows[0] ? fromWorkspace(rows[0]) : null;
}

export async function saveProWorkspaceDraft(args: {
  slug: string;
  source: string;
  expectedVersion: number;
}): Promise<
  | { ok: true; workspace: ProWorkspaceSnapshot }
  | { ok: false; reason: 'conflict'; workspace: ProWorkspaceSnapshot | null }
> {
  const sourceHash = hashProSource(args.source);
  const rows = (await db()`
    update pro_workspaces set
      draft_source = ${args.source},
      draft_source_hash = ${sourceHash},
      draft_version = draft_version + 1,
      build_status = case
        when built_source_hash = ${sourceHash} then 'succeeded'
        else 'idle'
      end,
      last_error_code = null,
      last_error_message = null,
      updated_at = now()
    where storefront_slug = ${args.slug}
      and draft_version = ${args.expectedVersion}
      and draft_source is distinct from ${args.source}
    returning *
  `) as unknown as DbWorkspaceRow[];
  if (rows[0]) return { ok: true, workspace: fromWorkspace(rows[0]) };
  const workspace = await getProWorkspace(args.slug);
  if (workspace?.draftVersion === args.expectedVersion && workspace.draftSource === args.source) {
    return { ok: true, workspace };
  }
  return { ok: false, reason: 'conflict', workspace };
}

export async function saveProAiPreferences(args: {
  slug: string;
  preferences: ProAiPreferences;
  expectedPreferencesVersion: number;
}): Promise<
  | { ok: true; workspace: ProWorkspaceSnapshot }
  | { ok: false; reason: 'conflict'; workspace: ProWorkspaceSnapshot | null }
> {
  if (!isProAiPreferences(args.preferences)) throw new Error('Invalid Pro AI preferences');
  const rows = (await db()`
    update pro_workspaces set
      ai_preferences = ${JSON.stringify(args.preferences)}::jsonb,
      ai_preferences_version = ai_preferences_version + 1,
      updated_at = now()
    where storefront_slug = ${args.slug}
      and ai_preferences_version = ${args.expectedPreferencesVersion}
    returning *
  `) as unknown as DbWorkspaceRow[];
  if (rows[0]) return { ok: true, workspace: fromWorkspace(rows[0]) };
  return { ok: false, reason: 'conflict', workspace: await getProWorkspace(args.slug) };
}

export async function createProJob(args: {
  slug: string;
  clerkUserId: string;
  kind: ProJobKind;
  foundation?: ProFoundationId | null;
  expectedVersion: number;
  sourceHash?: string | null;
  candidateSource?: string | null;
  prompt?: string | null;
  idempotencyKey: string;
  configuration?: ProAiConfiguration | null;
  requestHash?: string | null;
  sessionId?: string | null;
}): Promise<{ job: ProJobRecord; created: boolean }> {
  if (args.configuration && !isResolvedProAiConfiguration(args.configuration)) {
    throw new Error('Invalid Pro AI configuration');
  }
  const rows = (await db()`
    with workspace_guard as materialized (
      select pw.storefront_slug
      from pro_workspaces pw
      where pw.storefront_slug = ${args.slug}
        and pw.draft_version = ${args.expectedVersion}
        and (
          ${args.sourceHash ?? null}::text is null
          or pw.draft_source_hash = ${args.sourceHash ?? null}
        )
      for update of pw
    ), session_guard as materialized (
      select s.id
      from pro_sessions s
      where s.id = ${args.sessionId ?? null}::uuid
        and s.storefront_slug = ${args.slug}
        and s.clerk_user_id = ${args.clerkUserId}
        and s.status = 'active'
    ), idempotent_job as materialized (
      select j.*
      from pro_jobs j
      where j.idempotency_key = ${args.idempotencyKey}
        and j.clerk_user_id = ${args.clerkUserId}
      limit 1
    ), active_job as materialized (
      select j.*
      from pro_jobs j
      where j.storefront_slug = ${args.slug}
        and j.status not in ('succeeded', 'failed')
        and not exists (select 1 from idempotent_job)
      order by j.created_at desc
      limit 1
    ), job_insert as (
      insert into pro_jobs (
        storefront_slug, clerk_user_id, kind, foundation,
        expected_version, source_hash, candidate_source,
        prompt, idempotency_key,
        ai_model_id, ai_reasoning_level, ai_speed_mode,
        ai_catalog_version, credit_cost, request_hash, session_id
      )
      select
        ${args.slug}, ${args.clerkUserId}, ${args.kind}, ${args.foundation ?? null},
        ${args.expectedVersion}, ${args.sourceHash ?? null}, ${args.candidateSource ?? null},
        ${args.prompt ?? null}, ${args.idempotencyKey},
        ${args.configuration?.modelId ?? null}, ${args.configuration?.reasoning ?? null},
        ${args.configuration?.speed ?? null}, ${args.configuration?.catalogVersion ?? null},
        ${args.configuration?.creditCost ?? 0}, ${args.requestHash ?? null},
        (select id from session_guard limit 1)
      from workspace_guard
      where not exists (select 1 from idempotent_job)
        and not exists (select 1 from active_job)
        and (
          ${args.sessionId ?? null}::uuid is null
          or exists (select 1 from session_guard)
        )
      on conflict do nothing
      returning *
    ), workspace_update as (
      update pro_workspaces pw set
        build_status = 'queued',
        last_error_code = null,
        last_error_message = null,
        updated_at = now()
      from job_insert j
      where pw.storefront_slug = j.storefront_slug
        and pw.draft_version = j.expected_version
      returning pw.storefront_slug
    ), session_event as (
      insert into pro_session_events (
        session_id, event_type, content, job_id, metadata
      )
      select
        j.session_id, 'job', null, j.id,
        jsonb_build_object('kind', j.kind)
      from job_insert j
      where j.session_id is not null
      returning session_id
    ), session_touch as (
      update pro_sessions s set updated_at = now()
      from session_event e
      where s.id = e.session_id
      returning s.id
    )
    select
      case
        when exists (select 1 from job_insert) then 'created'
        when exists (select 1 from idempotent_job) then 'existing'
        when not exists (select 1 from workspace_guard) then 'workspace_conflict'
        when exists (select 1 from active_job) then 'active_job'
        else 'conflict'
      end as result,
      coalesce(
        (select to_jsonb(j) from job_insert j limit 1),
        (select to_jsonb(j) from idempotent_job j limit 1),
        (select to_jsonb(j) from active_job j limit 1)
      ) as job
  `) as unknown as Array<{
    result: 'created' | 'existing' | 'workspace_conflict' | 'active_job' | 'conflict';
    job: DbJobRow | null;
  }>;
  const outcome = rows[0];
  if (!outcome?.job) {
    throw new Error(
      outcome?.result === 'workspace_conflict'
        ? 'Pro workspace changed before the job could start'
        : 'Could not create Pro job',
    );
  }
  return { job: fromJob(outcome.job), created: outcome.result === 'created' };
}

export type ProCreditJobResult =
  | { ok: true; job: ProJobRecord; created: boolean }
  | {
      ok: false;
      reason: 'quota_exceeded' | 'active_job' | 'workspace_conflict';
      job: ProJobRecord | null;
    };

/**
 * Serializes weighted reservations per Clerk user and creates the pending
 * audit row and Pro job in one Postgres statement. Failed audit statuses are
 * excluded from usage, so terminal failures release their reservation.
 */
export async function createProAiJobWithCreditReservation(args: {
  slug: string;
  clerkUserId: string;
  kind: 'bespoke_generate' | 'ai_edit';
  foundation: ProFoundationId;
  expectedVersion: number;
  expectedWorkspaceHash: string;
  sourceHash: string | null;
  prompt: string | null;
  target?: ProPromptTarget | null;
  intent?: ProPromptIntent | null;
  idempotencyKey: string;
  requestHash: string;
  configuration: ProAiConfiguration;
  monthlyCap: number;
  sessionId?: string | null;
}): Promise<ProCreditJobResult> {
  if (!isResolvedProAiConfiguration(args.configuration)) {
    throw new Error('Invalid Pro AI configuration');
  }
  const auditKind = args.kind === 'ai_edit' ? 'reprompt' : 'generate';
  try {
    const rows = (await db()`
      with user_lock as materialized (
        select pg_advisory_xact_lock(hashtextextended(${args.clerkUserId}, 90427))
      ), workspace_guard as materialized (
        select pw.storefront_slug
        from pro_workspaces pw
        cross join user_lock
        where pw.storefront_slug = ${args.slug}
          and pw.draft_version = ${args.expectedVersion}
          and pw.draft_source_hash = ${args.expectedWorkspaceHash}
        for update of pw
      ), session_guard as materialized (
        select s.id
        from pro_sessions s
        cross join user_lock
        where s.id = ${args.sessionId ?? null}::uuid
          and s.storefront_slug = ${args.slug}
          and s.clerk_user_id = ${args.clerkUserId}
          and s.status = 'active'
      ), idempotent_job as materialized (
        select j.*
        from pro_jobs j
        cross join user_lock
        where j.idempotency_key = ${args.idempotencyKey}
          and j.clerk_user_id = ${args.clerkUserId}
        limit 1
      ), active_job as materialized (
        select j.*
        from pro_jobs j
        cross join user_lock
        where j.storefront_slug = ${args.slug}
          and j.status not in ('succeeded', 'failed')
          and not exists (select 1 from idempotent_job)
        order by j.created_at desc
        limit 1
      ), monthly_usage as materialized (
        select coalesce(sum(a.credit_cost), 0)::int as used
        from souqy_audit a
        cross join user_lock
        where a.clerk_user_id = ${args.clerkUserId}
          and a.kind in ('generate', 'reprompt')
          and a.status in ('pending', 'success')
          and a.occurred_at >= date_trunc('month', now())
      ), audit_insert as (
        insert into souqy_audit (
          clerk_user_id, storefront, kind, status,
          prompt, source, meta, credit_cost
        )
        select
          ${args.clerkUserId}, ${args.slug}, ${auditKind}, 'pending',
          ${args.prompt}, null,
          ${JSON.stringify({
            surface: 'pro',
            catalogVersion: args.configuration.catalogVersion,
            modelId: args.configuration.modelId,
            reasoning: args.configuration.reasoning,
            speed: args.configuration.speed,
            target: args.target ?? null,
            intent: args.intent ?? null,
          })}::jsonb,
          ${args.configuration.creditCost}
        from monthly_usage
        cross join workspace_guard
        where not exists (select 1 from idempotent_job)
          and not exists (select 1 from active_job)
          and (
            ${args.sessionId ?? null}::uuid is null
            or exists (select 1 from session_guard)
          )
          and monthly_usage.used + ${args.configuration.creditCost} <= ${args.monthlyCap}
        returning id
      ), job_insert as (
        insert into pro_jobs (
          storefront_slug, clerk_user_id, kind, foundation,
          expected_version, source_hash, prompt, idempotency_key,
          souqy_audit_id, ai_model_id, ai_reasoning_level,
          ai_speed_mode, ai_catalog_version, credit_cost, request_hash, meta, session_id
        )
        select
          ${args.slug}, ${args.clerkUserId}, ${args.kind}, ${args.foundation},
          ${args.expectedVersion}, ${args.sourceHash}, ${args.prompt}, ${args.idempotencyKey},
          audit_insert.id, ${args.configuration.modelId}, ${args.configuration.reasoning},
          ${args.configuration.speed}, ${args.configuration.catalogVersion},
          ${args.configuration.creditCost}, ${args.requestHash},
          ${JSON.stringify({
            expectedWorkspaceHash: args.expectedWorkspaceHash,
            target: args.target ?? null,
            intent: args.intent ?? null,
          })}::jsonb,
          (select id from session_guard limit 1)
        from audit_insert
        where ${args.sessionId ?? null}::uuid is null
          or exists (select 1 from session_guard)
        returning *
      ), workspace_update as (
        update pro_workspaces pw set
          build_status = 'queued',
          last_error_code = null,
          last_error_message = null,
          updated_at = now()
        from job_insert j
        where pw.storefront_slug = j.storefront_slug
          and pw.draft_version = j.expected_version
        returning pw.storefront_slug
      ), session_events as (
        insert into pro_session_events (
          session_id, event_type, content, job_id, metadata
        )
        select
          j.session_id,
          event.event_type,
          event.content,
          event.job_id,
          event.metadata
        from job_insert j
        cross join lateral (
          values
            (
              1,
              'user_prompt'::text,
              ${args.prompt},
              null::uuid,
              jsonb_build_object(
                'modelId', ${args.configuration.modelId}::text,
                'reasoning', ${args.configuration.reasoning}::text,
                'target', ${args.target ?? null}::text,
                'intent', ${args.intent ?? null}::text
              )
            ),
            (
              2,
              'job'::text,
              null::text,
              j.id,
              jsonb_build_object('kind', j.kind)
            )
        ) as event(ordinal, event_type, content, job_id, metadata)
        where j.session_id is not null
        order by event.ordinal
        returning session_id
      ), session_touch as (
        update pro_sessions s set updated_at = now()
        where s.id in (select session_id from session_events)
        returning s.id
      )
      select
        case
          when exists (select 1 from job_insert) then 'created'
          when exists (select 1 from idempotent_job) then 'existing'
          when not exists (select 1 from workspace_guard) then 'workspace_conflict'
          when ${args.sessionId ?? null}::uuid is not null
            and not exists (select 1 from session_guard) then 'workspace_conflict'
          when exists (select 1 from active_job) then 'active_job'
          else 'quota_exceeded'
        end as result,
        coalesce(
          (select to_jsonb(j) from job_insert j limit 1),
          (select to_jsonb(j) from idempotent_job j limit 1),
          (select to_jsonb(j) from active_job j limit 1)
        ) as job
    `) as unknown as Array<{
      result: 'created' | 'existing' | 'workspace_conflict' | 'active_job' | 'quota_exceeded';
      job: DbJobRow | null;
    }>;
    const outcome = rows[0];
    if (!outcome) throw new Error('Could not reserve Souqy Pro credits');
    if (outcome.result === 'created' || outcome.result === 'existing') {
      if (!outcome.job) throw new Error('Pro job was not returned');
      const job = fromJob(outcome.job);
      return { ok: true, job, created: outcome.result === 'created' };
    }
    return {
      ok: false,
      reason: outcome.result,
      job: outcome.job ? fromJob(outcome.job) : null,
    };
  } catch (caught) {
    const active = (await db()`
      select * from pro_jobs
      where storefront_slug = ${args.slug}
        and status not in ('succeeded', 'failed')
      order by created_at desc
      limit 1
    `) as unknown as DbJobRow[];
    if (active[0]) return { ok: false, reason: 'active_job', job: fromJob(active[0]) };
    throw caught;
  }
}

export async function supersedeActiveProJobs(slug: string, clerkUserId: string): Promise<number[]> {
  const rows = (await db()`
    with failed_jobs as (
      update pro_jobs set
        status = 'failed',
        error_code = 'superseded',
        error_message = 'This job was replaced by a newer Pro foundation.',
        lease_token = null,
        lease_expires_at = null,
        finished_at = now(),
        updated_at = now()
      where storefront_slug = ${slug}
        and clerk_user_id = ${clerkUserId}
        and status not in ('succeeded','failed')
      returning souqy_audit_id
    ), released_audits as (
      update souqy_audit a set
        status = 'build_failed',
        meta = coalesce(a.meta, '{}'::jsonb) || jsonb_build_object(
          'surface', 'pro', 'errorCode', 'superseded'
        )
      from failed_jobs j
      where a.id = j.souqy_audit_id
        and a.status = 'pending'
      returning a.id
    )
    select j.souqy_audit_id
    from failed_jobs j
    left join released_audits a on a.id = j.souqy_audit_id
  `) as unknown as Array<{ souqy_audit_id: string | number | null }>;
  return rows.flatMap((row) => (row.souqy_audit_id == null ? [] : [Number(row.souqy_audit_id)]));
}

export async function attachProJobAudit(jobId: string, auditId: number): Promise<void> {
  await db()`
    update pro_jobs set souqy_audit_id = ${auditId}, updated_at = now()
    where id = ${jobId}
  `;
}

export async function getProJob(jobId: string): Promise<ProJobRecord | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    select * from pro_jobs where id = ${jobId} limit 1
  `) as unknown as DbJobRow[];
  return rows[0] ? fromJob(rows[0]) : null;
}

export async function getLatestProJob(slug: string): Promise<ProJobSnapshot | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    select * from pro_jobs
    where storefront_slug = ${slug}
    order by created_at desc
    limit 1
  `) as unknown as DbJobRow[];
  return rows[0] ? toProJobSnapshot(fromJob(rows[0])) : null;
}

export async function getLatestProJobForSession(args: {
  sessionId: string;
  slug: string;
  clerkUserId: string;
}): Promise<ProJobSnapshot | null> {
  if (!hasDb()) return null;
  const rows = (await db()`
    select j.*
    from pro_jobs j
    join pro_sessions s on s.id = j.session_id
    where j.session_id = ${args.sessionId}::uuid
      and s.storefront_slug = ${args.slug}
      and s.clerk_user_id = ${args.clerkUserId}
    order by j.created_at desc
    limit 1
  `) as unknown as DbJobRow[];
  return rows[0] ? toProJobSnapshot(fromJob(rows[0])) : null;
}

export async function listEarlierProJobs(args: {
  slug: string;
  clerkUserId: string;
  limit?: number;
}): Promise<ProJobSnapshot[]> {
  if (!hasDb()) return [];
  const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
  const rows = (await db()`
    select *
    from pro_jobs
    where storefront_slug = ${args.slug}
      and clerk_user_id = ${args.clerkUserId}
      and session_id is null
    order by created_at desc
    limit ${limit}
  `) as unknown as DbJobRow[];
  return rows.map((row) => toProJobSnapshot(fromJob(row)));
}

export async function claimProJob(
  jobId: string,
  clerkUserId: string,
): Promise<ProJobRecord | null> {
  const leaseToken = randomUUID();
  const rows = (await db()`
    update pro_jobs set
      lease_token = ${leaseToken},
      lease_expires_at = now() + interval '6 minutes',
      attempts = attempts + 1,
      started_at = coalesce(started_at, now()),
      updated_at = now()
    where id = ${jobId}
      and clerk_user_id = ${clerkUserId}
      and status not in ('succeeded','failed')
      and (lease_expires_at is null or lease_expires_at < now())
    returning *
  `) as unknown as DbJobRow[];
  return rows[0] ? fromJob(rows[0]) : null;
}

export async function advanceProJob(args: {
  jobId: string;
  leaseToken: string;
  expectedStatus: ProJobStatus;
  nextStatus: ProJobStatus;
}): Promise<ProJobRecord | null> {
  const rows = (await db()`
    update pro_jobs set
      status = ${args.nextStatus},
      lease_token = null,
      lease_expires_at = null,
      updated_at = now()
    where id = ${args.jobId}
      and lease_token = ${args.leaseToken}::uuid
      and status = ${args.expectedStatus}
    returning *
  `) as unknown as DbJobRow[];
  if (rows[0]) {
    await setProWorkspaceBuildStatus(
      rows[0].storefront_slug,
      args.nextStatus,
      Number(rows[0].expected_version),
    );
    return fromJob(rows[0]);
  }
  return null;
}

export async function storeProJobCandidate(args: {
  jobId: string;
  leaseToken: string;
  expectedStatus: ProJobStatus;
  source: string;
  nextStatus?: ProJobStatus;
  meta?: Record<string, unknown>;
}): Promise<ProJobRecord | null> {
  const sourceHash = hashProSource(args.source);
  const nextStatus = args.nextStatus ?? 'validating';
  const rows = (await db()`
    update pro_jobs set
      candidate_source = ${args.source},
      source_hash = ${sourceHash},
      status = ${nextStatus},
      meta = meta || ${JSON.stringify(args.meta ?? {})}::jsonb,
      lease_token = null,
      lease_expires_at = null,
      error_code = null,
      error_message = null,
      diagnostics = null,
      updated_at = now()
    where id = ${args.jobId}
      and lease_token = ${args.leaseToken}::uuid
      and status = ${args.expectedStatus}
    returning *
  `) as unknown as DbJobRow[];
  if (rows[0]) {
    await setProWorkspaceBuildStatus(
      rows[0].storefront_slug,
      nextStatus,
      Number(rows[0].expected_version),
    );
    return fromJob(rows[0]);
  }
  return null;
}

export async function prepareProJobRepair(args: {
  jobId: string;
  leaseToken: string;
  diagnostics: string;
}): Promise<ProJobRecord | null> {
  const rows = (await db()`
    update pro_jobs set
      status = 'repairing',
      diagnostics = ${args.diagnostics.slice(0, 4000)},
      meta = jsonb_set(
        meta,
        '{repairCount}',
        to_jsonb(coalesce((meta->>'repairCount')::integer, 0) + 1),
        true
      ),
      lease_token = null,
      lease_expires_at = null,
      updated_at = now()
    where id = ${args.jobId}
      and lease_token = ${args.leaseToken}::uuid
      and status = 'building'
    returning *
  `) as unknown as DbJobRow[];
  if (rows[0]) {
    await setProWorkspaceBuildStatus(
      rows[0].storefront_slug,
      'repairing',
      Number(rows[0].expected_version),
    );
    return fromJob(rows[0]);
  }
  return null;
}

export async function failProJob(args: {
  jobId: string;
  leaseToken?: string | null;
  code: string;
  message: string;
  diagnostics?: string | null;
}): Promise<ProJobRecord | null> {
  const auditStatus = args.code === 'validation_failed' ? 'validation_failed' : 'build_failed';
  const rows = args.leaseToken
    ? ((await db()`
        with failed_job as (
          update pro_jobs set
            status = 'failed', error_code = ${args.code}::text,
            error_message = ${args.message}::text, diagnostics = ${args.diagnostics ?? null}::text,
            meta = jsonb_set(meta, '{resumeStatus}', to_jsonb(status::text), true),
            lease_token = null, lease_expires_at = null,
            finished_at = now(), updated_at = now()
          where id = ${args.jobId}
            and lease_token = ${args.leaseToken}::uuid
            and lease_expires_at > now()
          returning *
        ), released_audit as (
          update souqy_audit a set
            status = ${auditStatus}::text,
            meta = coalesce(a.meta, '{}'::jsonb) || jsonb_build_object(
              'surface', 'pro', 'errorCode', ${args.code}::text
            )
          from failed_job j
          where a.id = j.souqy_audit_id
            and a.status = 'pending'
          returning a.id
        ), workspace_update as (
          update pro_workspaces w set
            build_status = 'failed',
            last_error_code = ${args.code},
            last_error_message = ${args.message},
            updated_at = now()
          from failed_job j
          where w.storefront_slug = j.storefront_slug
            and w.draft_version = j.expected_version
          returning w.storefront_slug
        ), session_event as (
          insert into pro_session_events (
            session_id, event_type, content, job_id, metadata
          )
          select
            j.session_id, 'error', ${args.message}, j.id,
            jsonb_build_object('errorCode', ${args.code}::text)
          from failed_job j
          where j.session_id is not null
          returning session_id
        ), session_touch as (
          update pro_sessions s set updated_at = now()
          where s.id in (select session_id from session_event)
          returning s.id
        )
        select j.*
        from failed_job j
        left join released_audit on true
      `) as unknown as DbJobRow[])
    : ((await db()`
        with failed_job as (
          update pro_jobs set
            status = 'failed', error_code = ${args.code}::text,
            error_message = ${args.message}::text, diagnostics = ${args.diagnostics ?? null}::text,
            meta = jsonb_set(meta, '{resumeStatus}', to_jsonb(status::text), true),
            lease_token = null, lease_expires_at = null,
            finished_at = now(), updated_at = now()
          where id = ${args.jobId}
          returning *
        ), released_audit as (
          update souqy_audit a set
            status = ${auditStatus}::text,
            meta = coalesce(a.meta, '{}'::jsonb) || jsonb_build_object(
              'surface', 'pro', 'errorCode', ${args.code}::text
            )
          from failed_job j
          where a.id = j.souqy_audit_id
            and a.status = 'pending'
          returning a.id
        ), workspace_update as (
          update pro_workspaces w set
            build_status = 'failed',
            last_error_code = ${args.code},
            last_error_message = ${args.message},
            updated_at = now()
          from failed_job j
          where w.storefront_slug = j.storefront_slug
            and w.draft_version = j.expected_version
          returning w.storefront_slug
        ), session_event as (
          insert into pro_session_events (
            session_id, event_type, content, job_id, metadata
          )
          select
            j.session_id, 'error', ${args.message}, j.id,
            jsonb_build_object('errorCode', ${args.code}::text)
          from failed_job j
          where j.session_id is not null
          returning session_id
        ), session_touch as (
          update pro_sessions s set updated_at = now()
          where s.id in (select session_id from session_event)
          returning s.id
        )
        select j.*
        from failed_job j
        left join released_audit on true
      `) as unknown as DbJobRow[]);
  if (!rows[0]) return null;
  return fromJob(rows[0]);
}

async function setProWorkspaceBuildStatus(
  slug: string,
  status: ProJobStatus,
  expectedVersion: number,
): Promise<void> {
  await db()`
    update pro_workspaces set build_status = ${status}, updated_at = now()
    where storefront_slug = ${slug}
      and draft_version = ${expectedVersion}
  `;
}

export async function completeProJob(args: {
  job: ProJobRecord;
  leaseToken: string;
  source: string;
  revision: string;
  blobUrl: string;
  bytes: number;
  buildMs: number;
  applyCandidate: boolean;
}): Promise<ProWorkspaceSnapshot | null> {
  const sourceHash = hashProSource(args.source);
  const workspaceRows = (args.applyCandidate
    ? await db()`
        with eligible_job as materialized (
          select j.id, j.storefront_slug, j.expected_version
          from pro_jobs j
          where j.id = ${args.job.id}
            and j.lease_token = ${args.leaseToken}::uuid
            and j.lease_expires_at > now()
            and j.status = 'building'
            and j.storefront_slug = ${args.job.storefrontSlug}
            and j.expected_version = ${args.job.expectedVersion}
            and j.source_hash = ${sourceHash}
            and j.kind in ('bespoke_generate', 'ai_edit')
          for update
        ), updated_workspace as (
          update pro_workspaces w set
            draft_source = ${args.source},
            draft_source_hash = ${sourceHash},
            draft_version = w.draft_version + 1,
            built_revision = ${args.revision},
            built_blob_url = ${args.blobUrl},
            built_source = ${args.source},
            built_source_hash = ${sourceHash},
            built_source_version = w.draft_version + 1,
            build_status = 'succeeded',
            last_error_code = null,
            last_error_message = null,
            updated_at = now()
          from eligible_job j
          where w.storefront_slug = j.storefront_slug
            and w.draft_version = j.expected_version
          returning w.*
        ), completed_job as (
          update pro_jobs j set
            status = 'succeeded',
            source_hash = ${sourceHash},
            revision = ${args.revision},
            blob_url = ${args.blobUrl},
            bytes = ${args.bytes},
            build_ms = ${args.buildMs},
            lease_token = null,
            lease_expires_at = null,
            error_code = null,
            error_message = null,
            diagnostics = null,
            finished_at = now(),
            updated_at = now()
          from eligible_job eligible
          where j.id = eligible.id
            and j.lease_token = ${args.leaseToken}::uuid
            and j.lease_expires_at > now()
            and j.status = 'building'
            and exists (select 1 from updated_workspace)
          returning j.id, j.session_id, j.kind
        ), session_event as (
          insert into pro_session_events (
            session_id, event_type, content, job_id, revision, metadata
          )
          select
            j.session_id, 'souqy_response', null, j.id, ${args.revision},
            jsonb_build_object('kind', j.kind)
          from completed_job j
          where j.session_id is not null
          returning session_id
        ), session_touch as (
          update pro_sessions s set updated_at = now()
          where s.id in (select session_id from session_event)
          returning s.id
        )
        select w.*
        from updated_workspace w
        cross join completed_job
      `
    : await db()`
        with eligible_job as materialized (
          select j.id, j.storefront_slug, j.expected_version
          from pro_jobs j
          where j.id = ${args.job.id}
            and j.lease_token = ${args.leaseToken}::uuid
            and j.lease_expires_at > now()
            and j.status = 'building'
            and j.storefront_slug = ${args.job.storefrontSlug}
            and j.expected_version = ${args.job.expectedVersion}
            and j.source_hash = ${sourceHash}
            and j.kind not in ('bespoke_generate', 'ai_edit')
          for update
        ), updated_workspace as (
          update pro_workspaces w set
            built_revision = ${args.revision},
            built_blob_url = ${args.blobUrl},
            built_source = ${args.source},
            built_source_hash = ${sourceHash},
            built_source_version = w.draft_version,
            build_status = 'succeeded',
            last_error_code = null,
            last_error_message = null,
            updated_at = now()
          from eligible_job j
          where w.storefront_slug = j.storefront_slug
            and w.draft_version = j.expected_version
            and w.draft_source_hash = ${sourceHash}
          returning w.*
        ), completed_job as (
          update pro_jobs j set
            status = 'succeeded',
            source_hash = ${sourceHash},
            revision = ${args.revision},
            blob_url = ${args.blobUrl},
            bytes = ${args.bytes},
            build_ms = ${args.buildMs},
            lease_token = null,
            lease_expires_at = null,
            error_code = null,
            error_message = null,
            diagnostics = null,
            finished_at = now(),
            updated_at = now()
          from eligible_job eligible
          where j.id = eligible.id
            and j.lease_token = ${args.leaseToken}::uuid
            and j.lease_expires_at > now()
            and j.status = 'building'
            and exists (select 1 from updated_workspace)
          returning j.id, j.session_id, j.kind
        ), session_event as (
          insert into pro_session_events (
            session_id, event_type, content, job_id, revision, metadata
          )
          select
            j.session_id, 'souqy_response', null, j.id, ${args.revision},
            jsonb_build_object('kind', j.kind)
          from completed_job j
          where j.session_id is not null
          returning session_id
        ), session_touch as (
          update pro_sessions s set updated_at = now()
          where s.id in (select session_id from session_event)
          returning s.id
        )
        select w.*
        from updated_workspace w
        cross join completed_job
      `) as unknown as DbWorkspaceRow[];

  if (!workspaceRows[0]) {
    await failProJob({
      jobId: args.job.id,
      leaseToken: args.leaseToken,
      code: 'workspace_conflict',
      message: 'The Pro draft changed while this build was running. Build the latest version.',
    });
    return null;
  }

  return fromWorkspace(workspaceRows[0]);
}

export async function retryProJob(
  jobId: string,
  clerkUserId: string,
): Promise<ProJobRecord | null> {
  const rows = (await db()`
    with idempotent_retry as materialized (
      select j.*
      from pro_jobs j
      where j.id = ${jobId}
        and j.clerk_user_id = ${clerkUserId}
        and j.status not in ('succeeded', 'failed')
        and j.kind not in ('bespoke_generate', 'ai_edit')
      limit 1
    ), target as materialized (
      select j.*
      from pro_jobs j
      where j.id = ${jobId}
        and j.clerk_user_id = ${clerkUserId}
        and j.status = 'failed'
        and j.kind not in ('bespoke_generate', 'ai_edit')
      limit 1
      for update of j
    ), workspace_guard as materialized (
      select pw.storefront_slug
      from pro_workspaces pw
      join target t on t.storefront_slug = pw.storefront_slug
      where pw.draft_version = t.expected_version
        and (t.source_hash is null or pw.draft_source_hash = t.source_hash)
      for update of pw
    ), active_job as materialized (
      select j.id
      from pro_jobs j
      join target t on t.storefront_slug = j.storefront_slug
      where j.status not in ('succeeded', 'failed')
        and j.id <> t.id
      limit 1
    ), job_update as (
      update pro_jobs j set
        status = case
          when j.meta->>'resumeStatus' in ('generating','validating','building','repairing')
            then j.meta->>'resumeStatus'
          else 'queued'
        end,
        error_code = null,
        error_message = null,
        diagnostics = null,
        meta = jsonb_set(j.meta - 'resumeStatus', '{repairCount}', '0'::jsonb, true),
        lease_token = null,
        lease_expires_at = null,
        finished_at = null,
        updated_at = now()
      from target t
      cross join workspace_guard
      where j.id = t.id
        and not exists (select 1 from active_job)
      returning j.*
    ), workspace_update as (
      update pro_workspaces pw set
        build_status = j.status,
        last_error_code = null,
        last_error_message = null,
        updated_at = now()
      from job_update j
      where pw.storefront_slug = j.storefront_slug
        and pw.draft_version = j.expected_version
      returning pw.storefront_slug
    )
    select coalesce(
      (select to_jsonb(j) from job_update j limit 1),
      (select to_jsonb(j) from idempotent_retry j limit 1)
    ) as job
  `) as unknown as Array<{ job: DbJobRow | null }>;
  return rows[0]?.job ? fromJob(rows[0].job) : null;
}

export async function retryProAiJobWithCreditReservation(args: {
  jobId: string;
  clerkUserId: string;
  monthlyCap: number;
}): Promise<ProCreditJobResult | { ok: false; reason: 'not_retryable'; job: null }> {
  const rows = (await db()`
    with user_lock as materialized (
      select pg_advisory_xact_lock(hashtextextended(${args.clerkUserId}, 90427))
    ), idempotent_retry as materialized (
      select j.*
      from pro_jobs j
      cross join user_lock
      where j.id = ${args.jobId}
        and j.clerk_user_id = ${args.clerkUserId}
        and j.status not in ('succeeded', 'failed')
        and j.kind in ('bespoke_generate', 'ai_edit')
        and j.credit_cost between 1 and 3
      limit 1
    ), target as materialized (
      select j.*
      from pro_jobs j
      cross join user_lock
      where j.id = ${args.jobId}
        and j.clerk_user_id = ${args.clerkUserId}
        and j.status = 'failed'
        and j.kind in ('bespoke_generate', 'ai_edit')
        and j.credit_cost between 1 and 3
      limit 1
      for update of j
    ), workspace_guard as materialized (
      select pw.storefront_slug
      from pro_workspaces pw
      join target t on t.storefront_slug = pw.storefront_slug
      where pw.draft_version = t.expected_version
        and pw.draft_source_hash = t.meta->>'expectedWorkspaceHash'
      for update of pw
    ), active_job as materialized (
      select j.*
      from pro_jobs j
      join target t on t.storefront_slug = j.storefront_slug
      where j.status not in ('succeeded', 'failed')
      limit 1
    ), monthly_usage as materialized (
      select coalesce(sum(a.credit_cost), 0)::int as used
      from souqy_audit a
      cross join user_lock
      where a.clerk_user_id = ${args.clerkUserId}
        and a.kind in ('generate', 'reprompt')
        and a.status in ('pending', 'success')
        and a.occurred_at >= date_trunc('month', now())
    ), audit_insert as (
      insert into souqy_audit (
        clerk_user_id, storefront, kind, status,
        prompt, source, meta, credit_cost
      )
      select
        t.clerk_user_id,
        t.storefront_slug,
        case when t.kind = 'ai_edit' then 'reprompt' else 'generate' end,
        'pending',
        t.prompt,
        null,
        jsonb_build_object(
          'surface', 'pro', 'retryOfJobId', t.id,
          'catalogVersion', t.ai_catalog_version,
          'modelId', t.ai_model_id,
          'reasoning', t.ai_reasoning_level,
          'speed', t.ai_speed_mode
        ),
        t.credit_cost
      from target t
      cross join monthly_usage u
      cross join workspace_guard
      where not exists (select 1 from active_job)
        and u.used + t.credit_cost <= ${args.monthlyCap}
      returning id
    ), job_update as (
      update pro_jobs j set
        status = case
          when j.meta->>'resumeStatus' in ('generating','validating','building','repairing')
            then j.meta->>'resumeStatus'
          else 'queued'
        end,
        souqy_audit_id = audit_insert.id,
        error_code = null,
        error_message = null,
        diagnostics = null,
        meta = jsonb_set(j.meta - 'resumeStatus', '{repairCount}', '0'::jsonb, true),
        lease_token = null,
        lease_expires_at = null,
        finished_at = null,
        updated_at = now()
      from audit_insert
      where j.id = ${args.jobId}
      returning j.*
    )
    select
      case
        when exists (select 1 from job_update) then 'created'
        when exists (select 1 from idempotent_retry) then 'existing'
        when not exists (select 1 from target) then 'not_retryable'
        when not exists (select 1 from workspace_guard) then 'workspace_conflict'
        when exists (select 1 from active_job) then 'active_job'
        else 'quota_exceeded'
      end as result,
      coalesce(
        (select to_jsonb(j) from job_update j limit 1),
        (select to_jsonb(j) from idempotent_retry j limit 1),
        (select to_jsonb(j) from active_job j limit 1)
      ) as job
  `) as unknown as Array<{
    result:
      | 'created'
      | 'existing'
      | 'not_retryable'
      | 'workspace_conflict'
      | 'active_job'
      | 'quota_exceeded';
    job: DbJobRow | null;
  }>;
  const outcome = rows[0];
  if (!outcome || outcome.result === 'not_retryable') {
    return { ok: false, reason: 'not_retryable', job: null };
  }
  if ((outcome.result === 'created' || outcome.result === 'existing') && outcome.job) {
    const job = fromJob(outcome.job);
    if (outcome.result === 'created') {
      await setProWorkspaceBuildStatus(job.storefrontSlug, job.status, job.expectedVersion);
    }
    return { ok: true, job, created: outcome.result === 'created' };
  }
  if (outcome.result === 'created' || outcome.result === 'existing') {
    return { ok: false, reason: 'not_retryable', job: null };
  }
  return {
    ok: false,
    reason: outcome.result,
    job: outcome.job ? fromJob(outcome.job) : null,
  };
}

export async function publishProWorkspace(args: {
  slug: string;
  clerkUserId: string;
  expectedVersion: number;
  sourceHash: string;
  sessionId?: string | null;
}): Promise<boolean> {
  const rows = (await db()`
    with session_guard as materialized (
      select s.id
      from pro_sessions s
      where s.id = ${args.sessionId ?? null}::uuid
        and s.storefront_slug = ${args.slug}
        and s.clerk_user_id = ${args.clerkUserId}
        and s.status = 'active'
    ), candidate as (
      select pw.*
      from pro_workspaces pw
      join briefs owned on owned.slug = pw.storefront_slug
      where pw.storefront_slug = ${args.slug}
        and owned.clerk_user_id = ${args.clerkUserId}
        and pw.draft_version = ${args.expectedVersion}
        and pw.draft_source_hash = ${args.sourceHash}
        and pw.built_source_hash = pw.draft_source_hash
        and pw.built_source_version = pw.draft_version
        and pw.build_status = 'succeeded'
        and pw.built_revision is not null
        and pw.built_blob_url is not null
        and (
          ${args.sessionId ?? null}::uuid is null
          or exists (select 1 from session_guard)
        )
    ), published as (
      update briefs b set
        souqy_revision = c.built_revision,
        souqy_blob_url = c.built_blob_url,
        souqy_source = c.built_source,
        is_published = true,
        published_at = now()
      from candidate c
      where b.slug = c.storefront_slug
      returning b.slug, c.built_revision
    ), publish_event as (
      insert into pro_session_events (
        session_id, event_type, content, revision, metadata
      )
      select
        s.id, 'publish', null, p.built_revision,
        jsonb_build_object('sourceVersion', ${args.expectedVersion})
      from published p
      cross join session_guard s
      returning session_id
    ), session_touch as (
      update pro_sessions s set updated_at = now()
      where s.id in (select session_id from publish_event)
      returning s.id
    )
    select slug from published
  `) as unknown as Array<{ slug: string }>;
  return rows.length > 0;
}
