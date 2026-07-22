import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqlMock = vi.fn();

vi.mock('@/lib/db', () => ({
  hasDb: () => true,
  db: () => sqlMock,
}));

import { completeProJob, hashProSource, type ProJobRecord } from '@/lib/proState';

const SOURCE = 'curated:structure';
const SOURCE_HASH = hashProSource(SOURCE);
const LEASE_TOKEN = '9e6cf0bb-25bf-440b-8152-d91398e87f99';

function workspaceRow(overrides: Record<string, unknown> = {}) {
  return {
    storefront_slug: 'atelier-doha',
    foundation: 'structure',
    preferred_mode: 'pro',
    draft_source: SOURCE,
    draft_source_hash: SOURCE_HASH,
    draft_version: 1,
    built_revision: 'revision-1',
    built_blob_url: 'https://blob.example/revision-1.js',
    built_source: SOURCE,
    built_source_hash: SOURCE_HASH,
    built_source_version: 1,
    build_status: 'succeeded',
    easy_snapshot_id: '8b5cb88d-9dc2-4132-ad58-a3f84d237fbc',
    ai_preferences: {},
    ai_preferences_version: 1,
    last_error_code: null,
    last_error_message: null,
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:01:00.000Z',
    ...overrides,
  };
}

function job(overrides: Partial<ProJobRecord> = {}): ProJobRecord {
  return {
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
    storefrontSlug: 'atelier-doha',
    clerkUserId: 'user_owner',
    idempotencyKey: 'pro:atelier-doha:manual:1',
    kind: 'manual_build',
    status: 'building',
    foundation: 'structure',
    expectedVersion: 1,
    sourceHash: SOURCE_HASH,
    candidateSource: SOURCE,
    prompt: null,
    souqyAuditId: null,
    attempts: 1,
    errorCode: null,
    errorMessage: null,
    diagnostics: null,
    revision: null,
    blobUrl: null,
    bytes: null,
    buildMs: null,
    configuration: null,
    meta: {},
    leaseToken: LEASE_TOKEN,
    leaseExpiresAt: '2026-07-20T00:06:00.000Z',
    requestHash: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  sqlMock.mockReset();
});

describe('Pro job completion lease and workspace CAS', () => {
  it('completes a manual build with one lease-gated statement', async () => {
    sqlMock.mockResolvedValueOnce([workspaceRow()]);

    const completed = await completeProJob({
      job: job(),
      leaseToken: LEASE_TOKEN,
      source: SOURCE,
      revision: 'revision-1',
      blobUrl: 'https://blob.example/revision-1.js',
      bytes: 512,
      buildMs: 1200,
      applyCandidate: false,
    });

    expect(completed).toMatchObject({
      storefrontSlug: 'atelier-doha',
      draftVersion: 1,
      builtRevision: 'revision-1',
    });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain('with eligible_job as materialized');
    expect(sql).toContain("j.status = 'building'");
    expect(sql).toContain('j.lease_token =');
    expect(sql).toContain('j.lease_expires_at > now()');
    expect(sql).toContain('j.source_hash =');
    expect(sql).toContain("j.kind not in ('bespoke_generate', 'ai_edit')");
    expect(sql).toContain('and w.draft_source_hash =');
    expect(sql).toContain('update pro_jobs j set');
    expect(sql).toContain('and exists (select 1 from updated_workspace)');
    expect(sql).toContain('cross join completed_job');
    expect(sqlMock.mock.calls[0]).toContain(LEASE_TOKEN);
  });

  it('applies an AI candidate only through the same leased completion statement', async () => {
    const generatedSource = 'generated:ai-candidate';
    const generatedHash = hashProSource(generatedSource);
    sqlMock.mockResolvedValueOnce([
      workspaceRow({
        draft_source: generatedSource,
        draft_source_hash: generatedHash,
        draft_version: 2,
        built_source: generatedSource,
        built_source_hash: generatedHash,
        built_source_version: 2,
      }),
    ]);

    const completed = await completeProJob({
      job: job({
        kind: 'ai_edit',
        sourceHash: generatedHash,
        candidateSource: generatedSource,
      }),
      leaseToken: LEASE_TOKEN,
      source: generatedSource,
      revision: 'revision-1',
      blobUrl: 'https://blob.example/revision-1.js',
      bytes: 768,
      buildMs: 1500,
      applyCandidate: true,
    });

    expect(completed).toMatchObject({ draftVersion: 2, draftSourceHash: generatedHash });
    expect(sqlMock).toHaveBeenCalledTimes(1);
    const sql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    expect(sql).toContain("j.kind in ('bespoke_generate', 'ai_edit')");
    expect(sql).toContain('draft_version = w.draft_version + 1');
    expect(sql).toContain('built_source_version = w.draft_version + 1');
    expect(sql).toContain('cross join completed_job');
  });

  it('does not report success when the lease or workspace CAS no longer matches', async () => {
    sqlMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const completed = await completeProJob({
      job: job(),
      leaseToken: LEASE_TOKEN,
      source: SOURCE,
      revision: 'revision-1',
      blobUrl: 'https://blob.example/revision-1.js',
      bytes: 512,
      buildMs: 1200,
      applyCandidate: false,
    });

    expect(completed).toBeNull();
    expect(sqlMock).toHaveBeenCalledTimes(2);
    const completionSql = String(sqlMock.mock.calls[0]?.[0]?.join(' '));
    const failureSql = String(sqlMock.mock.calls[1]?.[0]?.join(' '));
    expect(completionSql).toContain('cross join completed_job');
    expect(failureSql).toContain('where id =');
    expect(failureSql).toContain('and lease_token =');
  });
});
