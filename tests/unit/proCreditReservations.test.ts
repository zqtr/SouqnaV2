import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRO_AI_CATALOG_VERSION, type ProAiConfiguration } from '@/lib/pro/modelCatalog';

const sqlMock = vi.fn();

vi.mock('@/lib/db', () => ({
  hasDb: () => true,
  db: () => sqlMock,
}));

vi.mock('@/lib/pro/aiConfig', () => ({
  configurationFromJobColumns: () => null,
  isResolvedProAiConfiguration: () => true,
}));

import {
  createProJob,
  createProAiJobWithCreditReservation,
  failProJob,
  retryProJob,
  retryProAiJobWithCreditReservation,
  supersedeActiveProJobs,
} from '@/lib/proState';

const WORKSPACE_HASH = 'a'.repeat(64);
const LEASE_TOKEN = '9e6cf0bb-25bf-440b-8152-d91398e87f99';
const CONFIGURATION: ProAiConfiguration = {
  modelId: 'alibaba/qwen3.7-plus',
  reasoning: 'medium',
  speed: 'standard',
  catalogVersion: PRO_AI_CATALOG_VERSION,
  creditCost: 1,
};

function failedJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
    storefront_slug: 'atelier-doha',
    clerk_user_id: 'user_owner',
    kind: 'ai_edit',
    status: 'failed',
    foundation: 'structure',
    expected_version: 3,
    source_hash: WORKSPACE_HASH,
    candidate_source: null,
    prompt: 'Refine the product grid',
    idempotency_key: 'pro:atelier-doha:ai:3',
    souqy_audit_id: 42,
    attempts: 1,
    error_code: 'model_unavailable',
    error_message: 'The selected model is unavailable.',
    diagnostics: null,
    revision: null,
    blob_url: null,
    bytes: null,
    build_ms: null,
    ai_model_id: CONFIGURATION.modelId,
    ai_reasoning_level: CONFIGURATION.reasoning,
    ai_speed_mode: CONFIGURATION.speed,
    ai_catalog_version: CONFIGURATION.catalogVersion,
    credit_cost: CONFIGURATION.creditCost,
    request_hash: 'b'.repeat(64),
    meta: { expectedWorkspaceHash: WORKSPACE_HASH },
    lease_token: null,
    lease_expires_at: null,
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:01:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  sqlMock.mockReset();
});

describe('Souqy Pro weighted credit reservations', () => {
  it('creates a zero-credit build only while its workspace version and hash are locked', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        result: 'created',
        job: failedJobRow({
          kind: 'manual_build',
          status: 'queued',
          credit_cost: 0,
          ai_model_id: null,
          ai_reasoning_level: null,
          ai_speed_mode: null,
          ai_catalog_version: null,
        }),
      },
    ]);

    const result = await createProJob({
      slug: 'atelier-doha',
      clerkUserId: 'user_owner',
      kind: 'manual_build',
      foundation: 'structure',
      expectedVersion: 3,
      sourceHash: WORKSPACE_HASH,
      candidateSource: 'curated:structure',
      idempotencyKey: 'pro:atelier-doha:manual:3',
    });

    expect(result).toMatchObject({ created: true, job: { status: 'queued' } });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('workspace_guard as materialized');
    expect(sql).toContain('pw.draft_version =');
    expect(sql).toContain('pw.draft_source_hash =');
    expect(sql).toContain('for update of pw');
    expect(sql).toContain('from workspace_guard');
    expect(sql).toContain('workspace_update as');
  });

  it('returns an already-reactivated zero-credit retry without mutating it again', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        job: failedJobRow({
          kind: 'manual_build',
          status: 'queued',
          credit_cost: 0,
          ai_model_id: null,
          ai_reasoning_level: null,
          ai_speed_mode: null,
          ai_catalog_version: null,
        }),
      },
    ]);

    const result = await retryProJob('019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2', 'user_owner');

    expect(result).toMatchObject({ status: 'queued', kind: 'manual_build' });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('idempotent_retry as materialized');
    expect(sql).toContain('workspace_guard as materialized');
    expect(sql).toContain('for update of pw');
    expect(sql).toContain('workspace_update as');
  });

  it('does not reserve credit when the expected workspace version or hash is stale', async () => {
    sqlMock.mockResolvedValueOnce([{ result: 'workspace_conflict', job: null }]);

    const result = await createProAiJobWithCreditReservation({
      slug: 'atelier-doha',
      clerkUserId: 'user_owner',
      kind: 'ai_edit',
      foundation: 'structure',
      expectedVersion: 3,
      expectedWorkspaceHash: WORKSPACE_HASH,
      sourceHash: WORKSPACE_HASH,
      prompt: 'Refine the product grid',
      idempotencyKey: 'pro:atelier-doha:ai:3',
      requestHash: 'b'.repeat(64),
      configuration: CONFIGURATION,
      monthlyCap: 30,
    });

    expect(result).toEqual({ ok: false, reason: 'workspace_conflict', job: null });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('workspace_guard as materialized');
    expect(sql).toContain('pw.draft_version =');
    expect(sql).toContain('pw.draft_source_hash =');
    expect(sql).toContain('for update of pw');
    expect(sql).toContain('cross join workspace_guard');
    expect(sql).toContain("then 'workspace_conflict'");
    expect(sqlMock.mock.calls[0]).toContain(WORKSPACE_HASH);
  });

  it('does not reserve retry credit unless the failed job still matches the workspace', async () => {
    sqlMock.mockResolvedValueOnce([{ result: 'workspace_conflict', job: null }]);

    const result = await retryProAiJobWithCreditReservation({
      jobId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      clerkUserId: 'user_owner',
      monthlyCap: 30,
    });

    expect(result).toEqual({ ok: false, reason: 'workspace_conflict', job: null });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('workspace_guard as materialized');
    expect(sql).toContain("pw.draft_source_hash = t.meta->>'expectedWorkspaceHash'");
    expect(sql).toContain('for update of pw');
    expect(sql).toContain('cross join workspace_guard');
    expect(sql).toContain("then 'workspace_conflict'");
  });

  it('returns an already-reactivated retry without reserving credit again', async () => {
    sqlMock.mockResolvedValueOnce([
      {
        result: 'existing',
        job: failedJobRow({
          status: 'queued',
          error_code: null,
          error_message: null,
          souqy_audit_id: 43,
        }),
      },
    ]);

    const result = await retryProAiJobWithCreditReservation({
      jobId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      clerkUserId: 'user_owner',
      monthlyCap: 30,
    });

    expect(result).toMatchObject({ ok: true, created: false, job: { status: 'queued' } });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('idempotent_retry as materialized');
    expect(sql).toContain("then 'existing'");
  });

  it('marks the job failed and releases its pending audit reservation atomically', async () => {
    sqlMock.mockResolvedValueOnce([failedJobRow()]);

    const failed = await failProJob({
      jobId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      leaseToken: LEASE_TOKEN,
      code: 'model_unavailable',
      message: 'The selected model is unavailable.',
    });

    expect(failed).toMatchObject({ status: 'failed', souqyAuditId: 42 });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const atomicFailureSql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(atomicFailureSql).toContain('with failed_job as');
    expect(atomicFailureSql).toContain('released_audit as');
    expect(atomicFailureSql).toContain('update souqy_audit a set');
    expect(atomicFailureSql).toContain("and a.status = 'pending'");
    expect(atomicFailureSql).toContain('left join released_audit on true');
    expect(atomicFailureSql).toContain('and lease_expires_at > now()');
    expect(atomicFailureSql).toContain("'errorCode',  ::text");
    expect(atomicFailureSql).toContain('workspace_update as');
    expect(atomicFailureSql).toContain('update pro_workspaces w set');
    expect(atomicFailureSql).toContain('session_event as');
  });

  it('types the audit error code when failing an unleased job', async () => {
    sqlMock.mockResolvedValueOnce([failedJobRow()]);

    await failProJob({
      jobId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      code: 'generation_failed',
      message: 'Generation could not finish.',
    });

    const atomicFailureSql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(atomicFailureSql).toContain("'errorCode',  ::text");
  });

  it('releases superseded pending reservations in the same statement', async () => {
    sqlMock.mockResolvedValueOnce([{ souqy_audit_id: 42 }]);

    const auditIds = await supersedeActiveProJobs('atelier-doha', 'user_owner');

    expect(auditIds).toEqual([42]);
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('with failed_jobs as');
    expect(sql).toContain('released_audits as');
    expect(sql).toContain('update souqy_audit a set');
    expect(sql).toContain("and a.status = 'pending'");
    expect(sql).toContain('left join released_audits');
  });
});
