import 'server-only';
import { recordAudit } from '@/lib/audit';
import { getStorefront } from '@/lib/brief';
import { logEvent } from '@/lib/events';
import {
  advanceProJob,
  claimProJob,
  completeProJob,
  failProJob,
  getProJob,
  getProWorkspace,
  prepareProJobRepair,
  storeProJobCandidate,
  type ProJobRecord,
} from '@/lib/proState';
import { buildSouqyArtifact } from '@/lib/souqy/build';
import {
  generateSouqyStorefront,
  repairSouqyStorefrontBuild,
  repromptSouqyStorefront,
} from '@/lib/souqy/generate';
import { updateSouqyAudit } from '@/lib/souqy/db';
import { parseSouqySource, serializeSouqySource } from '@/lib/souqy/source';
import { validateSouqyOutput } from '@/lib/souqy/validate';
import {
  composeProEditRequest,
  nextProJobStatus,
  PRO_PROMPT_INTENTS,
  PRO_PROMPT_TARGETS,
} from '@/lib/proMode';

export type RunProJobResult =
  | { ok: true; job: ProJobRecord; terminal: boolean; busy?: boolean }
  | { ok: false; message: string; job: ProJobRecord | null };

function validationDiagnostics(issues: Array<{ file: string; line?: number; message: string }>) {
  return issues
    .map((issue) => `${issue.file}${issue.line ? `:${issue.line}` : ''} ${issue.message}`)
    .join('\n')
    .slice(0, 4000);
}

function publicFailureMessage(code: string): string {
  switch (code) {
    case 'validation_failed':
      return 'The source did not pass Souqna security validation.';
    case 'tsc_failed':
    case 'bundle_failed':
      return 'The TypeScript build failed. Review the diagnostics and retry.';
    case 'sandbox_failed':
    case 'upload_failed':
      return 'The preview builder is temporarily unavailable. Retry this job.';
    case 'model_unavailable':
      return 'The selected model is unavailable. Choose another model or retry later.';
    case 'budget_exceeded':
      return 'Souqy generation credits are temporarily unavailable. Retry later.';
    case 'rate_limited':
      return 'The selected model is busy. Wait a moment and retry.';
    case 'parse_failed':
      return 'The selected model returned an incomplete Pro draft. Retry this job.';
    default:
      return 'The Pro job could not finish. Retry when ready.';
  }
}

async function failClaimedJob(
  job: ProJobRecord,
  leaseToken: string,
  code: string,
  message: string,
  diagnostics?: string | null,
): Promise<RunProJobResult> {
  const failed = await failProJob({ jobId: job.id, leaseToken, code, message, diagnostics });
  if (job.souqyAuditId != null) {
    await updateSouqyAudit(job.souqyAuditId, {
      status: code === 'validation_failed' ? 'validation_failed' : 'build_failed',
      meta: { errorCode: code, surface: 'pro' },
    }).catch(() => {});
  }
  await recordAudit({
    storefrontSlug: job.storefrontSlug,
    clerkUserId: job.clerkUserId,
    action: 'pro.job_failed',
    summary: 'A Pro build job failed',
    meta: { jobId: job.id, kind: job.kind, errorCode: code },
  }).catch(() => {});
  return { ok: false, message, job: failed };
}

export async function runProJobStep(jobId: string, clerkUserId: string): Promise<RunProJobResult> {
  const existing = await getProJob(jobId);
  if (!existing || existing.clerkUserId !== clerkUserId) {
    return { ok: false, message: 'Job not found.', job: null };
  }
  if (existing.status === 'succeeded' || existing.status === 'failed') {
    return { ok: true, job: existing, terminal: true };
  }

  const job = await claimProJob(jobId, clerkUserId);
  if (!job?.leaseToken) {
    return { ok: true, job: existing, terminal: false, busy: true };
  }
  const leaseToken = job.leaseToken;

  try {
    if (job.status === 'queued') {
      const next = nextProJobStatus(job.kind);
      const advanced = await advanceProJob({
        jobId: job.id,
        leaseToken,
        expectedStatus: 'queued',
        nextStatus: next,
      });
      return advanced
        ? { ok: true, job: advanced, terminal: false }
        : { ok: false, message: 'Job state changed. Refresh and retry.', job: existing };
    }

    if (job.status === 'generating') {
      const [storefront, workspace] = await Promise.all([
        getStorefront(job.storefrontSlug),
        getProWorkspace(job.storefrontSlug),
      ]);
      if (!storefront || !workspace) {
        return failClaimedJob(
          job,
          leaseToken,
          'workspace_missing',
          'The Pro workspace no longer exists.',
        );
      }
      if (!job.configuration) {
        return failClaimedJob(
          job,
          leaseToken,
          'model_unavailable',
          'The saved model configuration is no longer available.',
        );
      }

      const generated =
        job.kind === 'ai_edit'
          ? await repromptSouqyStorefront({
              request: composeProEditRequest({
                request: job.prompt ?? '',
                target:
                  typeof job.meta.target === 'string' &&
                  PRO_PROMPT_TARGETS.includes(
                    job.meta.target as (typeof PRO_PROMPT_TARGETS)[number],
                  )
                    ? (job.meta.target as (typeof PRO_PROMPT_TARGETS)[number])
                    : null,
                intent:
                  typeof job.meta.intent === 'string' &&
                  PRO_PROMPT_INTENTS.includes(
                    job.meta.intent as (typeof PRO_PROMPT_INTENTS)[number],
                  )
                    ? (job.meta.intent as (typeof PRO_PROMPT_INTENTS)[number])
                    : null,
              }),
              previousSource: workspace.draftSource,
              storefront,
              clerkUserId,
              proConfiguration: job.configuration,
            })
          : await generateSouqyStorefront({
              brief: {
                businessName: storefront.businessName,
                slug: storefront.slug,
                businessType: storefront.businessType,
                vibe: [
                  'Create a distinctive, responsive Souqna Pro storefront.',
                  `Brand: ${storefront.businessName}.`,
                  storefront.tagline ? `Tagline: ${storefront.tagline}.` : '',
                  `Palette direction: ${storefront.palette}.`,
                  workspace.brandIntent
                    ? `Visual ambition: ${workspace.brandIntent.visualAmbition}. Customer feeling: ${workspace.brandIntent.customerFeeling}. Launch priority: ${workspace.brandIntent.launchPriority}.`
                    : '',
                  workspace.brandIntent?.note
                    ? `Merchant direction: ${workspace.brandIntent.note}`
                    : '',
                  'Use real catalogue data through the SDK. Keep Arabic and English equally intentional.',
                ]
                  .filter(Boolean)
                  .join(' '),
                locale: storefront.locale,
              },
              clerkUserId,
              storefront,
              proConfiguration: job.configuration,
            });

      if (generated.status !== 'ok') {
        return failClaimedJob(
          job,
          leaseToken,
          generated.status,
          publicFailureMessage(generated.status),
          generated.issues ? validationDiagnostics(generated.issues) : null,
        );
      }
      const source = serializeSouqySource(generated.output.files);
      const stored = await storeProJobCandidate({
        jobId: job.id,
        leaseToken,
        expectedStatus: 'generating',
        source,
        meta: { attempts: generated.attempts, usage: generated.usage },
      });
      return stored
        ? { ok: true, job: stored, terminal: false }
        : { ok: false, message: 'Job state changed. Refresh and retry.', job: existing };
    }

    if (job.status === 'validating') {
      const source =
        job.candidateSource ?? (await getProWorkspace(job.storefrontSlug))?.draftSource;
      const files = source ? parseSouqySource(source) : null;
      if (!source || !files) {
        return failClaimedJob(
          job,
          leaseToken,
          'validation_failed',
          'The Pro source is incomplete.',
        );
      }
      const validation = validateSouqyOutput(files);
      if (!validation.ok) {
        return failClaimedJob(
          job,
          leaseToken,
          'validation_failed',
          publicFailureMessage('validation_failed'),
          validationDiagnostics(validation.issues),
        );
      }
      const advanced = await advanceProJob({
        jobId: job.id,
        leaseToken,
        expectedStatus: 'validating',
        nextStatus: 'building',
      });
      return advanced
        ? { ok: true, job: advanced, terminal: false }
        : { ok: false, message: 'Job state changed. Refresh and retry.', job: existing };
    }

    if (job.status === 'repairing') {
      const source = job.candidateSource;
      const files = source ? parseSouqySource(source) : null;
      if (!source || !files) {
        return failClaimedJob(
          job,
          leaseToken,
          'validation_failed',
          'The generated source is incomplete.',
        );
      }
      if (!job.configuration) {
        return failClaimedJob(
          job,
          leaseToken,
          'model_unavailable',
          'The saved model configuration is no longer available.',
        );
      }
      const repaired = await repairSouqyStorefrontBuild({
        output: { files },
        errorSummary: job.diagnostics ?? 'TypeScript build failed.',
        clerkUserId,
        // Repairs are included in the original reservation and keep the
        // immutable model configuration the founder reviewed for this job.
        proConfiguration: job.configuration,
      });
      if (repaired.status !== 'ok') {
        return failClaimedJob(
          job,
          leaseToken,
          repaired.status,
          publicFailureMessage(repaired.status),
        );
      }
      const repairedSource = serializeSouqySource(repaired.output.files);
      const stored = await storeProJobCandidate({
        jobId: job.id,
        leaseToken,
        expectedStatus: 'repairing',
        source: repairedSource,
        meta: { repaired: true, repairAttempts: repaired.attempts, repairUsage: repaired.usage },
      });
      return stored
        ? { ok: true, job: stored, terminal: false }
        : { ok: false, message: 'Job state changed. Refresh and retry.', job: existing };
    }

    const source = job.candidateSource ?? (await getProWorkspace(job.storefrontSlug))?.draftSource;
    const files = source ? parseSouqySource(source) : null;
    if (!source || !files) {
      return failClaimedJob(job, leaseToken, 'validation_failed', 'The Pro source is incomplete.');
    }
    const built = await buildSouqyArtifact({ slug: job.storefrontSlug, files });
    if (built.status !== 'ok') {
      const mayRepair =
        (job.kind === 'bespoke_generate' || job.kind === 'ai_edit') &&
        (built.status === 'tsc_failed' || built.status === 'bundle_failed') &&
        Number(job.meta.repairCount ?? 0) < 1;
      if (mayRepair) {
        const repairing = await prepareProJobRepair({
          jobId: job.id,
          leaseToken,
          diagnostics: built.log ?? built.message,
        });
        return repairing
          ? { ok: true, job: repairing, terminal: false }
          : { ok: false, message: 'Job state changed. Refresh and retry.', job: existing };
      }
      return failClaimedJob(
        job,
        leaseToken,
        built.status,
        publicFailureMessage(built.status),
        built.log ?? null,
      );
    }

    const workspace = await completeProJob({
      job,
      leaseToken,
      source,
      revision: built.revision,
      blobUrl: built.blobUrl,
      bytes: built.bytes,
      buildMs: built.buildMs,
      applyCandidate: job.kind === 'bespoke_generate' || job.kind === 'ai_edit',
    });
    const completed = await getProJob(job.id);
    if (!workspace) {
      if (job.souqyAuditId != null) {
        await updateSouqyAudit(job.souqyAuditId, {
          status: 'build_failed',
          meta: { errorCode: 'workspace_conflict', surface: 'pro' },
        });
      }
      return {
        ok: false,
        message: 'The draft changed while the build was running.',
        job: completed,
      };
    }
    if (!completed) {
      return {
        ok: false,
        message: 'The completed job could not be reloaded.',
        job: null,
      };
    }
    if (job.souqyAuditId != null) {
      await updateSouqyAudit(job.souqyAuditId, {
        status: 'success',
        source,
        meta: {
          surface: 'pro',
          revision: built.revision,
          bytes: built.bytes,
          buildMs: built.buildMs,
        },
      });
    }
    await recordAudit({
      storefrontSlug: job.storefrontSlug,
      clerkUserId,
      action: 'pro.build_success',
      summary: 'Built a Pro storefront preview',
      meta: { jobId: job.id, kind: job.kind, bytes: built.bytes, buildMs: built.buildMs },
    });
    await logEvent({
      kind: 'pro.build_succeeded',
      funnel: 'storefront',
      userId: clerkUserId,
      props: { kind: job.kind, bytes: built.bytes, buildMs: built.buildMs },
    });
    return { ok: true, job: completed, terminal: true };
  } catch (caught) {
    console.error('[pro/job] step failed', {
      status: job.status,
      code: caught instanceof Error ? caught.name : 'unexpected_error',
    });
    return failClaimedJob(
      job,
      leaseToken,
      'unexpected_error',
      publicFailureMessage('unexpected_error'),
    );
  }
}
