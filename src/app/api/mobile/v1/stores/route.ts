import {
  getMobileBilling,
  listMobileStores,
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileUser,
} from '@/lib/mobile/auth';
import { MobileCreateStoreSchema, provisionMobileStorefront } from '@/lib/mobile/stores';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireMobileUser();
  if (!user.ok) return user.response;

  const body = await req.json().catch(() => null);
  const parsed = MobileCreateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_request', 'Check the store details and try again.');
  }

  const result = await provisionMobileStorefront(user.user, parsed.data);
  if (!result.ok) {
    return mobileError(result.status, result.code, result.message);
  }

  // Same envelope as GET /me — the app replaces its account snapshot with
  // this response. The new store sorts first (created_at desc), and
  // activeStore points at it explicitly.
  const [stores, billing] = await Promise.all([
    listMobileStores(user.user),
    getMobileBilling(user.user.userId),
  ]);
  return mobileJson(
    {
      user: user.user,
      stores,
      billing,
      activeStore: result.slug,
    },
    { status: 201 },
  );
}
