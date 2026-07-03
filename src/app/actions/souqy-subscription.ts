'use server';

import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { hasDb } from '@/lib/db';
import { env } from '@/lib/env';
import { logEvent } from '@/lib/events';
import {
  createSkipCashPayment,
  hasSkipCash,
  newSkipCashTransactionId,
  normalizeSkipCashRecurringSubscriptionId,
} from '@/lib/skipcash';
import {
  SOUQY_PAID_TIERS,
  souqyMonthlyCap,
  souqyPriceQar,
  souqyTierConfig,
  type SouqyTier,
} from '@/lib/souqy/plans';
import { getSouqySubscription, markSouqyCheckoutPending } from '@/lib/souqy/subscription';
import { getSouqyAllowance } from '@/lib/souqy/credits';

/**
 * Souqy subscription checkout — a SkipCash recurring plan for a Souqy
 * tier, mirroring the storefront-plan checkout in `billing.ts` but on
 * the separate Souqy axis. `custom1 = souqy:{userId}:{tier}` routes the
 * webhook (/api/souqy/skipcash-webhook) back to `setSouqyTier`.
 */

const StartSchema = z.object({
  tier: z.enum(['souqy', 'team']),
});

export type StartSouqyCheckoutResult =
  | { status: 'redirect'; url: string }
  | { status: 'sign_in'; url: string }
  | { status: 'error'; message: string };

export async function startSouqyCheckout(
  input: z.input<typeof StartSchema>,
): Promise<StartSouqyCheckoutResult> {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Pick a Souqy plan.' };
  const tier = parsed.data.tier as Exclude<SouqyTier, 'free'>;

  const { userId } = await auth();
  if (!userId) {
    const back = encodeURIComponent(`/account/settings/souqy?upgrade=${tier}`);
    return { status: 'sign_in', url: `/sign-in?redirect_url=${back}` };
  }
  if (!hasSkipCash()) return { status: 'error', message: 'Checkout is not configured.' };

  const amountQar = souqyPriceQar(tier);
  const transactionId = newSkipCashTransactionId();
  try {
    const u = await currentUser();
    const email = u?.emailAddresses?.[0]?.emailAddress ?? `souqy+${userId}@souqna.qa`;
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 9); // SkipCash rejects >= 10y

    const payment = await createSkipCashPayment({
      amountQar,
      firstName: u?.firstName?.trim() || 'Souqna',
      lastName: u?.lastName?.trim() || 'Builder',
      email,
      phone: env.SKIPCASH_DEFAULT_PHONE,
      transactionId,
      custom1: `souqy:${userId}:${tier}`,
      returnUrl: siteUrl('/account/settings/souqy?souqy=success'),
      webhookUrl: siteUrl('/api/souqy/skipcash-webhook'),
      recurring: {
        planName: `Souqy ${souqyTierConfig(tier).label} Monthly`,
        frequency: '1',
        interval: 'month',
        startDate: dateOnly(start),
        endDate: dateOnly(end),
        allowedFailedAttempts: '3',
        firstPaymentAmountQar: amountQar,
      },
    });
    const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
      payment.recurringSubscriptionId,
    );

    if (hasDb()) {
      await markSouqyCheckoutPending(userId, {
        tier,
        cycle: 'monthly',
        skipcashPaymentId: payment.id,
        skipcashTransactionId: transactionId,
        skipcashRecurringSubscriptionId: recurringSubscriptionId,
      }).catch((err) => console.error('[startSouqyCheckout] pending cache failed', err));
    }

    await logEvent({
      kind: 'souqy.subscription.checkout.start',
      funnel: 'storefront',
      userId,
      props: { provider: 'skipcash', tier, amountQar, paymentId: payment.id },
    });
    return { status: 'redirect', url: payment.payUrl ?? '' };
  } catch (err) {
    console.error('[startSouqyCheckout] payment create failed', err);
    return { status: 'error', message: 'Could not start checkout. Please try again.' };
  }
}

export type MySouqyPlan = {
  tier: SouqyTier;
  status: string;
  grandfathered: boolean;
  usedThisMonth: number;
  cap: number;
  remaining: number;
  currentPeriodEnd: string | null;
  paidTiers: SouqyTier[];
};

export async function getMySouqyPlan(): Promise<MySouqyPlan> {
  const { userId } = await auth();
  const empty: MySouqyPlan = {
    tier: 'free',
    status: 'active',
    grandfathered: false,
    usedThisMonth: 0,
    cap: souqyMonthlyCap('free'),
    remaining: souqyMonthlyCap('free'),
    currentPeriodEnd: null,
    paidTiers: [...SOUQY_PAID_TIERS],
  };
  if (!userId || !hasDb()) return empty;

  const [sub, allowance] = await Promise.all([
    getSouqySubscription(userId),
    getSouqyAllowance(userId),
  ]);
  return {
    tier: sub.tier,
    status: sub.status,
    grandfathered: sub.grandfathered,
    usedThisMonth: allowance.usedThisMonth,
    cap: allowance.cap,
    remaining: allowance.remaining,
    currentPeriodEnd: sub.currentPeriodEnd,
    paidTiers: [...SOUQY_PAID_TIERS],
  };
}

function siteUrl(path: string): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/u, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
