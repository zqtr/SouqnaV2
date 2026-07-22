import { describe, expect, it } from 'vitest';
import {
  appendStorefrontPath,
  resolveStorefrontSurface,
  resolveStorefrontSurfaceHref,
} from '@/lib/storefrontSurface';

describe('storefront surface routing', () => {
  it('keeps owner Pro preview links inside the private route', () => {
    const surface = resolveStorefrontSurface('shop', {
      kind: 'owner-pro-preview',
      baseHref: '/account/shop/pro-preview/',
    });

    expect(surface).toMatchObject({
      kind: 'owner-pro-preview',
      baseHref: '/account/shop/pro-preview',
      allowsCustomerEffects: false,
      fallsBackToEasy: false,
      isOwnerPreview: true,
    });
    expect(appendStorefrontPath(surface.baseHref, '/p/product-one')).toBe(
      '/account/shop/pro-preview/p/product-one',
    );
  });

  it('keeps snapshot previews inert while allowing their Easy presentation', () => {
    const surface = resolveStorefrontSurface('shop', {
      kind: 'owner-snapshot-preview',
      baseHref: '/account/shop/snapshots/abc/preview',
    });

    expect(surface.allowsCustomerEffects).toBe(false);
    expect(surface.fallsBackToEasy).toBe(true);
  });

  it('joins storefront paths without duplicate separators', () => {
    expect(appendStorefrontPath('/account/shop/pro-preview/', '/products/')).toBe(
      '/account/shop/pro-preview/products',
    );
    expect(appendStorefrontPath('/', '/products')).toBe('/products');
  });

  it('rewrites generated internal links but preserves external and fragment targets', () => {
    const base = '/account/shop/pro-preview';
    expect(resolveStorefrontSurfaceHref(base, '/products?category=gold')).toBe(
      '/account/shop/pro-preview/products?category=gold',
    );
    expect(resolveStorefrontSurfaceHref(base, 'p/product-one')).toBe(
      '/account/shop/pro-preview/p/product-one',
    );
    expect(resolveStorefrontSurfaceHref(base, 'https://example.com')).toBe('https://example.com');
    expect(resolveStorefrontSurfaceHref(base, '#details')).toBe('#details');
  });
});
