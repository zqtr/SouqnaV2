import {
  getMobileBilling,
  mobileJson,
  mobileOptions,
  requireMobileUser,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

// Billing is account-level (keyed by the Clerk user), so the `store`
// query param the app sends is accepted but not needed here.
export async function GET(): Promise<Response> {
  const user = await requireMobileUser();
  if (!user.ok) return user.response;

  const billing = await getMobileBilling(user.user.userId);
  return mobileJson({ billing });
}
