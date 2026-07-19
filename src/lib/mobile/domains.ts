import 'server-only';

import { revalidatePath } from 'next/cache';
import { recordAudit } from '@/lib/audit';
import { getPlan, planAtLeast } from '@/lib/billing';
import {
  getStorefront,
  markCustomDomainVerified,
  setCustomDomain,
  type Storefront,
} from '@/lib/brief';
import { invalidateCustomDomainCache } from '@/lib/customDomainLookup';
import { env } from '@/lib/env';
import { storefrontBaseUrl } from '@/lib/storefrontUrl';
import {
  addCustomDomain,
  getCustomDomainStatus,
  removeCustomDomain,
  type CustomDomainStatus,
} from '@/lib/vercelDomains';

/**
 * Custom-domain management for the mobile API. Mirrors the web server
 * actions in src/app/actions/customDomain.ts step-for-step, but takes
 * the already-authorized storefront instead of resolving a Clerk web
 * session (mobile callers authenticate via bearer token and are gated
 * through requireMobileStoreAccess(slug, 'domains.manage') first).
 *
 * Plan gating follows the store owner's plan — matching the web, where
 * the caller is always the owner.
 */

export type MobileDomainAction = 'attach' | 'verify' | 'detach';

export type MobileDomainResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; status: number; code: string; message: string };

const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function normalizeHost(raw: string): string | null {
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+.*$/, '')
    .replace(/^www\./, '');
  if (!trimmed || !HOSTNAME_RE.test(trimmed)) return null;
  const ownedRoots = [env.BRIEF_ROOT_DOMAIN, env.BRIEF_FALLBACK_ROOT_DOMAIN].filter(Boolean);
  if (ownedRoots.some((root) => trimmed === root || trimmed.endsWith(`.${root}`))) {
    return null;
  }
  if (/^\d+$/.test(trimmed.split('.')[0]!)) return null;
  return trimmed;
}

/**
 * The payload shape the app's Domains panel renders: root keys under
 * `domain`, with Vercel's CustomDomainStatus nested as `status`
 * (recommendedDns / pendingVerification / misconfigured / hasCert).
 */
export async function mobileDomainPayload(
  storefront: Storefront,
  freshStatus?: CustomDomainStatus | null,
): Promise<Record<string, unknown>> {
  const host = storefront.customDomain;
  let status: CustomDomainStatus | null = freshStatus ?? null;
  if (host && !status) {
    try {
      status = await getCustomDomainStatus(host);
    } catch {
      status = null;
    }
  }

  return {
    domain: {
      slug: storefront.slug,
      primaryDomain: `${storefront.slug}.${env.BRIEF_ROOT_DOMAIN}`,
      publicUrl: host ? `https://${host}` : storefrontBaseUrl(storefront.slug),
      customDomain: host,
      customDomainVerified: Boolean(
        storefront.customDomainVerifiedAt || (status?.verified && status.hasCert),
      ),
      subdomainStatus: storefront.subdomainStatus,
      status: status ?? {
        attached: Boolean(host),
        verified: false,
        misconfigured: false,
        hasCert: false,
        recommendedDns: [],
        pendingVerification: [],
      },
    },
  };
}

export async function runMobileDomainAction(args: {
  userId: string;
  storefront: Storefront;
  action: MobileDomainAction;
  domain?: string | null;
}): Promise<MobileDomainResult> {
  const { userId, storefront, action } = args;
  const slug = storefront.slug;

  if (action === 'attach') {
    const ownerPlan = await getPlan(storefront.clerkUserId);
    if (!planAtLeast(ownerPlan, 'starter')) {
      return {
        ok: false,
        status: 403,
        code: 'paywall',
        message: 'Custom domains are available on Pro and above.',
      };
    }

    const host = normalizeHost(args.domain ?? '');
    if (!host) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_host',
        message: 'That doesn’t look like a valid hostname.',
      };
    }

    const attach = await addCustomDomain(host);
    if (!attach.ok) {
      return { ok: false, status: 502, code: attach.code ?? 'attach_failed', message: attach.message };
    }

    const updated = await setCustomDomain(slug, host);
    if (!updated) {
      await removeCustomDomain(host);
      return {
        ok: false,
        status: 500,
        code: 'save_failed',
        message: 'Could not save the domain. Please try again.',
      };
    }

    invalidateCustomDomainCache(host);
    await recordAudit({
      storefrontSlug: slug,
      clerkUserId: userId,
      action: 'storefront.domain.attach',
      targetId: slug,
      summary: `Attached custom domain ${host}`,
      meta: { domain: host, vercelStatus: attach.status, source: 'mobile' },
    });

    let vercel: CustomDomainStatus | null = null;
    try {
      vercel = await getCustomDomainStatus(host);
      if (vercel.verified && vercel.hasCert) {
        await markCustomDomainVerified(slug, host);
      }
    } catch {
      // Best-effort — the founder can tap "Verify DNS" again.
    }

    revalidatePath('/account/settings/domain');
    const fresh = (await getStorefront(slug)) ?? updated;
    return { ok: true, payload: await mobileDomainPayload(fresh, vercel) };
  }

  if (action === 'verify') {
    const host = storefront.customDomain;
    if (!host) {
      return { ok: false, status: 400, code: 'no_domain', message: 'No domain attached.' };
    }

    let vercel: CustomDomainStatus | null = null;
    try {
      vercel = await getCustomDomainStatus(host);
    } catch {
      return {
        ok: false,
        status: 502,
        code: 'status_unavailable',
        message: 'Could not check the domain status. Try again.',
      };
    }
    if (vercel.verified && vercel.hasCert) {
      await markCustomDomainVerified(slug, host);
      invalidateCustomDomainCache(host);
    }

    revalidatePath('/account/settings/domain');
    const fresh = (await getStorefront(slug)) ?? storefront;
    return { ok: true, payload: await mobileDomainPayload(fresh, vercel) };
  }

  // detach — always allowed so a downgrade can clean up gracefully.
  const previous = storefront.customDomain;
  if (previous) {
    await removeCustomDomain(previous);
    invalidateCustomDomainCache(previous);
  }
  await setCustomDomain(slug, null);
  await recordAudit({
    storefrontSlug: slug,
    clerkUserId: userId,
    action: 'storefront.domain.detach',
    targetId: slug,
    summary: previous ? `Removed custom domain ${previous}` : 'Cleared custom domain',
    meta: { previous, source: 'mobile' },
  });

  revalidatePath('/account/settings/domain');
  const fresh = await getStorefront(slug);
  return {
    ok: true,
    payload: await mobileDomainPayload(fresh ?? { ...storefront, customDomain: null }),
  };
}
