/**
 * Storefront image optimization helpers.
 *
 * Founder-uploaded product images live on Vercel Blob (originals up to
 * 50 MB) and demo assets on CloudFront/Unsplash. Instead of serving those
 * originals to shoppers, we route them through the Next image optimizer
 * (`/_next/image`), which resizes to the requested width, negotiates
 * AVIF/WebP via the browser Accept header, and CDN-caches the result.
 *
 * These helpers mirror what the `next/image` default loader emits, but as
 * plain `<img>` attributes so we don't have to restructure the many
 * inline-styled, parent-sized image layouts in the storefront blocks.
 *
 * The host allowlist below MUST stay in sync with `images.remotePatterns`
 * in `next.config.mjs` — the optimizer rejects (400) any remote host that
 * isn't configured, so anything not matched here is left as a raw URL.
 */

// Widths must be a subset of Next's default deviceSizes ∪ imageSizes, or
// `/_next/image` returns 400. (deviceSizes: 640,750,828,1080,1200,1920,…;
// imageSizes: 16,32,48,64,96,128,256,384.)
const SRCSET_WIDTHS = [256, 384, 640, 828, 1080, 1200, 1920] as const;

const DEFAULT_QUALITY = 72;

// Every width sent to `/_next/image` must be one of Next's configured sizes
// (deviceSizes ∪ imageSizes) or the optimizer 400s. Snap arbitrary requests
// up to the nearest allowed width.
const ALLOWED_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

function snapWidth(width: number): number {
  for (const w of ALLOWED_WIDTHS) {
    if (w >= width) return w;
  }
  return 3840;
}

function isOptimizableHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.endsWith('.blob.vercel-storage.com') ||
    host.endsWith('.cloudfront.net') ||
    host === 'images.unsplash.com'
  );
}

/**
 * Whether a URL can be run through the Next optimizer. Local paths ("/x.png")
 * are always fine; remote URLs must be on an allowlisted host. SVG, GIF, and
 * data/blob URIs are excluded so we don't strip animation or hit optimizer
 * errors.
 */
export function canOptimizeImage(src: string | null | undefined): src is string {
  if (!src) return false;
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (src.startsWith('/_next/image')) return false;

  const lower = src.split(/[?#]/)[0]?.toLowerCase() ?? '';
  if (lower.endsWith('.svg') || lower.endsWith('.gif')) return false;

  // Local/relative asset — optimizer handles these without remotePatterns.
  if (src.startsWith('/') && !src.startsWith('//')) return true;

  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return isOptimizableHost(url.hostname);
  } catch {
    return false;
  }
}

function optimizerUrl(src: string, width: number, quality: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * Optimizer URL for a CSS `background-image: url(...)`. Full-bleed banners
 * can't use a responsive srcSet, so we pick one large width — still a huge
 * win over serving a multi-MB original. Falls back to the raw URL when the
 * source can't be optimized.
 */
export function optimizedBackgroundUrl(
  src: string | null | undefined,
  width = 1920,
  quality: number = DEFAULT_QUALITY,
): string {
  if (!canOptimizeImage(src)) return src ?? '';
  return optimizerUrl(src, snapWidth(width), quality);
}

export type OptimizedImageAttrs = {
  src: string;
  srcSet?: string;
};

/**
 * Build `src` + `srcSet` for an `<img>`. If the source can't be optimized,
 * returns the original URL untouched so it still renders.
 */
export function optimizedImageAttrs(
  src: string,
  quality: number = DEFAULT_QUALITY,
): OptimizedImageAttrs {
  if (!canOptimizeImage(src)) {
    return { src };
  }
  const srcSet = SRCSET_WIDTHS.map((w) => `${optimizerUrl(src, w, quality)} ${w}w`).join(', ');
  // Fallback src for browsers that ignore srcSet — use a mid-large width.
  return { src: optimizerUrl(src, 1080, quality), srcSet };
}
