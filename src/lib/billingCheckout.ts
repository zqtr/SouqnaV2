import 'server-only';

import { revalidatePath } from 'next/cache';
import { getPlanMeta, patchPlanMeta, type Plan } from '@/lib/billing';
import { env } from '@/lib/env';
import { logEvent } from '@/lib/events';
import { hasDb } from '@/lib/db';
import { planLabel, priceFor } from '@/lib/plans';
import {
  cancelSkipCashRecurringPayment,
  createSkipCashPayment,
  hasSkipCash,
  newSkipCashTransactionId,
  normalizeSkipCashRecurringSubscriptionId,
} from '@/lib/skipcash';

/**
 * SkipCash subscription checkout + cancellation, parameterized on an
 * explicit userId/identity so both the web server actions
 * (src/app/actions/billing.ts) and the mobile API routes can share it.
 *
 * Deliberately NOT a 'use server' module: these functions accept an
 * arbitrary userId and must never be reachable as client-invocable
 * actions — callers are responsible for resolving the caller's own
 * identity (web session or mobile bearer token) first.
 */

export type StartCheckoutResult =
  | { status: 'redirect'; url: string }
  | { status: 'sign_in'; url: string }
  | { status: 'error'; message: string };

export type CancelSubscriptionResult =
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function startSkipCashCheckoutFor(args: {
  userId: string;
  plan: Exclude<Plan, 'free'>;
  cycle: 'monthly' | 'annual';
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<StartCheckoutResult> {
  const { userId, plan, cycle } = args;
  if (!hasSkipCash()) {
    return { status: 'error', message: 'Checkout is not configured' };
  }

  const amountQar = priceFor(plan, cycle) * (cycle === 'annual' ? 12 : 1);
  const transactionId = newSkipCashTransactionId();
  try {
    const email = args.email?.trim() || `billing+${userId}@souqna.qa`;
    const firstName = args.firstName?.trim() || 'Souqna';
    const lastName = args.lastName?.trim() || 'Founder';
    const payment = await createSkipCashPayment({
      amountQar,
      firstName,
      lastName,
      email,
      phone: env.SKIPCASH_DEFAULT_PHONE,
      transactionId,
      custom1: `${userId}:${plan}:${cycle}`,
      returnUrl: siteUrl('/account/settings/plan?skipcash=success'),
      webhookUrl: siteUrl('/api/billing/skipcash-webhook'),
      recurring: buildRecurringPlanInput(plan, cycle, amountQar),
    });
    const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
      payment.recurringSubscriptionId,
    );

    if (hasDb()) {
      try {
        await patchPlanMeta(userId, {
          provider: 'skipcash',
          subscriptionStatus: 'pending',
          subscriptionProvider: 'skipcash',
          skipcashPaymentId: payment.id,
          skipcashCheckoutPaymentId: payment.id,
          skipcashTransactionId: transactionId,
          skipcashPendingPlan: plan,
          skipcashPendingCycle: cycle,
          skipcashRecurringRequested: true,
          ...(recurringSubscriptionId
            ? {
                subscriptionId: recurringSubscriptionId,
                skipcashRecurringSubscriptionId: recurringSubscriptionId,
              }
            : {}),
          skipcashStatus: payment.status ?? 'new',
        });
      } catch (err) {
        console.error('[startCheckout] skipcash meta cache failed', err);
      }
    }

    await logEvent({
      kind: 'billing.checkout.start',
      funnel: 'storefront',
      userId,
      props: {
        provider: 'skipcash',
        plan,
        cycle,
        paymentId: payment.id,
        recurringSubscriptionId,
        transactionId,
        amountQar,
        billingMode: 'recurring',
      },
    });
    return { status: 'redirect', url: payment.payUrl ?? '' };
  } catch (err) {
    console.error('[startCheckout] skipcash payment create failed', err);
    return { status: 'error', message: checkoutFailureMessage(err) };
  }
}

export async function cancelSubscriptionFor(userId: string): Promise<CancelSubscriptionResult> {
  const meta = await getPlanMeta(userId);
  const recurringSubscriptionId = normalizeSkipCashRecurringSubscriptionId(
    meta.skipcashRecurringSubscriptionId ?? meta.subscriptionId,
  );
  if (!recurringSubscriptionId) {
    return { status: 'error', message: 'No recurring subscription is active' };
  }

  try {
    await cancelSkipCashRecurringPayment(recurringSubscriptionId);
    await patchPlanMeta(userId, {
      subscriptionStatus: 'cancelled',
      skipcashStatus: 'cancelled',
      skipcashCancelledAt: new Date().toISOString(),
    });
    await logEvent({
      kind: 'billing.subscription.cancelled',
      funnel: 'storefront',
      userId,
      props: { provider: 'skipcash', recurringSubscriptionId },
    });
    revalidatePath('/account/settings/plan');
    return { status: 'success' };
  } catch (err) {
    console.error('[cancelSubscription] failed', err);
    return { status: 'error', message: 'Could not cancel subscription' };
  }
}

function checkoutFailureMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Could not start checkout';
  if (err.message.includes('Signature does not match')) {
    return 'SkipCash rejected the checkout signature. Please try again.';
  }

  const providerMessage = extractSkipCashProviderMessage(err.message);
  if (providerMessage) return `SkipCash rejected checkout: ${providerMessage}`;

  return 'Could not start checkout';
}

function extractSkipCashProviderMessage(message: string): string | null {
  if (!message.includes('SkipCash create payment failed')) return null;

  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return null;

  try {
    const payload = JSON.parse(message.slice(jsonStart)) as {
      errorMessage?: unknown;
      validationErrors?: Array<{ errorMessage?: unknown }>;
    };
    const validationMessage = Array.isArray(payload.validationErrors)
      ? payload.validationErrors
          .map((item) => (typeof item.errorMessage === 'string' ? item.errorMessage : ''))
          .find(Boolean)
      : null;
    const text =
      validationMessage ?? (typeof payload.errorMessage === 'string' ? payload.errorMessage : '');
    return text ? text.replace(/\s+/g, ' ').trim().slice(0, 180) : null;
  } catch {
    return null;
  }
}

function buildRecurringPlanInput(
  plan: Exclude<Plan, 'free'>,
  cycle: 'monthly' | 'annual',
  amountQar: number,
): NonNullable<Parameters<typeof createSkipCashPayment>[0]['recurring']> {
  const start = new Date();
  const end = new Date(start);
  // SkipCash rejects end dates at or beyond the 10-year boundary.
  // Keep Souqna subscriptions comfortably inside that provider limit.
  end.setFullYear(end.getFullYear() + 9);
  return {
    planName: `Souqna ${planLabel(plan)} ${cycle === 'annual' ? 'Annual' : 'Monthly'}`,
    frequency: '1',
    interval: cycle === 'annual' ? 'year' : 'month',
    startDate: dateOnly(start),
    endDate: dateOnly(end),
    allowedFailedAttempts: '3',
    firstPaymentAmountQar: amountQar,
  };
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function siteUrl(path: string): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/u, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
