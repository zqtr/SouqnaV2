import { put } from '@vercel/blob';
import { z } from 'zod';
import { env } from '@/lib/env';
import {
  mobileError,
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
} from '@/lib/mobile/auth';
import { STOREFRONT_UPLOAD_CONTENT_TYPES } from '@/lib/media';
import {
  getStorefrontStorageUsedBytes,
  remainingStorefrontStorageBytes,
  storageLimitBytesForPlan,
} from '@/lib/files';
import { getPlan } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const UploadSchema = z.object({
  store: z.string().trim().min(1).max(64),
  pathname: z.string().trim().min(1).max(180),
  contentType: z.enum(STOREFRONT_UPLOAD_CONTENT_TYPES),
  dataBase64: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return mobileError(503, 'blob_not_configured', 'Uploads are not configured.');
  }

  const body = await req.json().catch(() => null);
  const parsed = UploadSchema.safeParse(body);
  if (!parsed.success) {
    return mobileError(400, 'invalid_upload', parsed.error.issues[0]?.message ?? 'Invalid upload.');
  }
  const gate = await requireMobileStoreAccess(parsed.data.store, 'products.manage');
  if (!gate.ok) return gate.response;

  const buffer = Buffer.from(parsed.data.dataBase64, 'base64');
  if (buffer.byteLength > 10 * 1024 * 1024) {
    return mobileError(413, 'upload_too_large', 'Media must be 10 MB or smaller.');
  }
  const [usedBytes, plan] = await Promise.all([
    getStorefrontStorageUsedBytes(gate.access.storefront.slug),
    getPlan(gate.access.storefront.clerkUserId),
  ]);
  const remainingBytes = remainingStorefrontStorageBytes(
    usedBytes,
    storageLimitBytesForPlan(plan),
  );
  if (buffer.byteLength > remainingBytes) {
    return mobileError(413, 'storage_quota_exceeded', 'Store storage limit reached.');
  }

  const safePath = parsed.data.pathname
    .toLowerCase()
    .replace(/[^a-z0-9._/-]/g, '-')
    .replace(/^\/+/, '')
    .slice(-140);
  const path = safePath.startsWith(`products/${gate.access.storefront.slug}/`) ||
    safePath.startsWith(`logos/${gate.access.storefront.slug}/`)
    ? safePath
    : `products/${gate.access.storefront.slug}/${safePath || 'image'}`;

  const blob = await put(path, buffer, {
    access: 'public',
    contentType: parsed.data.contentType,
    addRandomSuffix: true,
  });

  return mobileJson({ url: blob.url, pathname: blob.pathname });
}
