import 'server-only';
import { env } from '@/lib/env';
import { getPlan } from '@/lib/billing';
import { planAtLeast, type Plan } from '@/lib/plans';

export type ProAccess = {
  enabled: boolean;
  eligible: boolean;
  plan: Plan;
};

export function proModeEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || env.SOUQNA_PRO_ENABLED;
}

export async function getProAccess(clerkUserId: string): Promise<ProAccess> {
  const plan = await getPlan(clerkUserId);
  const enabled = proModeEnabled();
  return { enabled, eligible: enabled && planAtLeast(plan, 'pro'), plan };
}
