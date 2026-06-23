import 'server-only';

import { env } from './env';
import { getSlugForCustomDomain } from './customDomainLookup';

function cleanHostHeader(host: string | null): string {
  return (host ?? '').split(',')[0]!.trim().toLowerCase();
}

function cleanHost(host: string | null): string {
  return cleanHostHeader(host).split(':')[0]!.trim().toLowerCase();
}

function requestProto(req: Request): 'http' | 'https' {
  const forwarded = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwarded === 'http' || forwarded === 'https') return forwarded;
  try {
    return new URL(req.url).protocol === 'http:' ? 'http' : 'https';
  } catch {
    return 'https';
  }
}

function slugFromRootHost(host: string, root: string | undefined | null): string | null {
  const normalizedRoot = root?.trim().toLowerCase();
  if (!normalizedRoot) return null;
  if (host === normalizedRoot || !host.endsWith(`.${normalizedRoot}`)) return null;
  const subdomain = host.slice(0, -(normalizedRoot.length + 1));
  return subdomain && !subdomain.includes('.') ? subdomain : null;
}

export async function resolveStorefrontSlugFromRequest(
  req: Request,
  explicitSlug?: string | null,
): Promise<string | null> {
  const slug = explicitSlug?.trim().toLowerCase();
  if (slug) return slug;

  const host = cleanHost(req.headers.get('x-forwarded-host') ?? req.headers.get('host'));
  if (!host) return null;

  const ownedSlug =
    slugFromRootHost(host, env.BRIEF_ROOT_DOMAIN) ??
    slugFromRootHost(host, env.BRIEF_FALLBACK_ROOT_DOMAIN);
  if (ownedSlug) return ownedSlug;

  return getSlugForCustomDomain(host);
}

export function storefrontPageUrlFromRequest(req: Request, path: string): string | null {
  const host = cleanHostHeader(req.headers.get('x-forwarded-host') ?? req.headers.get('host'));
  if (!host) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${requestProto(req)}://${host}${normalizedPath}`;
}
