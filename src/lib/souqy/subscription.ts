import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { db, hasDb } from '@/lib/db';
import { getPlan } from '@/lib/billing';
import type { Plan } from '@/lib/plans';
import {
  higherSouqyTier,
  isSouqyTier,
  souqyMonthlyCap,
  type SouqyTier,
} from '@/lib/souqy/plans';

/**
 * Souqy subscription state (migration 074).
 *
 * The *effective* tier is the higher of what the user pays for and a
 * grandfather derived from their storefront plan — existing Pro+/Max+
 * customers who had Souqy bundled keep at least the `souqy` tier without
 * paying twice. New signups default to `free` (5 generations/month).
 */

/** Storefront plan → the Souqy tier it implicitly grants (grandfather). */
function grandfatherTier(plan: Plan): SouqyTier {
  if (plan === 'atelier') return 'team';
  if (plan === 'pro') return 'souqy';
  return 'free';
}

export type SouqySubscription = {
  tier: SouqyTier;
  status: 'active' | 'pending' | 'cancelled' | 'past_due';
  cycle: 'monthly' | 'annual' | null;
  currentPeriodEnd: string | null;
  grandfathered: boolean;
};

async function getSubscribedTier(clerkUserId: string): Promise<{
  tier: SouqyTier;
  status: SouqySubscription['status'];
  cycle: SouqySubscription['cycle'];
  currentPeriodEnd: string | null;
} | null> {
  if (!hasDb()) return null;
  try {
    const rows = (await db()`
      select tier, status, cycle, current_period_end
      from souqy_subscriptions
      where clerk_user_id = ${clerkUserId}
      limit 1
    `) as unknown as Array<{
      tier: string;
      status: string;
      cycle: string | null;
      current_period_end: string | null;
    }>;
    const row = rows[0];
    if (!row || !isSouqyTier(row.tier)) return null;
    // Only an active paid subscription counts; pending/cancelled fall back
    // to the grandfather (which is at worst `free`).
    const active = row.status === 'active';
    return {
      tier: active ? row.tier : 'free',
      status: (row.status as SouqySubscription['status']) ?? 'active',
      cycle: row.cycle === 'monthly' || row.cycle === 'annual' ? row.cycle : null,
      currentPeriodEnd: row.current_period_end,
    };
  } catch (err) {
    console.error('[souqy/subscription] read failed', err);
    return null;
  }
}

/** Effective Souqy tier: max(paid subscription, storefront grandfather). */
export async function getSouqyTier(clerkUserId: string): Promise<SouqyTier> {
  const [subscribed, plan] = await Promise.all([
    getSubscribedTier(clerkUserId),
    getPlan(clerkUserId),
  ]);
  const paid = subscribed?.tier ?? 'free';
  return higherSouqyTier(paid, grandfatherTier(plan));
}

export async function getSouqySubscription(clerkUserId: string): Promise<SouqySubscription> {
  noStore();
  const [subscribed, plan] = await Promise.all([
    getSubscribedTier(clerkUserId),
    getPlan(clerkUserId),
  ]);
  const grandfather = grandfatherTier(plan);
  const paid = subscribed?.tier ?? 'free';
  const effective = higherSouqyTier(paid, grandfather);
  return {
    tier: effective,
    status: subscribed?.status ?? 'active',
    cycle: subscribed?.cycle ?? null,
    currentPeriodEnd: subscribed?.currentPeriodEnd ?? null,
    grandfathered: effective !== paid && effective === grandfather && grandfather !== 'free',
  };
}

/** Monthly generation allowance for the user's effective tier. */
export async function getSouqyTierCap(clerkUserId: string): Promise<number> {
  return souqyMonthlyCap(await getSouqyTier(clerkUserId));
}

export async function setSouqyTier(
  clerkUserId: string,
  tier: SouqyTier,
  input: {
    status?: SouqySubscription['status'];
    cycle?: 'monthly' | 'annual' | null;
    currentPeriodEnd?: string | null;
    skipcashPaymentId?: string | null;
    skipcashRecurringSubscriptionId?: string | null;
    skipcashTransactionId?: string | null;
    pendingTier?: SouqyTier | null;
  } = {},
): Promise<void> {
  if (!hasDb()) return;
  await db()`
    insert into souqy_subscriptions (
      clerk_user_id, tier, status, cycle, current_period_end,
      skipcash_payment_id, skipcash_recurring_subscription_id,
      skipcash_transaction_id, pending_tier, updated_at
    ) values (
      ${clerkUserId}, ${tier}, ${input.status ?? 'active'},
      ${input.cycle ?? null}, ${input.currentPeriodEnd ?? null},
      ${input.skipcashPaymentId ?? null}, ${input.skipcashRecurringSubscriptionId ?? null},
      ${input.skipcashTransactionId ?? null},
      ${input.pendingTier ?? null}, now()
    )
    on conflict (clerk_user_id) do update set
      tier = excluded.tier,
      status = excluded.status,
      cycle = coalesce(excluded.cycle, souqy_subscriptions.cycle),
      current_period_end = coalesce(excluded.current_period_end, souqy_subscriptions.current_period_end),
      skipcash_payment_id = coalesce(excluded.skipcash_payment_id, souqy_subscriptions.skipcash_payment_id),
      skipcash_recurring_subscription_id = coalesce(
        excluded.skipcash_recurring_subscription_id,
        souqy_subscriptions.skipcash_recurring_subscription_id),
      skipcash_transaction_id = coalesce(excluded.skipcash_transaction_id, souqy_subscriptions.skipcash_transaction_id),
      pending_tier = excluded.pending_tier,
      updated_at = now()
  `;
}

/** Record a pending checkout so the webhook/poll can resolve the tier. */
export async function markSouqyCheckoutPending(
  clerkUserId: string,
  input: {
    tier: SouqyTier;
    cycle: 'monthly' | 'annual';
    skipcashPaymentId: string;
    skipcashTransactionId: string;
    skipcashRecurringSubscriptionId?: string | null;
  },
): Promise<void> {
  if (!hasDb()) return;
  await db()`
    insert into souqy_subscriptions (
      clerk_user_id, tier, status, cycle, skipcash_payment_id,
      skipcash_transaction_id, skipcash_recurring_subscription_id, pending_tier, updated_at
    ) values (
      ${clerkUserId},
      coalesce((select tier from souqy_subscriptions where clerk_user_id = ${clerkUserId}), 'free'),
      'pending', ${input.cycle}, ${input.skipcashPaymentId},
      ${input.skipcashTransactionId}, ${input.skipcashRecurringSubscriptionId ?? null},
      ${input.tier}, now()
    )
    on conflict (clerk_user_id) do update set
      status = 'pending',
      cycle = ${input.cycle},
      skipcash_payment_id = ${input.skipcashPaymentId},
      skipcash_transaction_id = ${input.skipcashTransactionId},
      skipcash_recurring_subscription_id = coalesce(
        ${input.skipcashRecurringSubscriptionId ?? null},
        souqy_subscriptions.skipcash_recurring_subscription_id),
      pending_tier = ${input.tier},
      updated_at = now()
  `;
}

export async function getSouqyPendingTierByPayment(
  paymentId: string,
): Promise<{ clerkUserId: string; tier: SouqyTier } | null> {
  if (!hasDb()) return null;
  try {
    const rows = (await db()`
      select clerk_user_id, pending_tier
      from souqy_subscriptions
      where skipcash_payment_id = ${paymentId}
      limit 1
    `) as unknown as Array<{ clerk_user_id: string; pending_tier: string | null }>;
    const row = rows[0];
    if (!row || !isSouqyTier(row.pending_tier)) return null;
    return { clerkUserId: row.clerk_user_id, tier: row.pending_tier };
  } catch (err) {
    console.error('[souqy/subscription] pending lookup failed', err);
    return null;
  }
}
