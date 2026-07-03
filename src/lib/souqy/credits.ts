import 'server-only';

import { getSouqyMonthlyCount } from '@/lib/souqy/db';
import { getSouqyTier } from '@/lib/souqy/subscription';
import { souqyMonthlyCap, type SouqyTier } from '@/lib/souqy/plans';

/**
 * Souqy generation metering.
 *
 * Volume is governed by the user's Souqy subscription tier (free 5 /
 * souqy 150 / team 500 generations per month). `reserveSouqyGeneration`
 * is the single check the generation actions call before running; it
 * admits while the month's usage is under the tier allowance and blocks
 * otherwise. Usage is derived from the souqy_audit log (resets monthly),
 * so there is nothing to decrement — recording the generation is the
 * increment.
 */

export type SouqyAllowance = {
  tier: SouqyTier;
  cap: number;
  usedThisMonth: number;
  remaining: number;
};

export async function getSouqyAllowance(clerkUserId: string): Promise<SouqyAllowance> {
  const [tier, used] = await Promise.all([
    getSouqyTier(clerkUserId),
    getSouqyMonthlyCount(clerkUserId),
  ]);
  const cap = souqyMonthlyCap(tier);
  return { tier, cap, usedThisMonth: used, remaining: Math.max(0, cap - used) };
}

export type ReserveResult = { allowed: boolean; tier?: SouqyTier };

/**
 * Gate one generation attempt against the user's tier allowance. Fails
 * open on a count-read error so a transient DB blip never wrongly blocks
 * a paying user.
 */
export async function reserveSouqyGeneration(clerkUserId: string): Promise<ReserveResult> {
  let tier: SouqyTier;
  let used: number;
  try {
    [tier, used] = await Promise.all([
      getSouqyTier(clerkUserId),
      getSouqyMonthlyCount(clerkUserId),
    ]);
  } catch (err) {
    console.error('[souqy/credits] allowance read failed, admitting', err);
    return { allowed: true };
  }
  return { allowed: used < souqyMonthlyCap(tier), tier };
}
