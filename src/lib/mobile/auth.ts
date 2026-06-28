import 'server-only';

import { auth, clerkClient, currentUser, verifyToken } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPlan, getPlanMeta, listPlanHistory, planUnlocksOnlinePayments } from '@/lib/billing';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { assertStorefrontAccess, type StorefrontAccess } from '@/lib/products';
import { PLAN_LIMITS, priceFor, type BillingCycle, type Plan } from '@/lib/plans';
import { getSouqyMonthlyCount } from '@/lib/souqy/db';
import { storefrontBaseUrl } from '@/lib/storefrontUrl';
import {
  CAPABILITIES,
  resolveCapabilities,
  type Capability,
  type Role,
} from '@/lib/team/capabilities';
import type { Storefront } from '@/lib/brief';
import { getStorefront } from '@/lib/brief';

export type MobileUser = {
  userId: string;
  name: string | null;
  email: string | null;
  username: string | null;
};

export type MobileStoreSummary = {
  slug: string;
  businessName: string;
  contactEmail: string;
  logoUrl: string | null;
  locale: Storefront['locale'];
  role: Role;
  capabilities: Record<Capability, boolean>;
  isPublished: boolean;
  customDomain: string | null;
  subdomainStatus: Storefront['subdomainStatus'];
  publicUrl: string;
  ownerClerkUserId: string;
  createdAt: string;
};

export type MobileBillingSummary = {
  plan: Plan;
  label: string;
  labelAr: string;
  status:
    | 'free'
    | 'active'
    | 'pending'
    | 'cancelled'
    | 'suspended'
    | 'expired'
    | 'failed'
    | 'manual';
  provider: 'skipcash' | 'manual' | null;
  cycle: BillingCycle | null;
  monthlyPriceQar: number;
  effectivePriceQar: number;
  storefrontLimit: number | null;
  templateCount: number;
  canAcceptOnlinePayments: boolean;
  currentPeriodEnd: string | null;
  nextBillingTime: string | null;
  subscriptionId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  credits: {
    monthlyIncluded: number | null;
    monthlyIncludedLabel: string;
    balanceAvailable: boolean;
    currentBalance: number | null;
    usedThisMonth: number | null;
    remainingThisMonth: number | null;
    resetDate: string | null;
    topUpsAvailable: boolean;
    addCreditsUrl: string | null;
    trackedSouqyGenerationsThisMonth: number;
    note: string;
  };
  history: Array<{
    id: string;
    fromPlan: string | null;
    toPlan: string;
    cycle: string | null;
    source: string;
    createdAt: string;
  }>;
};

type MemberStoreRow = {
  slug: string;
  locale: Storefront['locale'];
  business_name: string;
  contact_email: string;
  logo_url: string | null;
  is_published: boolean;
  custom_domain: string | null;
  subdomain_status: Storefront['subdomainStatus'] | null;
  clerk_user_id: string;
  created_at: string;
  role: Role;
  capabilities: unknown;
};

type ClerkUserProfile = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id?: string | null;
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  }>;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

export function mobileJson(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      ...(init?.headers ?? {}),
    },
  });
}

export function mobileOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

export function mobileError(status: number, code: string, message: string): NextResponse {
  return mobileJson({ error: code, message }, { status });
}

export async function requireMobileUser(): Promise<
  { ok: true; user: MobileUser } | { ok: false; response: NextResponse }
> {
  const user = await resolveMobileUser();
  if (!user) {
    return {
      ok: false,
      response: mobileError(401, 'unauthorized', 'Sign in to use Souqna mobile.'),
    };
  }

  return { ok: true, user };
}

async function resolveMobileUser(): Promise<MobileUser | null> {
  const devUser = await resolveDevMobileUser();
  if (devUser) return devUser;

  const { userId } = await auth();
  if (userId) {
    const user = await currentUser().catch(() => null);
    return toMobileUser(userId, {
      email: primaryEmail(user),
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      username: user?.username ?? null,
    });
  }

  const bearerToken = await readBearerToken();
  if (!bearerToken || !env.CLERK_SECRET_KEY) return null;

  const verified = await verifyToken(bearerToken, {
    secretKey: env.CLERK_SECRET_KEY,
  }).catch(() => null);
  const bearerUserId = verified?.sub ?? null;
  if (!bearerUserId) return null;

  const user = await clerkClient()
    .then((client) => client.users.getUser(bearerUserId))
    .catch(() => null);

  return toMobileUser(bearerUserId, {
    email: primaryEmail(user),
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    username: user?.username ?? null,
  });
}

async function resolveDevMobileUser(): Promise<MobileUser | null> {
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.SOUQNA_MOBILE_DEV_AUTH !== '1') return null;

  const expectedToken = process.env.SOUQNA_MOBILE_DEV_TOKEN?.trim();
  const userId = process.env.SOUQNA_MOBILE_DEV_USER_ID?.trim();
  if (!expectedToken || !userId) return null;

  const actualToken = (await headers()).get('x-souqna-mobile-dev-token')?.trim();
  if (actualToken !== expectedToken) return null;

  return toMobileUser(userId, {
    email: process.env.SOUQNA_MOBILE_DEV_EMAIL?.trim() || null,
    firstName: process.env.SOUQNA_MOBILE_DEV_NAME?.trim() || 'Souqna',
    lastName: null,
    username: 'mobile-dev',
  });
}

async function readBearerToken(): Promise<string | null> {
  const authorization = (await headers()).get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

function toMobileUser(
  userId: string,
  user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  },
): MobileUser {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || null;

  return { userId, email: user.email, name, username: user.username };
}

function primaryEmail(user: ClerkUserProfile | null | undefined): string | null {
  const emails = user?.emailAddresses ?? [];
  const primary = emails.find((email) => email.id === user?.primaryEmailAddressId);
  if (primary?.verification?.status === 'verified' && primary.emailAddress) {
    return primary.emailAddress;
  }

  return (
    primary?.emailAddress ??
    emails.find((email) => email.verification?.status === 'verified')?.emailAddress ??
    emails[0]?.emailAddress ??
    null
  );
}

export async function requireMobileStoreAccess(
  slug: string | null,
  capability: Capability,
): Promise<
  { ok: true; user: MobileUser; access: StorefrontAccess } | { ok: false; response: NextResponse }
> {
  const user = await requireMobileUser();
  if (!user.ok) return user;
  if (!slug) {
    return {
      ok: false,
      response: mobileError(400, 'missing_store', 'Choose a storefront first.'),
    };
  }

  const access = await resolveMobileStoreAccess(slug, user.user, capability);
  if (!access) {
    return {
      ok: false,
      response: mobileError(403, 'forbidden', 'You do not have access to this store.'),
    };
  }

  return { ok: true, user: user.user, access };
}

async function resolveMobileStoreAccess(
  slug: string,
  user: MobileUser,
  capability: Capability,
): Promise<StorefrontAccess | null> {
  const direct = await assertStorefrontAccess(slug, user.userId, capability);
  if (direct) return direct;

  if (!user.email) return null;
  const storefront = await getStorefront(slug);
  if (!storefront || storefront.contactEmail.toLowerCase() !== user.email.toLowerCase()) {
    return null;
  }

  return { storefront, role: 'owner', capabilities: {} } as StorefrontAccess;
}

export async function listMobileStores(user: MobileUser): Promise<MobileStoreSummary[]> {
  const userEmail = user.email?.toLowerCase() ?? null;
  const ownerRows = (await db()`
    select slug, business_name, contact_email, logo_url, locale, is_published,
           custom_domain, subdomain_status, clerk_user_id, created_at
    from briefs
    where (
      clerk_user_id = ${user.userId}
      or (${userEmail}::text is not null and lower(contact_email) = ${userEmail})
    ) and expires_at > now()
    order by created_at desc
  `) as unknown as Array<{
    slug: string;
    business_name: string;
    contact_email: string;
    logo_url: string | null;
    locale: Storefront['locale'];
    is_published: boolean;
    custom_domain: string | null;
    subdomain_status: Storefront['subdomainStatus'] | null;
    clerk_user_id: string;
    created_at: string;
  }>;

  const memberRows = (await db()`
    select b.slug, b.business_name, b.contact_email, b.logo_url, b.locale, b.is_published,
           b.custom_domain, b.subdomain_status, b.clerk_user_id, b.created_at,
           m.role, m.capabilities
    from storefront_members m
    join briefs b on b.slug = m.storefront_slug
    where m.clerk_user_id = ${user.userId} and b.expires_at > now()
    order by b.created_at desc
  `) as unknown as MemberStoreRow[];

  const out = new Map<string, MobileStoreSummary>();
  for (const row of ownerRows) {
    out.set(row.slug, {
      slug: row.slug,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      logoUrl: row.logo_url,
      locale: row.locale,
      role: 'owner',
      capabilities: resolveCapabilities({ role: 'owner' }),
      isPublished: row.is_published,
      customDomain: row.custom_domain,
      subdomainStatus: row.subdomain_status ?? 'pending',
      publicUrl: mobilePublicUrl(row.slug, row.custom_domain),
      ownerClerkUserId: row.clerk_user_id,
      createdAt: new Date(row.created_at).toISOString(),
    });
  }
  for (const row of memberRows) {
    if (out.has(row.slug)) continue;
    const capabilities =
      row.capabilities && typeof row.capabilities === 'object'
        ? (row.capabilities as Partial<Record<Capability, boolean>>)
        : {};
    out.set(row.slug, {
      slug: row.slug,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      logoUrl: row.logo_url,
      locale: row.locale,
      role: row.role,
      capabilities: resolveCapabilities({ role: row.role, capabilities }),
      isPublished: row.is_published,
      customDomain: row.custom_domain,
      subdomainStatus: row.subdomain_status ?? 'pending',
      publicUrl: mobilePublicUrl(row.slug, row.custom_domain),
      ownerClerkUserId: row.clerk_user_id,
      createdAt: new Date(row.created_at).toISOString(),
    });
  }
  return [...out.values()].map((store) => ({
    ...store,
    capabilities: CAPABILITIES.reduce(
      (acc, cap) => ({ ...acc, [cap]: Boolean(store.capabilities[cap]) }),
      {} as Record<Capability, boolean>,
    ),
  }));
}

export async function getMobileBilling(userId: string): Promise<MobileBillingSummary> {
  const [plan, meta, history, trackedSouqyGenerationsThisMonth] = await Promise.all([
    getPlan(userId),
    getPlanMeta(userId),
    listPlanHistory(userId, 5),
    getSouqyMonthlyCount(userId),
  ]);
  const limits = PLAN_LIMITS[plan];
  const cycle =
    meta.skipcashPendingCycle === 'monthly' || meta.skipcashPendingCycle === 'annual'
      ? meta.skipcashPendingCycle
      : null;
  const provider =
    typeof meta.skipcashRecurringSubscriptionId === 'string' ||
    typeof meta.skipcashPaymentId === 'string'
      ? 'skipcash'
      : plan === 'free'
        ? null
        : 'manual';
  const rawStatus =
    typeof meta.subscriptionStatus === 'string'
      ? meta.subscriptionStatus.toLowerCase()
      : typeof meta.skipcashStatus === 'string'
        ? meta.skipcashStatus.toLowerCase()
        : null;
  const status = normalizeBillingStatus(plan, provider, rawStatus);

  return {
    plan,
    label: limits.label,
    labelAr: limits.labelAr,
    status,
    provider,
    cycle,
    monthlyPriceQar: limits.monthlyPriceQar,
    effectivePriceQar: priceFor(plan, cycle ?? 'monthly'),
    storefrontLimit: Number.isFinite(limits.storefronts) ? limits.storefronts : null,
    templateCount: limits.templateCount,
    canAcceptOnlinePayments: planUnlocksOnlinePayments(plan),
    currentPeriodEnd: typeof meta.currentPeriodEnd === 'string' ? meta.currentPeriodEnd : null,
    nextBillingTime: typeof meta.nextBillingTime === 'string' ? meta.nextBillingTime : null,
    subscriptionId:
      typeof meta.skipcashRecurringSubscriptionId === 'string'
        ? meta.skipcashRecurringSubscriptionId
        : typeof meta.subscriptionId === 'string'
          ? meta.subscriptionId
          : typeof meta.skipcashPaymentId === 'string'
            ? meta.skipcashPaymentId
            : null,
    cardBrand: null,
    cardLast4: null,
    credits: mobileCreditsSummary({
      monthlyCredits: limits.aiCreditsMonthly,
      trackedSouqyGenerationsThisMonth,
    }),
    history: history.map((entry) => ({
      id: entry.id,
      fromPlan: entry.fromPlan,
      toPlan: entry.toPlan,
      cycle: entry.cycle,
      source: entry.source,
      createdAt: entry.createdAt,
    })),
  };
}

function mobileCreditsSummary(args: {
  monthlyCredits: number;
  trackedSouqyGenerationsThisMonth: number;
}): MobileBillingSummary['credits'] {
  const monthlyIncluded = Number.isFinite(args.monthlyCredits) ? args.monthlyCredits : null;
  return {
    monthlyIncluded,
    monthlyIncludedLabel: monthlyIncluded == null ? 'Unlimited' : `${monthlyIncluded} / month`,
    balanceAvailable: false,
    currentBalance: null,
    usedThisMonth: null,
    remainingThisMonth: null,
    resetDate: monthlyIncluded == null ? null : nextMonthlyResetDate(),
    topUpsAvailable: false,
    addCreditsUrl: null,
    trackedSouqyGenerationsThisMonth: args.trackedSouqyGenerationsThisMonth,
    note: 'Credit wallet balance and top-ups are not available yet. This payload exposes the plan allowance and tracked Souqy generations for iOS display.',
  };
}

function nextMonthlyResetDate(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function mobilePublicUrl(slug: string, customDomain: string | null): string {
  return customDomain ? `https://${customDomain}` : storefrontBaseUrl(slug);
}

function normalizeBillingStatus(
  plan: Plan,
  provider: MobileBillingSummary['provider'],
  rawStatus: string | null,
): MobileBillingSummary['status'] {
  if (plan === 'free') return 'free';
  if (!provider || provider === 'manual') return 'manual';
  if (!rawStatus) return 'pending';
  if (rawStatus === 'active') return 'active';
  if (rawStatus === 'approval_pending' || rawStatus === 'approved' || rawStatus === 'pending') {
    return 'pending';
  }
  if (rawStatus === 'cancelled' || rawStatus === 'canceled') return 'cancelled';
  if (rawStatus === 'suspended') return 'suspended';
  if (rawStatus === 'expired') return 'expired';
  return 'failed';
}

export function searchParam(req: Request, key: string): string | null {
  const url = new URL(req.url);
  const value = url.searchParams.get(key)?.trim();
  return value || null;
}
