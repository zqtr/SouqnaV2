import { listFilesForStorefront } from '@/lib/files';
import {
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

// Storage library — every blob the store owns, newest first. The app
// reads the `files` key and filters to images client-side.
export async function GET(req: Request): Promise<Response> {
  const access = await requireMobileStoreAccess(searchParam(req, 'store'), 'products.manage');
  if (!access.ok) return access.response;

  const files = await listFilesForStorefront(access.access.storefront.slug);
  return mobileJson({
    files: files.map((file) => ({
      url: file.url,
      pathname: file.pathname,
      name: file.name,
      namespace: file.namespace,
      size: file.size,
      contentType: file.contentType,
      uploadedAt: file.uploadedAt.toISOString(),
    })),
  });
}
