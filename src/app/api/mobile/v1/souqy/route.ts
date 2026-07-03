import { z } from 'zod';
import { gateAtelierPro } from '@/lib/billing';
import { getSouqyAuditForStorefront } from '@/lib/souqy/db';
import { getSouqyAllowance } from '@/lib/souqy/credits';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const QuerySchema = z.object({
  store: z.string().trim().min(1),
});

export async function GET(req: Request): Promise<Response> {
  const parsed = QuerySchema.safeParse({ store: searchParam(req, 'store') });
  if (!parsed.success) {
    return mobileError(400, 'missing_store', 'Choose a storefront first.');
  }

  const gate = await requireMobileStoreAccess(parsed.data.store, 'builder.edit');
  if (!gate.ok) return gate.response;

  // Souqy is available to all tiers now (Free = 5/month); only auth is
  // required. Volume is reported via the tier allowance below.
  const planGate = await gateAtelierPro(gate.user.userId);
  if (!planGate.ok) {
    return mobileError(401, 'unauthenticated', 'Sign in to use Souqy.');
  }

  const [allowance, audit] = await Promise.all([
    getSouqyAllowance(gate.user.userId),
    getSouqyAuditForStorefront(gate.access.storefront.slug, 8),
  ]);
  const latest = audit[0] ?? null;

  return mobileJson({
    store: {
      slug: gate.access.storefront.slug,
      businessName: gate.access.storefront.businessName,
      locale: gate.access.storefront.locale,
    },
    access: {
      allowed: allowance.remaining > 0,
      reason: allowance.remaining > 0 ? 'ok' : 'quota_exhausted',
      souqyTier: allowance.tier,
      monthlyUsed: allowance.usedThisMonth,
      monthlyLimit: allowance.cap,
    },
    published: {
      revision: gate.access.storefront.souqyRevision,
      blobUrl: gate.access.storefront.souqyBlobUrl,
      hasSource: Boolean(gate.access.storefront.souqySource),
      briefSummary: briefSummary(gate.access.storefront.souqyBrief),
    },
    latest: latest
      ? {
          id: latest.id,
          occurredAt: latest.occurredAt.toISOString(),
          kind: latest.kind,
          status: latest.status,
          prompt: latest.prompt,
        }
      : null,
    audit: audit.map((entry) => ({
      id: entry.id,
      occurredAt: entry.occurredAt.toISOString(),
      kind: entry.kind,
      status: entry.status,
      prompt: entry.prompt,
      source: entry.source,
    })),
  });
}

function briefSummary(brief: unknown): string | null {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) return null;
  const record = brief as Record<string, unknown>;
  const parts = [record.businessName, record.businessType, record.locale]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
  return parts.length ? parts.join(' · ') : null;
}
