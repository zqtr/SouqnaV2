'use server';

import { createHash } from 'node:crypto';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recordAudit } from '@/lib/audit';
import { logEvent } from '@/lib/events';
import { assertStorefrontOwner } from '@/lib/products';
import { rateLimit } from '@/lib/rate-limit';
import { getProAccess } from '@/lib/pro/entitlement';
import { bespokeProAiConfiguration, resolveProAiConfiguration } from '@/lib/pro/aiConfig';
import { getCuratedFoundationSource } from '@/lib/pro/foundations';
import { recommendProFoundation } from '@/lib/pro/recommendation';
import {
  attachProJobAudit,
  completeProOnboarding,
  createProSession,
  createProAiJobWithCreditReservation,
  createProJob,
  getProJob,
  getProSessionForOwner,
  getProWorkspace,
  initializeProWorkspace,
  publishProWorkspace,
  removeUnstartedProWorkspace,
  retryProJob,
  retryProAiJobWithCreditReservation,
  renameProSession,
  saveProWorkspaceDraft,
  saveProAiPreferences,
  setProWorkspaceMode,
  supersedeActiveProJobs,
  setProSessionArchived,
  type ProJobRecord,
  toProJobSnapshot,
} from '@/lib/proState';
import {
  PRO_ONBOARDING_VERSION,
  PRO_PROMPT_INTENTS,
  PRO_PROMPT_TARGETS,
  PRO_RECOMMENDATION_VERSION,
  isProPublishReady,
  type ProJobSnapshot,
  type ProSessionSnapshot,
  type ProWorkspaceSnapshot,
} from '@/lib/proMode';
import { parseSouqySource, serializeSouqySource } from '@/lib/souqy/source';
import { logSouqyAudit, updateSouqyAudit } from '@/lib/souqy/db';
import { getSouqyTier } from '@/lib/souqy/subscription';
import { souqyMonthlyCap } from '@/lib/souqy/plans';
import {
  PRO_AI_CATALOG_VERSION,
  PRO_AI_MODEL_IDS,
  isProAiPreferences,
  type ProAiPreferences,
} from '@/lib/pro/modelCatalog';
import {
  PRO_CONVERSION_CONSENT_VERSION,
  captureEasySnapshotAndInitializeProWorkspace,
  ensureEasyDraftManifest,
  toStorefrontSnapshotSummary,
  type StorefrontSnapshotSummary,
} from '@/lib/easySnapshots';

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/u);
const FoundationSchema = z.enum(['structure', 'motion', 'bespoke']);
const ModeSchema = z.enum(['easy', 'pro']);
const SourceFilesSchema = z
  .object({
    'index.tsx': z.string().max(120_000),
    'theme.ts': z.string().max(32_000),
    'styles.css': z.string().max(48_000).optional(),
  })
  .strict()
  .refine(
    (files) => Object.values(files).reduce((sum, value) => sum + value.length, 0) <= 180_000,
    'Pro source is too large.',
  );

const OnboardingSchema = z.object({
  slug: SlugSchema,
  version: z.number().int().min(1).max(PRO_ONBOARDING_VERSION),
});
const ModeInputSchema = z.object({ slug: SlugSchema, mode: ModeSchema });
const InitializeSchema = z.object({
  slug: SlugSchema,
  foundation: FoundationSchema,
  confirmReplace: z.boolean().default(false),
  expectedVersion: z.number().int().positive().nullable(),
  easySnapshotId: z.string().uuid().nullable().optional(),
});
const ConfirmConversionSchema = z
  .object({
    slug: SlugSchema,
    foundation: FoundationSchema,
    consentVersion: z.literal(PRO_CONVERSION_CONSENT_VERSION),
    expectedEasyVersion: z.number().int().positive(),
    brandIntent: z
      .object({
        visualAmbition: z.enum(['timeless', 'expressive', 'one_of_one']),
        customerFeeling: z.enum(['trust', 'energy', 'discovery']),
        launchPriority: z.enum(['conversion', 'launch', 'brand_world']),
        note: z.string().trim().max(500).nullable(),
      })
      .strict(),
    recommendationVersion: z.literal(PRO_RECOMMENDATION_VERSION),
  })
  .strict();
const SaveSchema = z.object({
  slug: SlugSchema,
  expectedVersion: z.number().int().positive(),
  files: SourceFilesSchema,
});
const SessionIdSchema = z.string().uuid().nullable().optional();
const BuildSchema = z.object({
  slug: SlugSchema,
  expectedVersion: z.number().int().positive(),
  sessionId: SessionIdSchema,
});
const AiEditSchema = BuildSchema.extend({
  request: z.string().trim().min(3).max(1200),
  target: z.enum(PRO_PROMPT_TARGETS).optional(),
  intent: z.enum(PRO_PROMPT_INTENTS).optional(),
  modelId: z.enum(PRO_AI_MODEL_IDS),
  reasoning: z.enum(['low', 'medium', 'high']),
  speed: z.enum(['standard', 'fast']),
  catalogVersion: z.literal(PRO_AI_CATALOG_VERSION),
});
const AiPreferenceSchema = z
  .object({
    slug: SlugSchema,
    expectedPreferencesVersion: z.number().int().positive(),
    preferences: z.custom<ProAiPreferences>(isProAiPreferences),
  })
  .strict();
const RetrySchema = z.object({ slug: SlugSchema, jobId: z.string().uuid() });
const PublishSchema = z.object({
  slug: SlugSchema,
  expectedVersion: z.number().int().positive(),
  sourceHash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]+$/u),
  sessionId: SessionIdSchema,
});
const CreateSessionSchema = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(120),
});
const RenameSessionSchema = CreateSessionSchema.extend({ sessionId: z.string().uuid() });
const ArchiveSessionSchema = z.object({
  slug: SlugSchema,
  sessionId: z.string().uuid(),
  archived: z.boolean(),
});

export type ProActionErrorCode =
  | 'disabled'
  | 'unauthorized'
  | 'plan_required'
  | 'not_owner'
  | 'invalid_request'
  | 'database_unavailable'
  | 'workspace_missing'
  | 'snapshot_required'
  | 'snapshot_stale'
  | 'confirmation_required'
  | 'already_selected'
  | 'conflict'
  | 'quota_exceeded'
  | 'catalog_outdated'
  | 'model_not_allowed'
  | 'configuration_invalid'
  | 'rate_limited'
  | 'build_required'
  | 'job_not_found'
  | 'write_failed';

export type ProActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: ProActionErrorCode;
      message: string;
      workspace?: ProWorkspaceSnapshot | null;
    };

type ProActionFailure = Extract<ProActionResult<never>, { ok: false }>;

function error(
  code: ProActionErrorCode,
  message: string,
  workspace?: ProWorkspaceSnapshot | null,
): ProActionFailure {
  return { ok: false, error: code, message, ...(workspace !== undefined ? { workspace } : {}) };
}

async function guardProStore(slug: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { ok: false as const, result: error('unauthorized', 'Sign in to continue.') };
    }
    const access = await getProAccess(userId);
    if (!access.enabled) {
      return { ok: false as const, result: error('disabled', 'Souqna Pro is not enabled.') };
    }
    if (!access.eligible) {
      return {
        ok: false as const,
        result: error('plan_required', 'Souqna Pro requires Pro+ or Max+.'),
      };
    }
    const storefront = await assertStorefrontOwner(slug, userId);
    if (!storefront) {
      return { ok: false as const, result: error('not_owner', 'Storefront not found.') };
    }
    return { ok: true as const, userId, storefront, access };
  } catch {
    return {
      ok: false as const,
      result: error('database_unavailable', 'Souqna Pro is temporarily unavailable.'),
    };
  }
}

function refreshProPaths(slug: string): void {
  revalidatePath('/account/pro');
  revalidatePath('/account/builder');
  revalidatePath(`/account/${slug}/pro-preview`);
}

async function ownedSessionId(args: {
  sessionId?: string | null;
  slug: string;
  clerkUserId: string;
}): Promise<string | null | false> {
  if (!args.sessionId) return null;
  const session = await getProSessionForOwner({
    sessionId: args.sessionId,
    slug: args.slug,
    clerkUserId: args.clerkUserId,
  });
  return session?.status === 'active' ? session.id : false;
}

export async function createProSessionAction(
  input: z.input<typeof CreateSessionSchema>,
): Promise<ProActionResult<{ session: ProSessionSnapshot }>> {
  const parsed = CreateSessionSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Name this Pro session.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const session = await createProSession({
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
      title: parsed.data.title,
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { session } };
  } catch {
    return error('write_failed', 'Could not start a Pro session.');
  }
}

export async function renameProSessionAction(
  input: z.input<typeof RenameSessionSchema>,
): Promise<ProActionResult<{ session: ProSessionSnapshot }>> {
  const parsed = RenameSessionSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Choose a valid session name.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const session = await renameProSession({ ...parsed.data, clerkUserId: gate.userId });
    if (!session) return error('not_owner', 'Session not found.');
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { session } };
  } catch {
    return error('write_failed', 'Could not rename this session.');
  }
}

export async function archiveProSessionAction(
  input: z.input<typeof ArchiveSessionSchema>,
): Promise<ProActionResult<{ session: ProSessionSnapshot }>> {
  const parsed = ArchiveSessionSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Choose a valid Pro session.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const session = await setProSessionArchived({ ...parsed.data, clerkUserId: gate.userId });
    if (!session) return error('not_owner', 'Session not found.');
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { session } };
  } catch {
    return error('write_failed', 'Could not update this session.');
  }
}

function isAppliedFoundationRecovery(args: {
  workspace: ProWorkspaceSnapshot;
  foundation: z.infer<typeof FoundationSchema>;
  source: string;
  reviewedVersion: number | null;
}): boolean {
  return (
    args.workspace.foundation === args.foundation &&
    args.workspace.draftSource === args.source &&
    args.workspace.draftVersion === (args.reviewedVersion ?? 0) + 1
  );
}

function isMatchingFoundationJob(
  job: ProJobRecord,
  args: {
    slug: string;
    clerkUserId: string;
    idempotencyKey: string;
  },
): boolean {
  return (
    job.storefrontSlug === args.slug &&
    job.clerkUserId === args.clerkUserId &&
    job.idempotencyKey === args.idempotencyKey
  );
}

async function ensureFoundationJob(args: {
  slug: string;
  clerkUserId: string;
  foundation: z.infer<typeof FoundationSchema>;
  workspace: ProWorkspaceSnapshot;
  source: string;
  monthlyCap: number;
}): Promise<
  | { ok: true; job: ProJobRecord; created: boolean }
  | { ok: false; reason: 'quota_exceeded' | 'active_job' | 'workspace_conflict' }
> {
  const kind = args.foundation === 'bespoke' ? 'bespoke_generate' : 'foundation_build';
  const configuration = args.foundation === 'bespoke' ? bespokeProAiConfiguration() : null;
  const idempotencyKey = configuration
    ? [
        'pro',
        args.slug,
        kind,
        args.workspace.draftVersion,
        args.workspace.draftSourceHash,
        configuration.catalogVersion,
        configuration.modelId,
      ].join(':')
    : `pro:${args.slug}:${kind}:${args.workspace.draftVersion}:${args.workspace.draftSourceHash}`;
  const jobInput = {
    slug: args.slug,
    clerkUserId: args.clerkUserId,
    kind,
    foundation: args.foundation,
    expectedVersion: args.workspace.draftVersion,
    sourceHash: args.source ? args.workspace.draftSourceHash : null,
    candidateSource: args.source || null,
    idempotencyKey,
    configuration,
    requestHash: createHash('sha256').update(idempotencyKey).digest('hex'),
  } as const;
  const match = { slug: args.slug, clerkUserId: args.clerkUserId, idempotencyKey };

  const create = async () => {
    if (args.foundation !== 'bespoke' || !configuration) {
      const created = await createProJob(jobInput);
      return { ok: true as const, ...created };
    }
    return createProAiJobWithCreditReservation({
      slug: args.slug,
      clerkUserId: args.clerkUserId,
      kind: 'bespoke_generate',
      foundation: args.foundation,
      expectedVersion: args.workspace.draftVersion,
      expectedWorkspaceHash: args.workspace.draftSourceHash,
      sourceHash: null,
      prompt: null,
      idempotencyKey,
      requestHash: jobInput.requestHash,
      configuration,
      monthlyCap: args.monthlyCap,
    });
  };

  let result = await create();
  if (result.ok && isMatchingFoundationJob(result.job, match)) return result;
  if (
    !result.ok &&
    (result.reason === 'quota_exceeded' || result.reason === 'workspace_conflict')
  ) {
    return result;
  }

  const supersededAuditIds = await supersedeActiveProJobs(args.slug, args.clerkUserId);
  await Promise.all(
    supersededAuditIds.map((auditId) =>
      updateSouqyAudit(auditId, {
        status: 'build_failed',
        meta: { surface: 'pro', errorCode: 'superseded' },
      }).catch(() => {}),
    ),
  );
  result = await create();
  if (!result.ok || !isMatchingFoundationJob(result.job, match)) {
    if (!result.ok) return result;
    throw new Error('Conflicting Pro foundation job');
  }
  return { ok: true, job: result.job, created: result.created };
}

export async function completeProOnboardingAction(
  input: z.input<typeof OnboardingSchema>,
): Promise<ProActionResult<{ version: number }>> {
  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid onboarding request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    await completeProOnboarding(gate.userId, parsed.data.version);
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.onboarding_complete',
      summary: 'Completed Souqna Pro onboarding',
      meta: { version: parsed.data.version },
    });
    return { ok: true, data: { version: parsed.data.version } };
  } catch {
    return error('write_failed', 'Could not save onboarding progress.');
  }
}

export async function setProEditorModeAction(
  input: z.input<typeof ModeInputSchema>,
): Promise<ProActionResult<{ mode: 'easy' | 'pro' }>> {
  const parsed = ModeInputSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid mode request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const workspace = await setProWorkspaceMode(parsed.data.slug, parsed.data.mode);
    if (!workspace) return error('workspace_missing', 'Choose a Pro foundation first.');
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.mode_change',
      summary: `Changed editor mode to ${parsed.data.mode}`,
      meta: { mode: parsed.data.mode },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { mode: parsed.data.mode } };
  } catch {
    return error('write_failed', 'Could not change the editor mode.');
  }
}

export async function initializeProWorkspaceAction(
  input: z.input<typeof InitializeSchema>,
): Promise<ProActionResult<{ workspace: ProWorkspaceSnapshot; job: ProJobSnapshot }>> {
  const parsed = InitializeSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid foundation request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  if (!rateLimit(`pro:foundation:${gate.userId}:${parsed.data.slug}`, 5, 60_000).ok) {
    return error('rate_limited', 'Please wait before changing foundations again.');
  }

  try {
    const source = getCuratedFoundationSource(parsed.data.foundation) ?? '';
    const monthlyCap =
      parsed.data.foundation === 'bespoke' ? souqyMonthlyCap(await getSouqyTier(gate.userId)) : 0;
    const current = await getProWorkspace(parsed.data.slug);
    const creatingFirstWorkspace = !current;
    if (!current && !parsed.data.easySnapshotId) {
      return error(
        'snapshot_required',
        'Save an Easy recovery point before creating the first Pro workspace.',
      );
    }
    let workspace: ProWorkspaceSnapshot;

    if (
      current &&
      isAppliedFoundationRecovery({
        workspace: current,
        foundation: parsed.data.foundation,
        source,
        reviewedVersion: parsed.data.expectedVersion,
      })
    ) {
      workspace = current;
    } else {
      if (current?.foundation === parsed.data.foundation) {
        return error('already_selected', 'This foundation is already selected.', current);
      }
      if (current) {
        if (!parsed.data.confirmReplace) {
          return error(
            'confirmation_required',
            'Confirm replacing the current Pro draft.',
            current,
          );
        }
        if (
          parsed.data.expectedVersion == null ||
          current.draftVersion !== parsed.data.expectedVersion
        ) {
          return error(
            'conflict',
            'The Pro draft changed before this foundation was selected. Review it and try again.',
            current,
          );
        }
      } else if (parsed.data.expectedVersion != null) {
        return error(
          'conflict',
          'The Pro draft changed before this foundation was selected. Review it and try again.',
          null,
        );
      }

      if (current) {
        // Audit and workspace writes are separate. Snapshot first so an audit failure is
        // non-destructive; a losing CAS may retain an extra immutable snapshot.
        const snapshotId = await logSouqyAudit({
          clerkUserId: gate.userId,
          storefront: parsed.data.slug,
          kind: 'pro_snapshot',
          status: 'success',
          source: current.draftSource,
          meta: {
            foundation: current.foundation,
            version: current.draftVersion,
            reason: 'foundation_change',
          },
        });
        if (snapshotId == null) {
          return error('write_failed', 'Could not preserve the current Pro draft.', current);
        }
      }

      const initialized = await initializeProWorkspace({
        slug: parsed.data.slug,
        foundation: parsed.data.foundation,
        source,
        expectedVersion: parsed.data.expectedVersion,
        easySnapshotId: parsed.data.easySnapshotId ?? null,
      });
      if (!initialized.ok) {
        if (
          initialized.workspace &&
          isAppliedFoundationRecovery({
            workspace: initialized.workspace,
            foundation: parsed.data.foundation,
            source,
            reviewedVersion: parsed.data.expectedVersion,
          })
        ) {
          workspace = initialized.workspace;
        } else if (initialized.workspace?.foundation === parsed.data.foundation) {
          return error(
            'already_selected',
            'This foundation is already selected.',
            initialized.workspace,
          );
        } else {
          return error(
            'conflict',
            'The Pro draft changed before this foundation was selected. Review it and try again.',
            initialized.workspace,
          );
        }
      } else {
        workspace = initialized.workspace;
      }
    }

    const created = await ensureFoundationJob({
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
      foundation: parsed.data.foundation,
      workspace,
      source,
      monthlyCap,
    });
    if (!created.ok) {
      if (creatingFirstWorkspace && parsed.data.easySnapshotId) {
        await removeUnstartedProWorkspace({
          slug: parsed.data.slug,
          foundation: parsed.data.foundation,
          easySnapshotId: parsed.data.easySnapshotId,
        });
      }
      if (created.reason === 'quota_exceeded') {
        return error(
          'quota_exceeded',
          'Your Souqy generation allowance is used for this month.',
          creatingFirstWorkspace ? null : workspace,
        );
      }
      return created.reason === 'workspace_conflict'
        ? error('conflict', 'The Pro draft changed before the job could start.', workspace)
        : error('conflict', 'Another Pro job is already running for this storefront.', workspace);
    }

    if (created.job.souqyAuditId == null) {
      const auditId = await logSouqyAudit({
        clerkUserId: gate.userId,
        storefront: parsed.data.slug,
        kind: parsed.data.foundation === 'bespoke' ? 'generate' : 'pro_build',
        status: 'pending',
        source: source || null,
        creditCost: 0,
        meta: { surface: 'pro', foundation: parsed.data.foundation, jobId: created.job.id },
      });
      if (auditId == null) {
        return error('write_failed', 'Could not record the Pro preview build.', workspace);
      }
      await attachProJobAudit(created.job.id, auditId);
    }

    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.foundation_select',
      summary: `Selected ${parsed.data.foundation} Pro foundation`,
      meta: { foundation: parsed.data.foundation, jobId: created.job.id },
    });
    await logEvent({
      kind: 'pro.foundation_selected',
      funnel: 'storefront',
      userId: gate.userId,
      props: { foundation: parsed.data.foundation },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { workspace, job: toProJobSnapshot(created.job) } };
  } catch {
    return error('write_failed', 'Could not initialize the Pro workspace.');
  }
}

export async function confirmProConversionAction(
  input: z.input<typeof ConfirmConversionSchema>,
): Promise<
  ProActionResult<{
    workspace: ProWorkspaceSnapshot;
    job: ProJobSnapshot;
    snapshot: StorefrontSnapshotSummary;
  }>
> {
  const parsed = ConfirmConversionSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid Pro conversion request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  if (!rateLimit(`pro:conversion:${gate.userId}:${parsed.data.slug}`, 5, 60_000).ok) {
    return error('rate_limited', 'Please wait before trying the conversion again.');
  }

  try {
    const existingWorkspace = await getProWorkspace(parsed.data.slug);
    if (existingWorkspace) {
      return error(
        'already_selected',
        'This storefront already has a Pro workspace.',
        existingWorkspace,
      );
    }
    await ensureEasyDraftManifest(parsed.data.slug, gate.userId);
    const source = getCuratedFoundationSource(parsed.data.foundation) ?? '';
    const recommendation = recommendProFoundation(parsed.data.brandIntent, {
      locale: gate.storefront.locale,
      businessType: gate.storefront.businessType,
      design: gate.storefront.design,
      hasLogo: Boolean(gate.storefront.logoUrl),
      hasTagline: Boolean(gate.storefront.tagline),
      isPublished: gate.storefront.isPublished,
    });
    const captured = await captureEasySnapshotAndInitializeProWorkspace({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      expectedEasyVersion: parsed.data.expectedEasyVersion,
      consentVersion: parsed.data.consentVersion,
      foundation: parsed.data.foundation,
      source,
      brandIntent: parsed.data.brandIntent,
      recommendationVersion: parsed.data.recommendationVersion,
    });
    if (!captured.ok) {
      return captured.reason === 'snapshot_stale'
        ? error(
            'snapshot_stale',
            'Easy changed in another tab. Review the latest draft and confirm again.',
          )
        : error('write_failed', 'Could not save the Easy recovery point.');
    }

    try {
      await recordAudit({
        storefrontSlug: parsed.data.slug,
        clerkUserId: gate.userId,
        action: 'pro.easy_snapshot_create',
        targetId: captured.snapshot.id,
        summary: 'Saved an immutable Easy recovery point before Pro conversion',
        meta: {
          foundation: parsed.data.foundation,
          consentVersion: parsed.data.consentVersion,
          pageCount: captured.snapshot.pageCount,
          wasPublished: captured.snapshot.wasPublished,
          matchedRecommendation: parsed.data.foundation === recommendation.foundation,
          recommendationVersion: parsed.data.recommendationVersion,
        },
      });
    } catch {
      if (captured.workspaceCreated) {
        await removeUnstartedProWorkspace({
          slug: parsed.data.slug,
          foundation: parsed.data.foundation,
          easySnapshotId: captured.snapshot.id,
        });
      }
      return error('write_failed', 'Could not record the Easy recovery point.');
    }

    const initialized = await initializeProWorkspaceAction({
      slug: parsed.data.slug,
      foundation: parsed.data.foundation,
      confirmReplace: false,
      expectedVersion: null,
      easySnapshotId: captured.snapshot.id,
    });
    if (!initialized.ok) {
      if (captured.workspaceCreated) {
        await removeUnstartedProWorkspace({
          slug: parsed.data.slug,
          foundation: parsed.data.foundation,
          easySnapshotId: captured.snapshot.id,
        });
      }
      return initialized;
    }

    revalidatePath('/account/storage');
    revalidatePath('/account/storage-library');
    const snapshot = toStorefrontSnapshotSummary(captured.snapshot);
    return {
      ok: true,
      data: {
        ...initialized.data,
        snapshot,
      },
    };
  } catch {
    return error('write_failed', 'Could not initialize the Pro workspace.');
  }
}

export async function saveProSourceAction(
  input: z.input<typeof SaveSchema>,
): Promise<ProActionResult<{ workspace: ProWorkspaceSnapshot }>> {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'The source is invalid or too large.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const source = serializeSouqySource(parsed.data.files);
    const saved = await saveProWorkspaceDraft({
      slug: parsed.data.slug,
      source,
      expectedVersion: parsed.data.expectedVersion,
    });
    if (!saved.ok) {
      return error(
        'conflict',
        'This draft changed in another tab. Reload before saving.',
        saved.workspace,
      );
    }
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { workspace: saved.workspace } };
  } catch {
    return error('write_failed', 'Could not save the Pro source.');
  }
}

export async function createProBuildAction(
  input: z.input<typeof BuildSchema>,
): Promise<ProActionResult<{ job: ProJobSnapshot }>> {
  const parsed = BuildSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid build request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  if (!rateLimit(`pro:build:${gate.userId}:${parsed.data.slug}`, 10, 60_000).ok) {
    return error('rate_limited', 'Too many builds. Please wait a moment.');
  }
  try {
    const workspace = await getProWorkspace(parsed.data.slug);
    if (!workspace) return error('workspace_missing', 'Choose a Pro foundation first.');
    if (workspace.draftVersion !== parsed.data.expectedVersion) {
      return error('conflict', 'The draft changed before the build started.', workspace);
    }
    if (!parseSouqySource(workspace.draftSource)) {
      return error('invalid_request', 'The Pro source is incomplete.');
    }
    const sessionId = await ownedSessionId({
      sessionId: parsed.data.sessionId,
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
    });
    if (sessionId === false) return error('not_owner', 'Pro session not found.');
    const created = await createProJob({
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
      kind: 'manual_build',
      foundation: workspace.foundation,
      expectedVersion: workspace.draftVersion,
      sourceHash: workspace.draftSourceHash,
      candidateSource: workspace.draftSource,
      idempotencyKey: `pro:${parsed.data.slug}:manual:${workspace.draftVersion}:${workspace.draftSourceHash}`,
      sessionId,
    });
    if (created.created) {
      const auditId = await logSouqyAudit({
        clerkUserId: gate.userId,
        storefront: parsed.data.slug,
        kind: 'pro_build',
        status: 'pending',
        source: workspace.draftSource,
        meta: { surface: 'pro', foundation: workspace.foundation, jobId: created.job.id },
      });
      if (auditId != null) await attachProJobAudit(created.job.id, auditId);
    }
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.build_start',
      summary: 'Started a Pro preview build',
      meta: { jobId: created.job.id, kind: created.job.kind },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { job: toProJobSnapshot(created.job) } };
  } catch {
    return error('write_failed', 'Could not start the Pro preview build.');
  }
}

export async function setProAiConfigurationAction(
  input: z.input<typeof AiPreferenceSchema>,
): Promise<ProActionResult<{ workspace: ProWorkspaceSnapshot }>> {
  const parsed = AiPreferenceSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid model preference.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  const selectedPreference =
    parsed.data.preferences.models[parsed.data.preferences.selectedModelId];
  const resolved = resolveProAiConfiguration({
    modelId: parsed.data.preferences.selectedModelId,
    reasoning: selectedPreference?.reasoning,
    speed: selectedPreference?.speed,
    catalogVersion: parsed.data.preferences.catalogVersion,
  });
  if (!resolved.ok) {
    return error(
      resolved.error === 'catalog_outdated'
        ? 'catalog_outdated'
        : resolved.error === 'model_not_allowed'
          ? 'model_not_allowed'
          : 'configuration_invalid',
      resolved.error === 'catalog_outdated'
        ? 'The model catalog changed. Refresh before saving this preference.'
        : resolved.error === 'model_not_allowed'
          ? 'This model is not enabled for Souqna Pro.'
          : 'This model does not support the selected configuration.',
    );
  }
  try {
    const saved = await saveProAiPreferences({
      slug: parsed.data.slug,
      preferences: parsed.data.preferences,
      expectedPreferencesVersion: parsed.data.expectedPreferencesVersion,
    });
    if (!saved.ok) {
      return error(
        'conflict',
        'Model preferences changed in another tab. Review the latest selection.',
        saved.workspace,
      );
    }
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.ai_configuration_change',
      summary: 'Changed the Souqna Pro AI configuration',
      meta: {
        modelId: resolved.configuration.modelId,
        reasoning: resolved.configuration.reasoning,
        speed: resolved.configuration.speed,
        creditCost: resolved.configuration.creditCost,
        catalogVersion: resolved.configuration.catalogVersion,
      },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { workspace: saved.workspace } };
  } catch {
    return error('write_failed', 'Could not save the model preference.');
  }
}

export async function createProAiEditAction(
  input: z.input<typeof AiEditSchema>,
): Promise<ProActionResult<{ job: ProJobSnapshot }>> {
  const parsed = AiEditSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Describe the requested change.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  if (!rateLimit(`pro:ai:${gate.userId}:${parsed.data.slug}`, 6, 60_000).ok) {
    return error('rate_limited', 'Too many AI edits. Please wait a moment.');
  }
  try {
    const workspace = await getProWorkspace(parsed.data.slug);
    if (!workspace) return error('workspace_missing', 'Choose a Pro foundation first.');
    if (workspace.draftVersion !== parsed.data.expectedVersion) {
      return error('conflict', 'The draft changed before the edit started.', workspace);
    }
    const sessionId = await ownedSessionId({
      sessionId: parsed.data.sessionId,
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
    });
    if (sessionId === false) return error('not_owner', 'Pro session not found.');
    const resolved = resolveProAiConfiguration({
      modelId: parsed.data.modelId,
      reasoning: parsed.data.reasoning,
      speed: parsed.data.speed,
      catalogVersion: parsed.data.catalogVersion,
    });
    if (!resolved.ok) {
      const code =
        resolved.error === 'catalog_outdated'
          ? 'catalog_outdated'
          : resolved.error === 'model_not_allowed'
            ? 'model_not_allowed'
            : 'configuration_invalid';
      return error(
        code,
        resolved.error === 'catalog_outdated'
          ? 'The model catalog changed. Refresh before sending this request.'
          : resolved.error === 'model_not_allowed'
            ? 'This model is not enabled for Souqna Pro.'
            : 'This model does not support the selected configuration.',
        workspace,
      );
    }
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          request: parsed.data.request,
          target: parsed.data.target ?? null,
          intent: parsed.data.intent ?? null,
          sourceVersion: workspace.draftVersion,
          sourceHash: workspace.draftSourceHash,
          configuration: resolved.configuration,
        }),
      )
      .digest('hex');
    const monthlyCap = souqyMonthlyCap(await getSouqyTier(gate.userId));
    const created = await createProAiJobWithCreditReservation({
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
      kind: 'ai_edit',
      foundation: workspace.foundation,
      expectedVersion: workspace.draftVersion,
      expectedWorkspaceHash: workspace.draftSourceHash,
      sourceHash: workspace.draftSourceHash,
      prompt: parsed.data.request,
      target: parsed.data.target ?? null,
      intent: parsed.data.intent ?? null,
      idempotencyKey: `pro:${parsed.data.slug}:ai:${workspace.draftVersion}:${workspace.draftSourceHash}:${resolved.configuration.catalogVersion}:${requestHash}`,
      requestHash,
      configuration: resolved.configuration,
      monthlyCap,
      sessionId,
    });
    if (!created.ok) {
      if (created.reason === 'quota_exceeded') {
        return error(
          'quota_exceeded',
          'Your Souqy generation allowance is used for this month.',
          workspace,
        );
      }
      return created.reason === 'workspace_conflict'
        ? error('conflict', 'The Pro draft changed before the edit could start.', workspace)
        : error('conflict', 'Another Pro job is already running for this storefront.', workspace);
    }
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.ai_edit_start',
      summary: 'Started a Souqy Pro code edit',
      meta: {
        jobId: created.job.id,
        modelId: resolved.configuration.modelId,
        reasoning: resolved.configuration.reasoning,
        speed: resolved.configuration.speed,
        creditCost: resolved.configuration.creditCost,
        catalogVersion: resolved.configuration.catalogVersion,
      },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { job: toProJobSnapshot(created.job) } };
  } catch {
    return error('write_failed', 'Could not start the Souqy Pro edit.');
  }
}

export async function retryProJobAction(
  input: z.input<typeof RetrySchema>,
): Promise<ProActionResult<{ job: ProJobSnapshot }>> {
  const parsed = RetrySchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid retry request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  if (!rateLimit(`pro:retry:${gate.userId}:${parsed.data.slug}`, 6, 60_000).ok) {
    return error('rate_limited', 'Too many retries. Please wait a moment.');
  }
  try {
    const existing = await getProJob(parsed.data.jobId);
    if (
      !existing ||
      existing.storefrontSlug !== parsed.data.slug ||
      existing.clerkUserId !== gate.userId
    ) {
      return error('job_not_found', 'Build job not found.');
    }
    const workspace = await getProWorkspace(parsed.data.slug);
    if (!workspace || workspace.draftVersion !== existing.expectedVersion) {
      return error(
        'conflict',
        'The draft changed after this job failed. Build the current version instead.',
        workspace,
      );
    }
    let retried: ProJobRecord | null = null;
    if (
      existing.configuration &&
      (existing.kind === 'bespoke_generate' || existing.kind === 'ai_edit')
    ) {
      const monthlyCap = souqyMonthlyCap(await getSouqyTier(gate.userId));
      const reservation = await retryProAiJobWithCreditReservation({
        jobId: existing.id,
        clerkUserId: gate.userId,
        monthlyCap,
      });
      if (!reservation.ok) {
        if (reservation.reason === 'quota_exceeded') {
          return error(
            'quota_exceeded',
            'Your Souqy generation allowance is used for this month.',
            workspace,
          );
        }
        if (reservation.reason === 'active_job') {
          return error('conflict', 'Another Pro job is already running.', workspace);
        }
        if (reservation.reason === 'workspace_conflict') {
          return error(
            'conflict',
            'The Pro draft changed after this job failed. Build the current version instead.',
            workspace,
          );
        }
        return error('write_failed', 'This job cannot be retried.');
      }
      retried = reservation.job;
    } else {
      retried = await retryProJob(parsed.data.jobId, gate.userId);
    }
    if (!retried) return error('write_failed', 'This job cannot be retried.');
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.job_retry',
      summary: 'Retried a Pro build job',
      meta: { jobId: retried.id, kind: retried.kind },
    });
    refreshProPaths(parsed.data.slug);
    return { ok: true, data: { job: toProJobSnapshot(retried) } };
  } catch {
    return error('write_failed', 'Could not retry this Pro job.');
  }
}

export async function publishProBuildAction(
  input: z.input<typeof PublishSchema>,
): Promise<ProActionResult<{ revision: string }>> {
  const parsed = PublishSchema.safeParse(input);
  if (!parsed.success) return error('invalid_request', 'Invalid publish request.');
  const gate = await guardProStore(parsed.data.slug);
  if (!gate.ok) return gate.result;
  try {
    const workspace = await getProWorkspace(parsed.data.slug);
    if (!workspace) return error('workspace_missing', 'Choose a Pro foundation first.');
    if (
      workspace.draftVersion !== parsed.data.expectedVersion ||
      workspace.draftSourceHash !== parsed.data.sourceHash ||
      !isProPublishReady(workspace)
    ) {
      return error('build_required', 'Build the current draft before publishing.', workspace);
    }
    const revision = workspace.builtRevision;
    if (!revision) {
      return error('build_required', 'Build the current draft before publishing.', workspace);
    }
    const sessionId = await ownedSessionId({
      sessionId: parsed.data.sessionId,
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
    });
    if (sessionId === false) return error('not_owner', 'Pro session not found.');
    const published = await publishProWorkspace({
      slug: parsed.data.slug,
      clerkUserId: gate.userId,
      expectedVersion: parsed.data.expectedVersion,
      sourceHash: parsed.data.sourceHash,
      sessionId,
    });
    if (!published) {
      return error(
        'conflict',
        'The draft changed before it could be published.',
        await getProWorkspace(parsed.data.slug),
      );
    }
    await logSouqyAudit({
      clerkUserId: gate.userId,
      storefront: parsed.data.slug,
      kind: 'pro_publish',
      status: 'success',
      source: workspace.draftSource,
      meta: { revision, sourceHash: workspace.draftSourceHash },
    });
    await recordAudit({
      storefrontSlug: parsed.data.slug,
      clerkUserId: gate.userId,
      action: 'pro.publish',
      summary: 'Published the Pro storefront',
      meta: { revision, foundation: workspace.foundation },
    });
    await logEvent({
      kind: 'pro.published',
      funnel: 'storefront',
      userId: gate.userId,
      props: { foundation: workspace.foundation },
    });
    refreshProPaths(parsed.data.slug);
    revalidatePath(`/brief/${parsed.data.slug}`, 'layout');
    return { ok: true, data: { revision } };
  } catch {
    return error('write_failed', 'Could not publish the Pro storefront.');
  }
}
