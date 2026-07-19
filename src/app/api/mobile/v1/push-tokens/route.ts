import { z } from 'zod';
import {
  deleteMobilePushToken,
  upsertMobilePushToken,
} from '@/lib/mobile/push';
import {
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

// The Expo companion sends `expoPushToken`; the Flutter merchant app
// sends `pushToken` + `provider: 'fcm'` + `appId`. Accept both shapes.
const TokenSchema = z
  .object({
    deviceId: z.string().trim().min(3).max(160),
    expoPushToken: z.string().trim().min(10).max(300).optional(),
    pushToken: z.string().trim().min(10).max(300).optional(),
    provider: z.enum(['expo', 'fcm']).optional(),
    appId: z.string().trim().max(160).optional().nullable(),
    platform: z.string().trim().min(2).max(20).default('ios'),
    appVersion: z.string().trim().max(40).optional().nullable(),
  })
  .refine((data) => Boolean(data.expoPushToken ?? data.pushToken), {
    message: 'push token required',
  });

const DeleteSchema = z.object({
  deviceId: z.string().trim().min(3).max(160).optional(),
  expoPushToken: z.string().trim().min(10).max(300).optional(),
  pushToken: z.string().trim().min(10).max(300).optional(),
  provider: z.enum(['expo', 'fcm']).optional(),
  appId: z.string().trim().max(160).optional().nullable(),
});

function resolveProvider(
  token: string,
  declared: 'expo' | 'fcm' | undefined,
): 'expo' | 'fcm' {
  if (declared) return declared;
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
    ? 'expo'
    : 'fcm';
}

export async function POST(req: Request): Promise<Response> {
  const gate = await requireMobileUser();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = TokenSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_push_token', 'Invalid push token.');
  }
  const token = (parsed.data.expoPushToken ?? parsed.data.pushToken)!;
  await upsertMobilePushToken({
    clerkUserId: gate.user.userId,
    deviceId: parsed.data.deviceId,
    pushToken: token,
    provider: resolveProvider(token, parsed.data.provider),
    appId: parsed.data.appId,
    platform: parsed.data.platform,
    appVersion: parsed.data.appVersion,
  });
  return mobileJson({ ok: true });
}

export async function DELETE(req: Request): Promise<Response> {
  const gate = await requireMobileUser();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(body);
  const token = parsed.success ? (parsed.data.expoPushToken ?? parsed.data.pushToken) : null;
  if (!parsed.success || (!parsed.data.deviceId && !token)) {
    return mobileError(400, 'invalid_push_token_delete', 'Provide a device or push token.');
  }
  await deleteMobilePushToken({
    clerkUserId: gate.user.userId,
    deviceId: parsed.data.deviceId,
    pushToken: token,
  });
  return mobileJson({ ok: true });
}
