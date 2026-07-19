import { cancelSubscriptionFor } from '@/lib/billingCheckout';
import {
  getMobileBilling,
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileUser,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

export async function POST(): Promise<Response> {
  const user = await requireMobileUser();
  if (!user.ok) return user.response;

  const result = await cancelSubscriptionFor(user.user.userId);
  if (result.status !== 'success') {
    return mobileError(400, 'cancel_failed', result.message);
  }

  const billing = await getMobileBilling(user.user.userId);
  return mobileJson({ ok: true, billing });
}
