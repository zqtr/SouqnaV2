import { auth } from '@clerk/nextjs/server';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertStorefrontOwner } from '@/lib/products';
import { rateLimit } from '@/lib/rate-limit';
import { getProAccess } from '@/lib/pro/entitlement';
import { runProJobStep } from '@/lib/pro/jobs';
import { getProJob, toProJobSnapshot } from '@/lib/proState';

export const runtime = 'nodejs';
export const maxDuration = 240;
const JobIdSchema = z.string().uuid();

async function accessJob(jobId: string, requireEligible: boolean) {
  if (!JobIdSchema.safeParse(jobId).success) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 }),
    };
  }
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        ok: false as const,
        response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
      };
    }
    const job = await getProJob(jobId);
    if (!job || job.clerkUserId !== userId) {
      return {
        ok: false as const,
        response: NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 }),
      };
    }
    const [pro, owner] = await Promise.all([
      getProAccess(userId),
      assertStorefrontOwner(job.storefrontSlug, userId),
    ]);
    if (!pro.enabled || !owner) {
      return {
        ok: false as const,
        response: NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 }),
      };
    }
    if (requireEligible && !pro.eligible) {
      return {
        ok: false as const,
        response: NextResponse.json({ ok: false, error: 'pro_plan_required' }, { status: 403 }),
      };
    }
    return { ok: true as const, userId, job };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'temporarily_unavailable' }, { status: 503 }),
    };
  }
}

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const access = await accessJob(params.jobId, false);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, job: toProJobSnapshot(access.job) });
}

export async function POST(_request: Request, { params }: { params: { jobId: string } }) {
  const access = await accessJob(params.jobId, true);
  if (!access.ok) return access.response;
  if (!rateLimit(`pro:job:${access.userId}:${params.jobId}`, 30, 60_000).ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }
  let result: Awaited<ReturnType<typeof runProJobStep>>;
  try {
    result = await runProJobStep(params.jobId, access.userId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { surface: 'pro_job_runner', operation: 'run_step' },
    });
    return NextResponse.json(
      { ok: false, error: 'job_step_failed', job: toProJobSnapshot(access.job) },
      { status: 500 },
    );
  }
  return NextResponse.json(
    result.ok
      ? {
          ok: true,
          job: toProJobSnapshot(result.job),
          terminal: result.terminal,
          busy: result.busy ?? false,
        }
      : {
          ok: false,
          error: result.message,
          job: result.job ? toProJobSnapshot(result.job) : null,
        },
    { status: result.ok ? 200 : 422 },
  );
}
