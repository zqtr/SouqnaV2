import { z } from 'zod';
import { startSkipCashCheckoutFor } from '@/lib/billingCheckout';
import { mobileError, mobileJson, mobileOptions, requireMobileUser } from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

// Canonical plan ids plus the label-derived aliases early app builds
// used. Bare 'pro' always means the backend `pro` tier (label "Pro+").
const PLAN_ALIASES: Record<string, 'starter' | 'pro' | 'atelier'> = {
  starter: 'starter',
  pro: 'pro',
  atelier: 'atelier',
  'pro-plus': 'pro',
  pro_plus: 'pro',
  'max-plus': 'atelier',
  max_plus: 'atelier',
};

const CheckoutSchema = z.object({
  plan: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value in PLAN_ALIASES, 'unknown plan'),
  cycle: z.enum(['monthly', 'annual']),
  store: z.string().trim().max(64).optional().nullable(),
  returnUrl: z.string().trim().max(600).optional().nullable(),
  appId: z.string().trim().max(160).optional().nullable(),
  platform: z.string().trim().max(40).optional().nullable(),
});

export async function POST(req: Request): Promise<Response> {
  const user = await requireMobileUser();
  if (!user.ok) return user.response;

  const body = await req.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_request', 'Pick a plan and billing cycle first.');
  }

  const plan = PLAN_ALIASES[parsed.data.plan];
  if (!plan) {
    return mobileError(400, 'invalid_request', 'Pick a plan and billing cycle first.');
  }
  const [firstName, ...rest] = (user.user.name ?? '').trim().split(/\s+/);
  const result = await startSkipCashCheckoutFor({
    userId: user.user.userId,
    plan,
    cycle: parsed.data.cycle,
    email: user.user.email,
    firstName: firstName || null,
    lastName: rest.join(' ') || null,
  });

  if (result.status !== 'redirect' || !result.url) {
    const message = result.status === 'error' ? result.message : 'Could not start checkout';
    return mobileError(502, 'checkout_failed', message);
  }

  return mobileJson({ checkoutUrl: result.url, plan, cycle: parsed.data.cycle });
}
