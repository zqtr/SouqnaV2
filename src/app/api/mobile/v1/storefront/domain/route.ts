import { z } from 'zod';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';
import { mobileDomainPayload, runMobileDomainAction } from '@/lib/mobile/domains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

export async function GET(req: Request): Promise<Response> {
  const access = await requireMobileStoreAccess(searchParam(req, 'store'), 'domains.manage');
  if (!access.ok) return access.response;

  return mobileJson(await mobileDomainPayload(access.access.storefront));
}

const PatchSchema = z.object({
  store: z.string().trim().min(1).max(64),
  action: z.enum(['attach', 'verify', 'detach']),
  domain: z.string().trim().min(3).max(253).optional().nullable(),
});

export async function PATCH(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_request', 'Choose a domain action first.');
  }

  const access = await requireMobileStoreAccess(parsed.data.store, 'domains.manage');
  if (!access.ok) return access.response;

  const result = await runMobileDomainAction({
    userId: access.user.userId,
    storefront: access.access.storefront,
    action: parsed.data.action,
    domain: parsed.data.domain,
  });
  if (!result.ok) {
    return mobileError(result.status, result.code, result.message);
  }

  return mobileJson(result.payload);
}
