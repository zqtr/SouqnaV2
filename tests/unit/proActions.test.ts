import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProJobSnapshot, ProWorkspaceSnapshot } from '@/lib/proMode';
import { getDefaultProAiPreferences } from '@/lib/pro/modelCatalog';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  access: vi.fn(),
  owner: vi.fn(),
  audit: vi.fn(),
  event: vi.fn(),
  completeOnboarding: vi.fn(),
  getWorkspace: vi.fn(),
  initializeWorkspace: vi.fn(),
  removeUnstartedWorkspace: vi.fn(),
  createJob: vi.fn(),
  attachAudit: vi.fn(),
  saveDraft: vi.fn(),
  saveAiPreferences: vi.fn(),
  setMode: vi.fn(),
  getJob: vi.fn(),
  retryJob: vi.fn(),
  publishWorkspace: vi.fn(),
  supersedeJobs: vi.fn(),
  reserveGeneration: vi.fn(),
  logSouqyAudit: vi.fn(),
  updateSouqyAudit: vi.fn(),
  ensureEasyManifest: vi.fn(),
  captureConversion: vi.fn(),
  rateLimit: vi.fn(),
  reserveProAiJob: vi.fn(),
  retryProAiJob: vi.fn(),
  createSession: vi.fn(),
  getSession: vi.fn(),
  recordSessionEvent: vi.fn(),
  renameSession: vi.fn(),
  archiveSession: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/audit', () => ({ recordAudit: mocks.audit }));
vi.mock('@/lib/events', () => ({ logEvent: mocks.event }));
vi.mock('@/lib/products', () => ({ assertStorefrontOwner: mocks.owner }));
vi.mock('@/lib/pro/entitlement', () => ({ getProAccess: mocks.access }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit }));
vi.mock('@/lib/pro/foundations', () => ({
  getCuratedFoundationSource: (foundation: string) =>
    foundation === 'bespoke' ? null : `curated:${foundation}`,
}));
vi.mock('@/lib/proState', () => ({
  attachProJobAudit: mocks.attachAudit,
  completeProOnboarding: mocks.completeOnboarding,
  createProAiJobWithCreditReservation: mocks.reserveProAiJob,
  createProJob: mocks.createJob,
  createProSession: mocks.createSession,
  getProJob: mocks.getJob,
  getProWorkspace: mocks.getWorkspace,
  getProSessionForOwner: mocks.getSession,
  initializeProWorkspace: mocks.initializeWorkspace,
  removeUnstartedProWorkspace: mocks.removeUnstartedWorkspace,
  publishProWorkspace: mocks.publishWorkspace,
  retryProJob: mocks.retryJob,
  retryProAiJobWithCreditReservation: mocks.retryProAiJob,
  recordProSessionEvent: mocks.recordSessionEvent,
  renameProSession: mocks.renameSession,
  saveProAiPreferences: mocks.saveAiPreferences,
  saveProWorkspaceDraft: mocks.saveDraft,
  setProWorkspaceMode: mocks.setMode,
  supersedeActiveProJobs: mocks.supersedeJobs,
  setProSessionArchived: mocks.archiveSession,
  toProJobSnapshot: (value: ProJobSnapshot) => value,
}));
vi.mock('@/lib/easySnapshots', () => ({
  PRO_CONVERSION_CONSENT_VERSION: 1,
  ensureEasyDraftManifest: mocks.ensureEasyManifest,
  captureEasySnapshotAndInitializeProWorkspace: mocks.captureConversion,
  toStorefrontSnapshotSummary: ({ payload: _payload, ...summary }: { payload?: unknown }) =>
    summary,
}));
vi.mock('@/lib/souqy/credits', () => ({
  reserveSouqyGeneration: mocks.reserveGeneration,
}));
vi.mock('@/lib/souqy/db', () => ({
  logSouqyAudit: mocks.logSouqyAudit,
  updateSouqyAudit: mocks.updateSouqyAudit,
}));

import {
  archiveProSessionAction,
  completeProOnboardingAction,
  confirmProConversionAction,
  createProAiEditAction,
  createProSessionAction,
  initializeProWorkspaceAction,
  publishProBuildAction,
  renameProSessionAction,
  retryProJobAction,
} from '@/app/actions/pro';

const HASH = 'a'.repeat(64);
const SNAPSHOT_ID = '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd3';

function workspace(overrides: Partial<ProWorkspaceSnapshot> = {}): ProWorkspaceSnapshot {
  return {
    storefrontSlug: 'atelier-doha',
    foundation: 'structure',
    preferredMode: 'pro',
    draftSource: 'curated:structure',
    draftSourceHash: HASH,
    draftVersion: 1,
    builtRevision: null,
    builtBlobUrl: null,
    builtSource: null,
    builtSourceHash: null,
    builtSourceVersion: null,
    buildStatus: 'idle',
    lastErrorCode: null,
    lastErrorMessage: null,
    aiPreferences: getDefaultProAiPreferences(),
    aiPreferencesVersion: 1,
    brandIntent: null,
    recommendationVersion: 0,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

type TestJob = ProJobSnapshot & {
  clerkUserId: string;
  idempotencyKey: string;
  souqyAuditId: number | null;
};

function job(overrides: Partial<TestJob> = {}): TestJob {
  return {
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
    storefrontSlug: 'atelier-doha',
    clerkUserId: 'user_123',
    idempotencyKey: `pro:atelier-doha:foundation_build:1:${HASH}`,
    souqyAuditId: null,
    kind: 'foundation_build',
    status: 'queued',
    foundation: 'structure',
    expectedVersion: 1,
    sourceHash: HASH,
    attempts: 0,
    errorCode: null,
    errorMessage: null,
    diagnostics: null,
    revision: null,
    blobUrl: null,
    bytes: null,
    buildMs: null,
    configuration: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: 'user_123' });
  mocks.access.mockResolvedValue({ enabled: true, eligible: true, plan: 'pro' });
  mocks.owner.mockResolvedValue({
    slug: 'atelier-doha',
    locale: 'en',
    businessType: 'ecommerce',
    design: 'atrium',
    logoUrl: null,
    tagline: null,
    isPublished: true,
  });
  mocks.getWorkspace.mockResolvedValue(null);
  mocks.initializeWorkspace.mockResolvedValue({ ok: true, workspace: workspace() });
  mocks.removeUnstartedWorkspace.mockResolvedValue(true);
  mocks.createJob.mockResolvedValue({ job: job(), created: true });
  mocks.supersedeJobs.mockResolvedValue([]);
  mocks.reserveGeneration.mockResolvedValue({ allowed: true });
  mocks.logSouqyAudit.mockResolvedValue(101);
  mocks.attachAudit.mockResolvedValue(undefined);
  mocks.publishWorkspace.mockResolvedValue(true);
  mocks.ensureEasyManifest.mockResolvedValue({ version: 1, stateHash: HASH });
  mocks.captureConversion.mockResolvedValue({
    ok: true,
    workspaceCreated: true,
    snapshot: {
      id: SNAPSHOT_ID,
      storefrontSlug: 'atelier-doha',
      kind: 'pre_pro_easy',
      schemaVersion: 1,
      stateHash: HASH,
      consentVersion: 1,
      pageCount: 1,
      wasPublished: true,
      capturedPublishedAt: '2026-07-20T00:00:00.000Z',
      createdAt: '2026-07-20T00:00:00.000Z',
      payload: {},
    },
  });
  mocks.rateLimit.mockReturnValue({ ok: true });
  mocks.createSession.mockResolvedValue({
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
    storefrontSlug: 'atelier-doha',
    title: 'Refine the homepage',
    status: 'active',
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  });
  mocks.getSession.mockResolvedValue(null);
  mocks.recordSessionEvent.mockResolvedValue(undefined);
  mocks.archiveSession.mockResolvedValue({
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
    storefrontSlug: 'atelier-doha',
    title: 'Refine the homepage',
    status: 'archived',
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T01:00:00.000Z',
  });
  mocks.renameSession.mockResolvedValue({
    id: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
    storefrontSlug: 'atelier-doha',
    title: 'Updated homepage direction',
    status: 'active',
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T01:00:00.000Z',
  });
});

describe('Souqna Pro action boundaries', () => {
  it('creates owner-scoped Pro sessions only after entitlement and ownership checks', async () => {
    const result = await createProSessionAction({
      slug: 'atelier-doha',
      title: '  Refine the homepage  ',
    });

    expect(result).toMatchObject({
      ok: true,
      data: { session: { storefrontSlug: 'atelier-doha', title: 'Refine the homepage' } },
    });
    expect(mocks.createSession).toHaveBeenCalledWith({
      slug: 'atelier-doha',
      clerkUserId: 'user_123',
      title: 'Refine the homepage',
    });
  });

  it('archives only an owner-scoped storefront session', async () => {
    const result = await archiveProSessionAction({
      slug: 'atelier-doha',
      sessionId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
      archived: true,
    });

    expect(result).toMatchObject({ ok: true, data: { session: { status: 'archived' } } });
    expect(mocks.archiveSession).toHaveBeenCalledWith({
      slug: 'atelier-doha',
      clerkUserId: 'user_123',
      sessionId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
      archived: true,
    });
  });

  it('renames only an owner-scoped storefront session', async () => {
    const result = await renameProSessionAction({
      slug: 'atelier-doha',
      sessionId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
      title: '  Updated homepage direction  ',
    });

    expect(result).toMatchObject({
      ok: true,
      data: { session: { title: 'Updated homepage direction' } },
    });
    expect(mocks.renameSession).toHaveBeenCalledWith({
      slug: 'atelier-doha',
      clerkUserId: 'user_123',
      sessionId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
      title: 'Updated homepage direction',
    });
  });

  it('rejects unsupported prompt targets before authentication or credit reservation', async () => {
    const result = await createProAiEditAction({
      slug: 'atelier-doha',
      expectedVersion: 1,
      request: 'Improve the hero hierarchy',
      target: 'checkout' as never,
      intent: 'improve',
      modelId: 'openai/gpt-5.4-mini',
      reasoning: 'low',
      speed: 'standard',
      catalogVersion: '2026-07-21',
      sessionId: null,
    });

    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.reserveProAiJob).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests before plan or ownership checks', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const result = await completeProOnboardingAction({
      slug: 'atelier-doha',
      version: 1,
    });
    expect(result).toMatchObject({ ok: false, error: 'unauthorized' });
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.owner).not.toHaveBeenCalled();
  });

  it('enforces Pro+ entitlement before storefront ownership', async () => {
    mocks.access.mockResolvedValue({ enabled: true, eligible: false, plan: 'starter' });
    const result = await completeProOnboardingAction({
      slug: 'atelier-doha',
      version: 1,
    });
    expect(result).toMatchObject({ ok: false, error: 'plan_required' });
    expect(mocks.owner).not.toHaveBeenCalled();
  });

  it('rejects a storefront the authenticated user does not own', async () => {
    mocks.owner.mockResolvedValue(null);
    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: false,
      expectedVersion: null,
      easySnapshotId: SNAPSHOT_ID,
    });
    expect(result).toMatchObject({ ok: false, error: 'not_owner' });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
  });

  it('rate-limits retries before loading or reactivating a failed job', async () => {
    mocks.rateLimit.mockReturnValue({ ok: false });

    const result = await retryProJobAction({
      slug: 'atelier-doha',
      jobId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd2',
    });

    expect(result).toMatchObject({ ok: false, error: 'rate_limited' });
    expect(mocks.getJob).not.toHaveBeenCalled();
  });

  it('requires an Easy recovery point for every direct first initialization', async () => {
    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: false,
      expectedVersion: null,
    });

    expect(result).toMatchObject({ ok: false, error: 'snapshot_required' });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('atomically snapshots Easy before queuing the first Pro foundation', async () => {
    const selected = workspace();
    mocks.getWorkspace.mockResolvedValueOnce(null).mockResolvedValueOnce(selected);

    const result = await confirmProConversionAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      consentVersion: 1,
      expectedEasyVersion: 1,
      brandIntent: {
        visualAmbition: 'timeless',
        customerFeeling: 'trust',
        launchPriority: 'conversion',
        note: null,
      },
      recommendationVersion: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        workspace: selected,
        snapshot: { id: SNAPSHOT_ID, stateHash: HASH },
      },
    });
    if (result.ok) expect(result.data.snapshot).not.toHaveProperty('payload');
    expect(mocks.captureConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        storefrontSlug: 'atelier-doha',
        expectedEasyVersion: 1,
        foundation: 'structure',
      }),
    );
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).toHaveBeenCalledOnce();
  });

  it('does not create a Pro workspace or job when the reviewed Easy version is stale', async () => {
    mocks.captureConversion.mockResolvedValue({ ok: false, reason: 'snapshot_stale' });

    const result = await confirmProConversionAction({
      slug: 'atelier-doha',
      foundation: 'motion',
      consentVersion: 1,
      expectedEasyVersion: 1,
      brandIntent: {
        visualAmbition: 'expressive',
        customerFeeling: 'energy',
        launchPriority: 'launch',
        note: null,
      },
      recommendationVersion: 1,
    });

    expect(result).toMatchObject({ ok: false, error: 'snapshot_stale' });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('initializes only the separate Pro workspace and queues its reviewed source', async () => {
    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: false,
      expectedVersion: null,
      easySnapshotId: SNAPSHOT_ID,
    });
    expect(result.ok).toBe(true);
    expect(mocks.initializeWorkspace).toHaveBeenCalledWith({
      slug: 'atelier-doha',
      foundation: 'structure',
      source: 'curated:structure',
      expectedVersion: null,
      easySnapshotId: SNAPSHOT_ID,
    });
    expect(mocks.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'atelier-doha',
        kind: 'foundation_build',
        expectedVersion: 1,
        candidateSource: 'curated:structure',
      }),
    );
  });

  it('lets only one concurrent initialization increment the draft and queue a matching job', async () => {
    const selected = workspace();
    mocks.initializeWorkspace
      .mockResolvedValueOnce({ ok: true, workspace: selected })
      .mockResolvedValueOnce({ ok: false, reason: 'conflict', workspace: selected });
    mocks.createJob
      .mockResolvedValueOnce({ job: job(), created: true })
      .mockResolvedValueOnce({ job: job({ souqyAuditId: 101 }), created: false });

    const [first, second] = await Promise.all([
      initializeProWorkspaceAction({
        slug: 'atelier-doha',
        foundation: 'structure',
        confirmReplace: false,
        expectedVersion: null,
        easySnapshotId: SNAPSHOT_ID,
      }),
      initializeProWorkspaceAction({
        slug: 'atelier-doha',
        foundation: 'structure',
        confirmReplace: false,
        expectedVersion: null,
        easySnapshotId: SNAPSHOT_ID,
      }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(mocks.createJob).toHaveBeenCalledTimes(2);
    expect(mocks.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: selected.draftVersion }),
    );
    expect(mocks.supersedeJobs).not.toHaveBeenCalled();
  });

  it('returns a conflict when another foundation wins initialization', async () => {
    const concurrent = workspace({
      foundation: 'motion',
      draftSource: 'curated:motion',
      draftVersion: 1,
    });
    mocks.initializeWorkspace.mockResolvedValue({
      ok: false,
      reason: 'conflict',
      workspace: concurrent,
    });

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: false,
      expectedVersion: null,
      easySnapshotId: SNAPSHOT_ID,
    });

    expect(result).toMatchObject({ ok: false, error: 'conflict', workspace: concurrent });
    expect(mocks.createJob).not.toHaveBeenCalled();
    expect(mocks.supersedeJobs).not.toHaveBeenCalled();
  });

  it('requires confirmation before replacing an existing foundation', async () => {
    mocks.getWorkspace.mockResolvedValue(workspace({ foundation: 'motion' }));

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: false,
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ ok: false, error: 'confirmation_required' });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
  });

  it('rejects a missing client-reviewed replacement version', async () => {
    mocks.getWorkspace.mockResolvedValue(
      workspace({ foundation: 'motion', draftSource: 'curated:motion' }),
    );

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: true,
    } as unknown as Parameters<typeof initializeProWorkspaceAction>[0]);

    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
  });

  it('rejects a stale client-reviewed replacement version before snapshot or CAS', async () => {
    const current = workspace({
      foundation: 'motion',
      draftSource: 'curated:motion',
      draftVersion: 3,
    });
    mocks.getWorkspace.mockResolvedValue(current);

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: true,
      expectedVersion: 2,
    });

    expect(result).toMatchObject({ ok: false, error: 'conflict', workspace: current });
    expect(mocks.logSouqyAudit).not.toHaveBeenCalled();
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
  });

  it('leaves the workspace unchanged when its pre-replacement snapshot cannot be persisted', async () => {
    const current = workspace({ foundation: 'motion', draftSource: 'curated:motion' });
    mocks.getWorkspace.mockResolvedValue(current);
    mocks.logSouqyAudit.mockResolvedValueOnce(null);

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: true,
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ ok: false, error: 'write_failed', workspace: current });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('recovers job creation after the foundation CAS without replacing the draft twice', async () => {
    const current = workspace({ foundation: 'motion', draftSource: 'curated:motion' });
    const selected = workspace({ draftVersion: 2 });
    const selectedJob = job({
      expectedVersion: 2,
      idempotencyKey: `pro:atelier-doha:foundation_build:2:${HASH}`,
    });
    mocks.getWorkspace.mockResolvedValueOnce(current).mockResolvedValueOnce(selected);
    mocks.initializeWorkspace.mockResolvedValue({ ok: true, workspace: selected });
    mocks.createJob
      .mockRejectedValueOnce(new Error('temporary job insert failure'))
      .mockResolvedValueOnce({ job: selectedJob, created: true });

    const input = {
      slug: 'atelier-doha',
      foundation: 'structure' as const,
      confirmReplace: true,
      expectedVersion: 1,
    };
    const first = await initializeProWorkspaceAction(input);
    const second = await initializeProWorkspaceAction(input);

    expect(first).toMatchObject({ ok: false, error: 'write_failed' });
    expect(second).toMatchObject({ ok: true, data: { workspace: selected, job: selectedJob } });
    expect(mocks.initializeWorkspace).toHaveBeenCalledTimes(1);
    expect(mocks.createJob).toHaveBeenCalledTimes(2);
    expect(mocks.logSouqyAudit).toHaveBeenCalledTimes(2);
  });

  it('recovers a missing job audit by returning the same idempotent job', async () => {
    const current = workspace({ foundation: 'motion', draftSource: 'curated:motion' });
    const selected = workspace({ draftVersion: 2 });
    const selectedJob = job({
      expectedVersion: 2,
      idempotencyKey: `pro:atelier-doha:foundation_build:2:${HASH}`,
    });
    mocks.getWorkspace.mockResolvedValueOnce(current).mockResolvedValueOnce(selected);
    mocks.initializeWorkspace.mockResolvedValue({ ok: true, workspace: selected });
    mocks.createJob
      .mockResolvedValueOnce({ job: selectedJob, created: true })
      .mockResolvedValueOnce({ job: selectedJob, created: false });
    mocks.logSouqyAudit
      .mockResolvedValueOnce(201)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(202);

    const input = {
      slug: 'atelier-doha',
      foundation: 'structure' as const,
      confirmReplace: true,
      expectedVersion: 1,
    };
    const first = await initializeProWorkspaceAction(input);
    const second = await initializeProWorkspaceAction(input);

    expect(first).toMatchObject({ ok: false, error: 'write_failed', workspace: selected });
    expect(second).toMatchObject({ ok: true, data: { workspace: selected, job: selectedJob } });
    expect(mocks.initializeWorkspace).toHaveBeenCalledTimes(1);
    expect(mocks.createJob).toHaveBeenCalledTimes(2);
    expect(mocks.attachAudit).toHaveBeenCalledOnce();
    expect(mocks.attachAudit).toHaveBeenCalledWith(selectedJob.id, 202);
    expect(mocks.supersedeJobs).not.toHaveBeenCalled();
  });

  it('protects the active foundation from being selected again', async () => {
    const current = workspace();
    mocks.getWorkspace.mockResolvedValue(current);

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: true,
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ ok: false, error: 'already_selected', workspace: current });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('does not mistake an edited same-foundation draft for a failed initialization retry', async () => {
    const current = workspace({ draftSource: 'founder edit', draftVersion: 2 });
    mocks.getWorkspace.mockResolvedValue(current);

    const result = await initializeProWorkspaceAction({
      slug: 'atelier-doha',
      foundation: 'structure',
      confirmReplace: true,
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ ok: false, error: 'already_selected', workspace: current });
    expect(mocks.initializeWorkspace).not.toHaveBeenCalled();
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it('refuses stale publish attempts without touching the live pointer', async () => {
    mocks.getWorkspace.mockResolvedValue(
      workspace({
        draftVersion: 2,
        builtRevision: 'revision-1',
        builtBlobUrl: 'https://example.test/revision-1.mjs',
        builtSource: 'curated:structure',
        builtSourceHash: HASH,
        builtSourceVersion: 1,
        buildStatus: 'succeeded',
      }),
    );
    const result = await publishProBuildAction({
      slug: 'atelier-doha',
      expectedVersion: 2,
      sourceHash: HASH,
    });
    expect(result).toMatchObject({ ok: false, error: 'build_required' });
    expect(mocks.publishWorkspace).not.toHaveBeenCalled();
  });

  it('publishes only the exact successful build revision', async () => {
    mocks.getWorkspace.mockResolvedValue(
      workspace({
        builtRevision: 'revision-1',
        builtBlobUrl: 'https://example.test/revision-1.mjs',
        builtSource: 'curated:structure',
        builtSourceHash: HASH,
        builtSourceVersion: 1,
        buildStatus: 'succeeded',
      }),
    );
    const result = await publishProBuildAction({
      slug: 'atelier-doha',
      expectedVersion: 1,
      sourceHash: HASH,
    });
    expect(result).toEqual({ ok: true, data: { revision: 'revision-1' } });
    expect(mocks.publishWorkspace).toHaveBeenCalledWith({
      slug: 'atelier-doha',
      clerkUserId: 'user_123',
      expectedVersion: 1,
      sourceHash: HASH,
      sessionId: null,
    });
  });

  it('rejects a session that does not belong to the selected storefront', async () => {
    mocks.getWorkspace.mockResolvedValue(
      workspace({
        builtRevision: 'revision-1',
        builtBlobUrl: 'https://example.test/revision-1.mjs',
        builtSource: 'curated:structure',
        builtSourceHash: HASH,
        builtSourceVersion: 1,
        buildStatus: 'succeeded',
      }),
    );

    const result = await publishProBuildAction({
      slug: 'atelier-doha',
      expectedVersion: 1,
      sourceHash: HASH,
      sessionId: '019f7e2f-6661-7ec1-8682-a2a4a4ce2bd4',
    });

    expect(result).toMatchObject({ ok: false, error: 'not_owner' });
    expect(mocks.publishWorkspace).not.toHaveBeenCalled();
  });
});
