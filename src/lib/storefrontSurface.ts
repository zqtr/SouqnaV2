import { storefrontBaseUrl } from './storefrontUrl';

export type StorefrontSurface =
  | { kind: 'public' }
  | { kind: 'showcase' }
  | { kind: 'owner-pro-preview'; baseHref: string }
  | { kind: 'owner-snapshot-preview'; baseHref: string };

export type ResolvedStorefrontSurface = {
  kind: StorefrontSurface['kind'];
  baseHref: string;
  isOwnerPreview: boolean;
  allowsCustomerEffects: boolean;
  fallsBackToEasy: boolean;
};

const PUBLIC_SURFACE: StorefrontSurface = { kind: 'public' };

export function resolveStorefrontSurface(
  slug: string,
  surface: StorefrontSurface = PUBLIC_SURFACE,
): ResolvedStorefrontSurface {
  if (surface.kind === 'owner-pro-preview' || surface.kind === 'owner-snapshot-preview') {
    return {
      kind: surface.kind,
      baseHref: normalizeBaseHref(surface.baseHref),
      isOwnerPreview: true,
      allowsCustomerEffects: false,
      fallsBackToEasy: surface.kind !== 'owner-pro-preview',
    };
  }

  return {
    kind: surface.kind,
    baseHref: storefrontBaseUrl(slug),
    isOwnerPreview: false,
    allowsCustomerEffects: surface.kind === 'public',
    fallsBackToEasy: true,
  };
}

export function appendStorefrontPath(baseHref: string, path = ''): string {
  const base = normalizeBaseHref(baseHref);
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath === '/') return base;
  const suffix = trimmedPath.replace(/^\/+|\/+$/gu, '');
  return base === '/' ? `/${suffix}` : `${base}/${suffix}`;
}

export function resolveStorefrontSurfaceHref(baseHref: string, href: string): string {
  const base = normalizeBaseHref(baseHref);
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('?')) return href;
  if (/^(https?:|mailto:|tel:|sms:|whatsapp:)/iu.test(trimmed)) return href;
  if (trimmed === base || trimmed.startsWith(`${base}/`)) return trimmed;
  if (trimmed === '/') return base;
  return appendStorefrontPath(base, trimmed);
}

function normalizeBaseHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  if (trimmed === '/') return trimmed;
  return trimmed.replace(/\/+$/gu, '');
}
