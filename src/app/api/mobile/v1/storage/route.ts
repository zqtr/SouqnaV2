import {
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
} from '@/lib/mobile/auth';
import { listFilesForStorefront } from '@/lib/files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const store = url.searchParams.get('store')?.trim() ?? null;
  const gate = await requireMobileStoreAccess(store, 'products.manage');
  if (!gate.ok) return gate.response;

  const files = await listFilesForStorefront(gate.access.storefront.slug, {
    limit: 120,
  });
  const images = files
    .filter((file) => {
      if (file.contentType?.startsWith('image/')) return true;
      return /\.(png|jpe?g|webp|svg)$/i.test(file.pathname);
    })
    .map((file) => ({
      url: file.url,
      pathname: file.pathname,
      name: file.name,
      contentType: file.contentType,
      size: file.size,
      uploadedAt: file.uploadedAt.toISOString(),
      namespace: file.namespace,
    }));

  return mobileJson({ images });
}
