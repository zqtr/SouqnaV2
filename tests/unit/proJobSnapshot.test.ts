import { describe, expect, it } from 'vitest';
import { bespokeProAiConfiguration } from '@/lib/pro/aiConfig';
import { toProJobSnapshot, type ProJobRecord } from '@/lib/proState';

describe('Souqna Pro job serialization', () => {
  it('never exposes server-only generation or lease material', () => {
    const job: ProJobRecord = {
      id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_secret',
      idempotencyKey: 'secret-idempotency-material',
      kind: 'ai_edit',
      status: 'failed',
      foundation: 'structure',
      expectedVersion: 4,
      sourceHash: 'a'.repeat(64),
      candidateSource: 'private source',
      prompt: 'private prompt',
      souqyAuditId: 42,
      attempts: 1,
      errorCode: 'validation_failed',
      errorMessage: 'Source validation failed.',
      diagnostics: 'index.tsx:1 unsafe browser global',
      revision: null,
      blobUrl: null,
      bytes: null,
      buildMs: null,
      configuration: bespokeProAiConfiguration(),
      meta: { rawUsage: 123, providerResponse: 'secret' },
      leaseToken: 'private-lease',
      leaseExpiresAt: '2026-07-20T00:06:00.000Z',
      requestHash: 'private-request-hash',
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:01:00.000Z',
    };

    const snapshot = toProJobSnapshot(job);
    expect(snapshot.configuration).toEqual(job.configuration);
    expect(snapshot.diagnostics).toContain('unsafe browser global');
    for (const forbidden of [
      'clerkUserId',
      'idempotencyKey',
      'candidateSource',
      'prompt',
      'souqyAuditId',
      'meta',
      'leaseToken',
      'leaseExpiresAt',
      'requestHash',
    ]) {
      expect(snapshot).not.toHaveProperty(forbidden);
    }
  });

  it('suppresses raw build diagnostics from client snapshots', () => {
    const job = {
      id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
      storefrontSlug: 'atelier-doha',
      clerkUserId: 'user_secret',
      idempotencyKey: 'key',
      kind: 'manual_build',
      status: 'failed',
      foundation: 'structure',
      expectedVersion: 1,
      sourceHash: 'a'.repeat(64),
      candidateSource: 'source',
      prompt: null,
      souqyAuditId: null,
      attempts: 1,
      errorCode: 'bundle_failed',
      errorMessage: 'The build failed.',
      diagnostics: '/private/path raw sandbox log',
      revision: null,
      blobUrl: null,
      bytes: null,
      buildMs: null,
      configuration: null,
      meta: {},
      leaseToken: null,
      leaseExpiresAt: null,
      requestHash: null,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:01:00.000Z',
    } satisfies ProJobRecord;
    expect(toProJobSnapshot(job).diagnostics).toBeNull();
  });
});
