'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Storefront } from '@/lib/brief';
import type { StorefrontSidebarVariant } from '@/lib/storefrontChrome';
import type { ChromeNavPage } from './StorefrontChrome';

type SidebarLink = { href: string; label: string };

type SidebarShape = 'rail' | 'card' | 'floating' | 'account' | 'catalog';

type SidebarSpec = {
  shape: SidebarShape;
  radius: number;
  /** Vertically centered (true) vs. pinned near the top under the nav. */
  centered: boolean;
  gradient: boolean;
  blur: boolean;
  showHeading: boolean;
  activeStyle: 'pill' | 'bar' | 'dot';
  minWidth: number;
  scroll: boolean;
};

function sidebarSpec(variant: StorefrontSidebarVariant): SidebarSpec {
  switch (variant) {
    case 'sidebar-category-rail':
      return {
        shape: 'rail',
        radius: 999,
        centered: true,
        gradient: false,
        blur: true,
        showHeading: false,
        activeStyle: 'dot',
        minWidth: 0,
        scroll: false,
      };
    case 'sidebar-filter-drawer':
      return {
        shape: 'card',
        radius: 16,
        centered: false,
        gradient: false,
        blur: false,
        showHeading: true,
        activeStyle: 'pill',
        minWidth: 150,
        scroll: false,
      };
    case 'sidebar-floating-menu':
      return {
        shape: 'floating',
        radius: 20,
        centered: false,
        gradient: false,
        blur: true,
        showHeading: true,
        activeStyle: 'pill',
        minWidth: 150,
        scroll: false,
      };
    case 'sidebar-account-style':
      return {
        shape: 'account',
        radius: 14,
        centered: false,
        gradient: false,
        blur: false,
        showHeading: true,
        activeStyle: 'bar',
        minWidth: 172,
        scroll: false,
      };
    case 'sidebar-max-catalog':
      return {
        shape: 'catalog',
        radius: 16,
        centered: false,
        gradient: true,
        blur: true,
        showHeading: true,
        activeStyle: 'pill',
        minWidth: 168,
        scroll: true,
      };
    default:
      return {
        shape: 'card',
        radius: 16,
        centered: false,
        gradient: false,
        blur: true,
        showHeading: true,
        activeStyle: 'pill',
        minWidth: 150,
        scroll: false,
      };
  }
}

function hrefToPath(href: string): string {
  if (/^https?:/i.test(href)) {
    try {
      return new URL(href).pathname || '/';
    } catch {
      return href;
    }
  }
  return href;
}

function isActive(pathname: string | null, href: string, baseHref: string): boolean {
  if (!pathname) return false;
  const path = hrefToPath(href);
  const base = hrefToPath(baseHref);
  if (path === base) return pathname === base || pathname === `${base}/`;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Storefront browsing sidebar. The 6 `StorefrontSidebarVariant` values
 * collapse to five distinct desktop shapes (see {@link sidebarSpec}):
 * a slim capsule rail, a bordered browse card, a translucent floating
 * menu, a dashboard-style account rail, and a deep gradient catalogue.
 *
 * Below 900px the desktop rail is hidden and a floating trigger opens a
 * proper off-canvas drawer (Esc to close, body-scroll lock, focus
 * management) — so navigation never disappears on mobile the way the
 * old desktop-only rail did.
 */
export function StorefrontSidebar({
  storefront,
  pages,
  storefrontBaseHref,
  variant,
  label,
}: {
  storefront: Storefront;
  pages: ChromeNavPage[];
  storefrontBaseHref: string;
  variant: StorefrontSidebarVariant;
  label?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (variant === 'sidebar-none') return null;

  const isRtl = storefront.locale === 'ar';
  const spec = sidebarSpec(variant);
  const productsLabel =
    storefront.productIndex.title || (isRtl ? 'كل المنتجات' : 'All Products');
  const links: SidebarLink[] = [
    { href: storefrontBaseHref, label: isRtl ? 'الرئيسية' : 'Home' },
    ...(storefront.productIndex.enabled
      ? [{ href: `${storefrontBaseHref}/products`, label: productsLabel }]
      : []),
    ...pages.slice(0, spec.scroll ? 12 : 5).map((page) => ({
      href: `${storefrontBaseHref}/${page.slug}`,
      label: page.title,
    })),
  ];
  const heading = label || (isRtl ? 'تصفّح المتجر' : 'Browse store');
  const menuAria = isRtl ? 'تنقل المتجر' : 'Store menu';

  return (
    <>
      <aside
        aria-label={menuAria}
        className="souqna-sf-sidebar"
        style={{
          position: 'fixed',
          insetBlockStart: spec.centered ? '50%' : 'clamp(92px, 12vw, 148px)',
          transform: spec.centered ? 'translateY(-50%)' : undefined,
          insetInlineStart: isRtl ? undefined : 14,
          insetInlineEnd: isRtl ? 14 : undefined,
          zIndex: 44,
          display: 'grid',
          gap: spec.shape === 'account' ? 3 : 6,
          maxWidth: 224,
          maxHeight: spec.scroll ? 'min(70vh, 520px)' : undefined,
          overflowY: spec.scroll ? 'auto' : undefined,
          padding: spec.shape === 'rail' ? 7 : spec.shape === 'account' ? 12 : 10,
          borderRadius: spec.radius,
          border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
          background: spec.gradient
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--sf-ink) 9%, var(--sf-ground)), var(--sf-ground))'
            : spec.shape === 'floating'
              ? 'color-mix(in srgb, var(--sf-ground) 82%, transparent)'
              : 'color-mix(in srgb, var(--sf-ground) 92%, transparent)',
          boxShadow:
            spec.shape === 'floating' || spec.shape === 'catalog'
              ? '0 22px 54px -30px color-mix(in srgb, var(--sf-ink) 75%, transparent)'
              : '0 18px 44px -34px color-mix(in srgb, var(--sf-ink) 70%, transparent)',
          backdropFilter: spec.blur ? 'blur(16px)' : undefined,
        }}
      >
        <SidebarInner
          spec={spec}
          heading={heading}
          links={links}
          pathname={pathname}
          baseHref={storefrontBaseHref}
        />
      </aside>

      <button
        type="button"
        className="souqna-sf-sidebar-trigger"
        onClick={() => setOpen(true)}
        aria-label={heading}
        aria-expanded={open}
        style={{
          position: 'fixed',
          insetBlockEnd: 'max(18px, env(safe-area-inset-bottom))',
          insetInlineStart: isRtl ? undefined : 16,
          insetInlineEnd: isRtl ? 16 : undefined,
          zIndex: 62,
          display: 'none',
          alignItems: 'center',
          gap: 8,
          padding: '11px 16px',
          borderRadius: 999,
          border: '1px solid color-mix(in srgb, var(--sf-ink) 14%, transparent)',
          background: 'var(--sf-ground)',
          color: 'var(--sf-ink)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          letterSpacing: '0.04em',
          boxShadow: '0 12px 30px -14px color-mix(in srgb, var(--sf-ink) 70%, transparent)',
          cursor: 'pointer',
        }}
      >
        <MenuGlyph />
        {heading}
      </button>

      {open ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 82 }}>
          <div
            onClick={close}
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 12, 9, 0.45)',
            }}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuAria}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              insetInlineStart: 0,
              width: 'min(320px, 86%)',
              background: 'var(--sf-ground)',
              color: 'var(--sf-ink)',
              borderInlineEnd: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
              boxShadow: '14px 0 44px -18px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              padding: 18,
              gap: 14,
              transform: 'translateX(0)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif, var(--font-sans))',
                  fontSize: 17,
                  fontWeight: 500,
                }}
              >
                {heading}
              </span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                aria-label={isRtl ? 'إغلاق القائمة' : 'Close menu'}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: '1px solid color-mix(in srgb, var(--sf-ink) 14%, transparent)',
                  background: 'transparent',
                  color: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <CloseGlyph />
              </button>
            </div>
            <nav style={{ display: 'grid', gap: 4 }}>
              {links.map((link) => {
                const active = isActive(pathname, link.href, storefrontBaseHref);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="no-underline"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      color: 'var(--sf-ink)',
                      background: active
                        ? 'color-mix(in srgb, var(--sf-accent) 14%, transparent)'
                        : 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
                      fontSize: 15,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 900px) {
          .souqna-sf-sidebar { display: none !important; }
          .souqna-sf-sidebar-trigger { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}

function SidebarInner({
  spec,
  heading,
  links,
  pathname,
  baseHref,
}: {
  spec: SidebarSpec;
  heading: string;
  links: SidebarLink[];
  pathname: string | null;
  baseHref: string;
}) {
  return (
    <>
      {spec.showHeading ? (
        <span
          style={{
            padding: spec.shape === 'account' ? '4px 8px 8px' : '4px 10px 4px',
            color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            borderBottom:
              spec.shape === 'account'
                ? '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)'
                : undefined,
            marginBottom: spec.shape === 'account' ? 4 : 0,
          }}
        >
          {heading}
        </span>
      ) : null}
      {links.map((link) => {
        const active = isActive(pathname, link.href, baseHref);
        return (
          <a
            key={link.href}
            href={link.href}
            className="no-underline"
            style={sidebarLinkStyle(spec, active)}
          >
            {spec.activeStyle === 'dot' ? (
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: active
                    ? 'var(--sf-accent)'
                    : 'color-mix(in srgb, var(--sf-ink) 30%, transparent)',
                }}
              />
            ) : null}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {link.label}
            </span>
          </a>
        );
      })}
    </>
  );
}

function sidebarLinkStyle(spec: SidebarSpec, active: boolean): CSSProperties {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    minWidth: spec.minWidth || undefined,
    padding: spec.shape === 'rail' ? '9px 11px' : '9px 12px',
    borderRadius: spec.shape === 'account' ? 9 : 999,
    color: 'var(--sf-ink)',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11.5,
    letterSpacing: '0.04em',
    fontWeight: active ? 600 : 500,
  };
  if (spec.activeStyle === 'bar') {
    return {
      ...base,
      background: active ? 'color-mix(in srgb, var(--sf-ink) 6%, transparent)' : 'transparent',
      borderInlineStart: `2px solid ${active ? 'var(--sf-accent)' : 'transparent'}`,
      borderRadius: 8,
      paddingInlineStart: 10,
    };
  }
  if (spec.activeStyle === 'pill') {
    return {
      ...base,
      background: active
        ? 'color-mix(in srgb, var(--sf-accent) 14%, transparent)'
        : spec.shape === 'catalog'
          ? 'color-mix(in srgb, var(--sf-ink) 5%, transparent)'
          : 'transparent',
    };
  }
  // dot
  return {
    ...base,
    background: active ? 'color-mix(in srgb, var(--sf-ink) 6%, transparent)' : 'transparent',
  };
}

function MenuGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
