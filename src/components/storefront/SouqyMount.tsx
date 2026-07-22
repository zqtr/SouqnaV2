import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { Storefront } from '@/lib/brief';
import type { Product } from '@/lib/products';
import { getCopy } from '@/content/copy';
import { getVocabulary } from '@/lib/storefront-vocabulary';
import { loadSouqyComponent, renderSouqyComponent } from '@/lib/souqy/load';
import { extractSouqyStylesCss } from '@/lib/souqy/source';
import { validateCss } from '@/lib/souqy/validate';
import { scopeSouqyCss, SOUQY_ROOT_ATTR } from '@/lib/souqy/css';
import { resolveStorefrontSurfaceHref } from '@/lib/storefrontSurface';
import type { ChromeLegalPolicy, ChromeNavPage } from './StorefrontChrome';

/**
 * Async server component that wires the Souqy artifact loader into the
 * storefront render tree. Stays a separate component so the parent
 * `<Storefront>` can be a synchronous function — only the Souqy branch
 * pays the async cost (and only when actually used).
 *
 * On any load failure, falls back to the supplied `fallback` node
 * (usually the legacy block pipeline). Errors are logged but never
 * thrown — the public storefront should not 500 because the AI bundle
 * misbehaves.
 */
export async function SouqyMount({
  data,
  products,
  fallback,
  storefrontBaseHref,
  isPreview = false,
  categoriesBySlug,
  navPages,
  legalPolicies,
}: {
  data: Storefront;
  products: Product[];
  fallback: ReactNode;
  /** Resolved once by Storefront so generated links cannot escape a private preview. */
  storefrontBaseHref: string;
  isPreview?: boolean;
  /** Optional category-slug → product-id set; threaded through to the
   * SDK so generated components resolve the new `categorySlug` prop
   * against real categories (defaults to an empty Map). */
  categoriesBySlug?: Map<string, Set<string>>;
  navPages?: ChromeNavPage[];
  legalPolicies?: ChromeLegalPolicy[];
}): Promise<ReactNode> {
  if (!data.souqyRevision || !data.souqyBlobUrl) return fallback;

  const result = await loadSouqyComponent({
    slug: data.slug,
    revision: data.souqyRevision,
    blobUrl: data.souqyBlobUrl,
  });
  if (!result.ok) {
    console.error('[souqy/mount] load failed', {
      reason: result.reason,
    });
    return fallback;
  }

  const ctx = {
    storefront: data,
    storefrontBaseHref,
    products,
    theme: data.themeOverrides,
    copy: getCopy(data.locale),
    vocabulary: getVocabulary(data.locale, data.businessType),
    isRtl: data.locale === 'ar',
    isPreview,
    categoriesBySlug: categoriesBySlug ?? new Map<string, Set<string>>(),
    navPages: navPages ?? [],
    legalPolicies: legalPolicies ?? [],
  };
  try {
    const rendered = renderSouqyComponent(result.Component, ctx);
    const surfaceSafeRendered = isPreview
      ? rewritePreviewLinks(rendered, storefrontBaseHref)
      : rendered;
    const css = customCssFor(data);
    // `display: contents` keeps the wrapper out of layout while giving the
    // scoped stylesheet (`[data-souqy-root] .foo`) an ancestor to match.
    // dangerouslySetInnerHTML because React escapes text children of
    // <style> (`.a > .b` would render as `&gt;`); safe here since
    // `validateCss` rejects any `</` sequence, so the sheet cannot close
    // its own tag.
    return (
      <div {...{ [SOUQY_ROOT_ATTR]: '' }} style={{ display: 'contents' }}>
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
        {surfaceSafeRendered}
      </div>
    );
  } catch (err) {
    console.error('[souqy/mount] render failed', {
      code: err instanceof Error ? err.name : 'render_error',
    });
    return fallback;
  }
}

function rewritePreviewLinks(node: ReactNode, baseHref: string): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{
      children?: ReactNode;
      href?: unknown;
      action?: unknown;
      formAction?: unknown;
      method?: unknown;
    }>;
    const nextChildren = element.props.children
      ? rewritePreviewLinks(element.props.children, baseHref)
      : element.props.children;
    const href = typeof element.props.href === 'string' ? element.props.href : null;
    const nextHref = href ? resolveStorefrontSurfaceHref(baseHref, href) : href;
    const isForm = element.type === 'form';
    const hasFormAction = typeof element.props.formAction === 'string';
    if (nextChildren === element.props.children && nextHref === href && !isForm && !hasFormAction) {
      return element;
    }
    return cloneElement(element, {
      ...(nextHref !== href ? { href: nextHref } : {}),
      ...(isForm ? { action: baseHref, method: 'get' } : {}),
      ...(hasFormAction ? { formAction: baseHref } : {}),
      ...(nextChildren !== element.props.children ? { children: nextChildren } : {}),
    });
  });
}

// Scoped-CSS cache: scoping is pure and revisions are immutable, so one
// entry per live revision. Tiny strings, but still bound the map.
const scopedCssCache = new Map<string, string | null>();
const SCOPED_CSS_CACHE_MAX = 128;

/**
 * The custom stylesheet (Open Design surface) rides along in the persisted
 * source rather than the compiled JS artifact. Re-validate before injecting
 * — the write path already gates on `validateCss`, but a stale or hand-edited
 * DB row must fail closed (storefront renders unstyled-custom, never
 * unsafe) — then scope every selector under the Souqy root.
 */
function customCssFor(data: Storefront): string | null {
  const key = `${data.slug}:${data.souqyRevision}`;
  const cached = scopedCssCache.get(key);
  if (cached !== undefined) return cached;

  const raw = extractSouqyStylesCss(data.souqySource);
  let scoped: string | null = null;
  if (raw) {
    const issues = validateCss(raw);
    if (issues.length === 0) {
      scoped = scopeSouqyCss(raw);
    } else {
      console.error('[souqy/mount] custom CSS rejected at render', {
        resultCode: 'css_validation_failed',
        issueCount: issues.length,
      });
    }
  }

  if (scopedCssCache.size >= SCOPED_CSS_CACHE_MAX) {
    const oldest = scopedCssCache.keys().next().value;
    if (oldest !== undefined) scopedCssCache.delete(oldest);
  }
  scopedCssCache.set(key, scoped);
  return scoped;
}
