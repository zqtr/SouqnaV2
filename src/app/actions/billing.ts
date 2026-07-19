'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { hasDb } from '@/lib/db';
import {
  getPlan,
  getPlanMeta,
  listPlanHistory,
  recordPlanHistory,
  setPlan,
  PLANS,
  type Plan,
} from '@/lib/billing';
import { priceFor, type BillingCycle } from '@/lib/plans';
import { logEvent } from '@/lib/events';
import { cancelSubscriptionFor, startSkipCashCheckoutFor } from '@/lib/billingCheckout';
import {
  getSkipCashPayment,
  hasSkipCash,
  normalizeSkipCashRecurringSubscriptionId,
  normalizeSkipCashStatusId,
} from '@/lib/skipcash';

/**
 * Billing actions — MVP slice.
 *
 * Phase 0 ships with a manual grant path so founders can be promoted to
 * any tier without a hosted checkout. The grant is gated by a server-only
 * `SOUQY_ADMIN_TOKEN` env var so an end-user
 * can't promote themselves; the Souqna operator passes the token
 * through their own admin tooling.
 *
 * Hosted checkout uses SkipCash; this action stays around for support overrides.
 */

const GrantSchema = z.object({
  clerkUserId: z.string().trim().min(1).max(128),
  token: z.string().trim().min(16),
  // Defaults to the top tier so existing tooling that previously called
  // `grantAtelierPro({ clerkUserId, token })` keeps promoting users to
  // the highest paid tier (now named `atelier`) without changes.
  plan: z.enum(PLANS).optional(),
});

export type BillingActionState =
  | { status: 'idle' }
  | { status: 'success'; plan: Plan }
  | { status: 'error'; message: string };

export async function grantPlan(input: z.input<typeof GrantSchema>): Promise<BillingActionState> {
  const parsed = GrantSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request' };
  if (!hasDb()) return { status: 'error', message: 'Database unavailable' };

  const expected = process.env.SOUQY_ADMIN_TOKEN ?? '';
  if (!expected || expected.length < 16) {
    return { status: 'error', message: 'Admin grant disabled' };
  }
  // Constant-time comparison to avoid timing oracles. Falls back to plain
  // !== when the strings differ in length (timingSafeEqual throws on
  // mismatched buffers).
  const a = Buffer.from(parsed.data.token);
  const b = Buffer.from(expected);
  const equal = a.length === b.length && (await import('node:crypto')).timingSafeEqual(a, b);
  if (!equal) return { status: 'error', message: 'Forbidden' };

  const targetPlan: Plan = parsed.data.plan ?? 'atelier';

  try {
    const before = await getPlan(parsed.data.clerkUserId);
    await setPlan(parsed.data.clerkUserId, targetPlan, { source: 'admin_grant' });
    await recordPlanHistory({
      clerkUserId: parsed.data.clerkUserId,
      fromPlan: before,
      toPlan: targetPlan,
      cycle: null,
      source: 'admin_grant',
    });
    await logEvent({
      kind: 'billing.granted',
      funnel: 'storefront',
      userId: parsed.data.clerkUserId,
      props: { plan: targetPlan, source: 'admin_grant' },
    });
    revalidatePath('/account');
    return { status: 'success', plan: targetPlan };
  } catch (err) {
    console.error('[grantPlan] failed', err);
    return { status: 'error', message: 'Grant failed' };
  }
}

/**
 * Backwards-compatible alias — earlier tooling called this name and a
 * grant always meant "top tier". Kept around so external operator
 * scripts don't break; new callers should prefer `grantPlan` and pass
 * an explicit `plan` field.
 */
export const grantAtelierPro = grantPlan;

/**
 * Lightweight read for client surfaces (the `/begin` Souqy card, the
 * dashboard). Returns the caller's plan or `'free'` on missing auth so
 * the UI can render the paywall affordance unconditionally.
 */
export async function getMyPlan(): Promise<Plan> {
  const { userId } = await auth();
  if (!userId) return 'free';
  return getPlan(userId);
}

/**
 * Logged paywall-hit ping. Surfaces in Souqna Pulse as a leading
 * indicator of paid-tier demand before checkout starts.
 */
/**
 * Self-serve checkout — creates a SkipCash hosted payment for the
 * requested (plan, cycle), and returns the hosted payment URL the
 * client should redirect to.
 *
 * Discriminated-union return so callers branch on a typed status
 * instead of try/catch. Never throws on the user-facing failure paths
 * (`unauthenticated`, `unavailable`, `invalid`) — UI just renders a
 * paywall / sign-in prompt.
 */
const StartCheckoutSchema = z.object({
  plan: z.enum(PLANS),
  cycle: z.enum(['monthly', 'annual']),
});

export type StartCheckoutResult =
  | { status: 'redirect'; url: string }
  | { status: 'sign_in'; url: string }
  | { status: 'error'; message: string };

export async function startCheckout(
  input: z.input<typeof StartCheckoutSchema>,
): Promise<StartCheckoutResult> {
  const parsed = StartCheckoutSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid plan' };
  const { plan, cycle } = parsed.data;

  if (plan === 'free') {
    return { status: 'error', message: 'Free tier has nothing to charge' };
  }

  const { userId } = await auth();
  if (!userId) {
    const back = encodeURIComponent(`/account/settings/plan?upgrade=${plan}&cycle=${cycle}`);
    return { status: 'sign_in', url: `/sign-in?redirect_url=${back}` };
  }

  return startSkipCashCheckout(userId, plan, cycle);
}

async function startSkipCashCheckout(
  userId: string,
  plan: Exclude<Plan, 'free'>,
  cycle: 'monthly' | 'annual',
): Promise<StartCheckoutResult> {
  const u = await currentUser();
  return startSkipCashCheckoutFor({
    userId,
    plan,
    cycle,
    email: u?.emailAddresses?.[0]?.emailAddress ?? null,
    firstName: u?.firstName ?? null,
    lastName: u?.lastName ?? null,
  });
}

const PollSchema = z.object({
  paymentId: z.string().trim().min(4).max(64),
});

export type PollSubscriptionResult =
  | { status: 'pending' }
  | { status: 'active'; plan: Plan }
  | { status: 'failed'; reason: string };

/**
 * Polled after returning from SkipCash when the hosted page has not
 * yet delivered its webhook. The webhook is still the source of truth,
 * but this defensive read keeps the success screen responsive.
 */
export async function pollSubscriptionStatus(
  input: z.input<typeof PollSchema>,
): Promise<PollSubscriptionResult> {
  const parsed = PollSchema.safeParse(input);
  if (!parsed.success) return { status: 'failed', reason: 'invalid' };

  const { userId } = await auth();
  if (!userId) return { status: 'failed', reason: 'unauthenticated' };

  if (!hasSkipCash()) return { status: 'failed', reason: 'unavailable' };

  try {
    const payment = await getSkipCashPayment(parsed.data.paymentId);
    const meta = await getPlanMeta(userId);
    if (meta.skipcashPaymentId !== parsed.data.paymentId) {
      return { status: 'failed', reason: 'forbidden' };
    }
    const statusId = normalizeSkipCashStatusId(payment.statusId);
    if (statusId === 2) {
      const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
        payment.recurringSubscriptionId,
      );
      const plan =
        meta.skipcashPendingPlan === 'starter' ||
        meta.skipcashPendingPlan === 'pro' ||
        meta.skipcashPendingPlan === 'atelier'
          ? meta.skipcashPendingPlan
          : await getPlan(userId);
      const cycle =
        meta.skipcashPendingCycle === 'monthly' || meta.skipcashPendingCycle === 'annual'
          ? meta.skipcashPendingCycle
          : null;
      const before = await getPlan(userId);
      if (plan !== 'free' && before !== plan) {
        const currentPeriodEnd = periodEndFromCycle(cycle);
        await setPlan(userId, plan, {
          provider: 'skipcash',
          paymentId: payment.id,
          subscriptionId: recurringSubscriptionId ?? payment.id,
          skipcashPaymentId: payment.id,
          skipcashCheckoutPaymentId:
            typeof meta.skipcashCheckoutPaymentId === 'string'
              ? meta.skipcashCheckoutPaymentId
              : payment.id,
          ...(recurringSubscriptionId
            ? { skipcashRecurringSubscriptionId: recurringSubscriptionId }
            : {}),
          transactionId: payment.transactionId ?? null,
          status: payment.status ?? 'paid',
          skipcashStatus: payment.status ?? 'paid',
          subscriptionStatus: 'active',
          cycle,
          currentPeriodEnd,
          nextBillingTime: currentPeriodEnd,
        });
        await recordPlanHistory({
          clerkUserId: userId,
          fromPlan: before,
          toPlan: plan,
          cycle,
          source: 'skipcash_poll',
          providerEventId: payment.id,
          meta: {
            paymentId: payment.id,
            transactionId: payment.transactionId ?? null,
            recurringSubscriptionId,
          },
        });
      }
      return { status: 'active', plan };
    }
    if (statusId === 3 || statusId === 4 || statusId === 5) {
      return { status: 'failed', reason: payment.status ?? 'failed' };
    }
    return { status: 'pending' };
  } catch (err) {
    console.error('[pollSubscriptionStatus] failed', err);
    return { status: 'failed', reason: 'network' };
  }
}

/**
 * Tiny read used by the inline checkout success state. Wraps `getPlan`
 * so a client component can refresh its local view of the user's plan
 * without pulling the `server-only` billing module into its bundle.
 */
export async function getCurrentPlan(): Promise<Plan> {
  const { userId } = await auth();
  if (!userId) return 'free';
  return getPlan(userId);
}

/* ────────────────────────────────────────────────────────────────── */
/* Subscription tracker — powers /#billing and /account/settings/plan  */
/* ────────────────────────────────────────────────────────────────── */

export type SubscriptionStatus =
  | { status: 'none'; plan: 'free' }
  | {
      status: 'active' | 'pending' | 'cancelled' | 'suspended' | 'expired' | 'failed';
      plan: Plan;
      cycle: BillingCycle | null;
      provider: 'skipcash' | null;
      subscriptionId: string | null;
      cardBrand: string | null;
      cardLast4: string | null;
      currentPeriodEnd: string | null;
      nextBillingTime: string | null;
      lastPaymentAt: string | null;
      monthlyPriceQar: number;
      effectivePriceQar: number;
      history: Array<{
        id: string;
        fromPlan: string | null;
        toPlan: string;
        cycle: string | null;
        source: string;
        createdAt: string;
        meta: Record<string, unknown>;
      }>;
    };

type CacheEntry = { value: SubscriptionStatus; expiresAt: number };
const SUB_STATUS_CACHE = new Map<string, CacheEntry>();
const SUB_STATUS_TTL_MS = 30_000;

function mapSkipCashStatus(
  raw: number | string | undefined,
): 'active' | 'pending' | 'cancelled' | 'suspended' | 'expired' | 'failed' {
  switch (normalizeSkipCashStatusId(raw)) {
    case 2:
      return 'active';
    case 0:
    case 1:
      return 'pending';
    case 3:
      return 'cancelled';
    case 4:
    case 5:
    case 8:
      return 'failed';
    case 6:
    case 7:
      return 'suspended';
    default:
      return mapStoredSubscriptionStatus(raw);
  }
}

function mapStoredSubscriptionStatus(
  raw: number | string | undefined,
): 'active' | 'pending' | 'cancelled' | 'suspended' | 'expired' | 'failed' {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return 'failed';
  if (['active', 'paid', 'success', 'succeeded', 'approved'].includes(value)) return 'active';
  if (['new', 'pending', 'approval_pending'].includes(value)) return 'pending';
  if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
  if (['suspended', 'refunded', 'pending_refund'].includes(value)) return 'suspended';
  if (['expired'].includes(value)) return 'expired';
  return 'failed';
}

/**
 * Subscription detail surface for /#billing and the in-app plan page.
 * Cached per user for 30s to avoid hammering the SkipCash API on every
 * SSE/poll tick. Audit fires only on cache miss.
 */
export async function getSubscriptionStatus(clerkUserIdArg?: string): Promise<SubscriptionStatus> {
  const userId = clerkUserIdArg ?? (await auth().then((a) => a.userId)) ?? '';
  if (!userId) return { status: 'none', plan: 'free' };

  const cached = SUB_STATUS_CACHE.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const plan = await getPlan(userId);
  if (plan === 'free') {
    const value: SubscriptionStatus = { status: 'none', plan: 'free' };
    SUB_STATUS_CACHE.set(userId, { value, expiresAt: now + SUB_STATUS_TTL_MS });
    return value;
  }

  const meta = await getPlanMeta(userId);
  const paymentId = typeof meta.skipcashPaymentId === 'string' ? meta.skipcashPaymentId : null;
  const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
    meta.skipcashRecurringSubscriptionId ?? meta.subscriptionId,
  );
  const subscriptionId = recurringSubscriptionId ?? paymentId;
  const cycle =
    meta.cycle === 'monthly' || meta.cycle === 'annual'
      ? meta.cycle
      : meta.skipcashPendingCycle === 'monthly' || meta.skipcashPendingCycle === 'annual'
        ? meta.skipcashPendingCycle
        : null;
  const storedStatus =
    typeof meta.subscriptionStatus === 'string'
      ? meta.subscriptionStatus
      : typeof meta.skipcashStatus === 'string'
        ? meta.skipcashStatus
        : typeof meta.status === 'string'
          ? meta.status
          : null;
  const currentPeriodEnd = typeof meta.currentPeriodEnd === 'string' ? meta.currentPeriodEnd : null;
  const storedNextBillingTime =
    typeof meta.nextBillingTime === 'string' ? meta.nextBillingTime : null;

  let nextBillingTime: string | null = null;
  let lastPaymentAt =
    typeof meta.skipcashLastPaymentAt === 'string' ? meta.skipcashLastPaymentAt : null;
  let liveStatus: SubscriptionStatus['status'] = storedStatus
    ? mapSkipCashStatus(storedStatus)
    : 'pending';

  if (!storedStatus && paymentId && hasSkipCash()) {
    try {
      const payment = await getSkipCashPayment(paymentId);
      liveStatus = mapSkipCashStatus(payment.statusId);
      lastPaymentAt = liveStatus === 'active' ? (payment.created ?? null) : null;
      nextBillingTime = currentPeriodEnd;
    } catch (err) {
      console.error('[getSubscriptionStatus] skipcash lookup failed', err);
      liveStatus = 'failed';
    }
  } else {
    if (subscriptionId && !storedStatus) liveStatus = 'pending';
    if (!subscriptionId && !storedStatus) liveStatus = 'failed';
  }
  nextBillingTime = storedNextBillingTime ?? currentPeriodEnd;

  const history = await listPlanHistory(userId, 20);
  const monthlyPriceQar = priceFor(plan, 'monthly');
  const effectivePriceQar = priceFor(plan, cycle ?? 'monthly');

  const value: SubscriptionStatus = {
    status: liveStatus,
    plan,
    cycle,
    provider: subscriptionId ? 'skipcash' : null,
    subscriptionId,
    cardBrand: null,
    cardLast4: null,
    currentPeriodEnd,
    nextBillingTime,
    lastPaymentAt,
    monthlyPriceQar,
    effectivePriceQar,
    history,
  };
  SUB_STATUS_CACHE.set(userId, { value, expiresAt: now + SUB_STATUS_TTL_MS });

  await logEvent({
    kind: 'billing.subscription.checked',
    funnel: 'storefront',
    userId,
    props: { plan, cycle, status: liveStatus, provider: 'skipcash' },
  });

  return value;
}

function periodEndFromCycle(cycle: BillingCycle | null): string | null {
  if (!cycle) return null;
  const end = new Date();
  if (cycle === 'annual') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export type CancelSubscriptionResult = { status: 'success' } | { status: 'error'; message: string };

export async function cancelMySubscription(): Promise<CancelSubscriptionResult> {
  const { userId } = await auth();
  if (!userId) return { status: 'error', message: 'Sign in to manage billing' };

  return cancelSubscriptionFor(userId);
}

export async function logPaywallHit(surface: 'begin' | 'dashboard'): Promise<void> {
  const { userId } = await auth();
  await logEvent({
    kind: 'billing.paywall_hit',
    funnel: 'storefront',
    userId: userId ?? null,
    props: { surface, feature: 'souqy' },
  });
}
