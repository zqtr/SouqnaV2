/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { ArchMark } from '@/components/primitives/ArchMark';
import type { Storefront } from '@/lib/brief';
import type { PolicyKey } from '@/lib/storefrontSettings';
import { env } from '@/lib/env';
import { CartProvider } from './cart/CartContext';
import { CartDrawer, type CartDrawerLabels } from './cart/CartDrawer';
import { CartIconButton } from './cart/CartIconButton';
import { PremiumStorefrontNav } from './blocks/ShadcnCommerceBlocks';
import {
  normalizeStorefrontChromeConfig,
  type StorefrontCartVariant,
  type StorefrontChromeConfig,
  type StorefrontFooterVariant,
  type StorefrontNavbarVariant,
  type StorefrontSidebarVariant,
} from '@/lib/storefrontChrome';

export type ChromeNavPage = { slug: string; title: string };
export type ChromeLegalPolicy = { key: PolicyKey; title: string };

const PREMIUM_CHROME_TEMPLATES = new Set(['kiosk', 'bazaar', 'harvest', 'vitrine', 'launchpad', 'frame']);

/**
 * Tiny chrome shared by all storefront templates: a Souqna attribution
 * link (with the arch + wordmark) and an expiry note. Uses CSS vars from
 * the parent `<Storefront>` wrapper so the chrome adopts the palette.
 */

type Props = {
  storefront: Storefront;
  align?: 'between' | 'stack';
};

export function StorefrontTopRail({ storefront, align = 'between' }: Props) {
  const isRtl = storefront.locale === 'ar';
  const expiresLabel = new Intl.DateTimeFormat(isRtl ? 'ar-QA' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(storefront.expiresAt);

  const expiresPrefix = isRtl ? 'هذه الصفحة فعّالة حتى' : 'This page lives until';
  const homeHref = `${env.NEXT_PUBLIC_SITE_URL}${isRtl ? '/ar' : ''}`;

  return (
    <div
      className={
        align === 'between'
          ? 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2'
          : 'flex flex-col gap-3'
      }
      style={{
        paddingBottom: 24,
        marginBottom: 28,
        borderBottom: '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
      }}
    >
      <a
        href={homeHref}
        className="no-underline"
        style={{
          color: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <ArchMark size={20} stroke="var(--sf-accent)" />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '-0.01em' }}>
          {isRtl ? 'متجر سوقنا' : 'a Souqna storefront'}
        </span>
      </a>
      <span style={{ textAlign: isRtl ? 'left' : 'right' }}>
        {expiresPrefix} {expiresLabel}
      </span>
    </div>
  );
}

export function StorefrontFooter({ storefront }: Props) {
  const isRtl = storefront.locale === 'ar';
  const year = new Date().getFullYear();
  return (
    <footer
      className="flex flex-wrap items-center justify-between gap-4"
      style={{
        marginTop: 80,
        paddingTop: 24,
        borderTop: '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: 'color-mix(in srgb, var(--sf-ink) 50%, transparent)',
      }}
    >
      <span>
        © {year} {storefront.businessName.toUpperCase()}
      </span>
      <a
        href={`${env.NEXT_PUBLIC_SITE_URL}${isRtl ? '/ar/begin' : '/begin'}`}
        className="no-underline"
        style={{ color: 'inherit', borderBottom: '1px solid currentColor', paddingBottom: 1 }}
      >
        {isRtl ? 'صُمّم على سوقنا' : 'Built on Souqna'}
      </a>
    </footer>
  );
}

function StorefrontSidebarChrome({
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
  if (variant === 'sidebar-none') return null;
  const isRtl = storefront.locale === 'ar';
  const productsLabel =
    storefront.productIndex.title ||
    (isRtl ? '\u0643\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a' : 'All Products');
  const links = [
    { href: storefrontBaseHref, label: isRtl ? '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629' : 'Home' },
    ...(storefront.productIndex.enabled
      ? [{ href: `${storefrontBaseHref}/products`, label: productsLabel }]
      : []),
    ...pages.slice(0, 5).map((page) => ({ href: `${storefrontBaseHref}/${page.slug}`, label: page.title })),
  ];
  const title = label || (isRtl ? '\u062a\u0635\u0641\u062d \u0627\u0644\u0645\u062a\u062c\u0631' : 'Browse store');
  return (
    <aside
      aria-label={isRtl ? '\u062a\u0646\u0642\u0644 \u0627\u0644\u0645\u062a\u062c\u0631' : 'Store menu'}
      style={{
        position: 'fixed',
        insetBlockStart:
          variant === 'sidebar-floating-menu' || variant === 'sidebar-account-style'
            ? 'clamp(92px, 12vw, 140px)'
            : '50%',
        transform:
          variant === 'sidebar-floating-menu' || variant === 'sidebar-account-style'
            ? undefined
            : 'translateY(-50%)',
        insetInlineStart: isRtl ? undefined : 14,
        insetInlineEnd: isRtl ? 14 : undefined,
        zIndex: 44,
        display: 'grid',
        gap: 6,
        maxWidth: 210,
        padding: variant === 'sidebar-account-style' ? 10 : 8,
        borderRadius: variant === 'sidebar-category-rail' ? 999 : 18,
        border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
        background:
          variant === 'sidebar-max-catalog'
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--sf-ink) 9%, var(--sf-ground)), var(--sf-ground))'
            : 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
        boxShadow: '0 18px 44px -34px color-mix(in srgb, var(--sf-ink) 70%, transparent)',
        backdropFilter: 'blur(16px)',
      }}
      className="souqna-storefront-sidebar-chrome"
    >
      <style>{`
        @media (max-width: 900px) {
          .souqna-storefront-sidebar-chrome { display: none !important; }
        }
      `}</style>
      {variant !== 'sidebar-category-rail' ? (
        <span
          style={{
            padding: '4px 10px 2px',
            color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
      ) : null}
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="no-underline"
          style={{
            minWidth: variant === 'sidebar-category-rail' ? 0 : 126,
            padding: variant === 'sidebar-category-rail' ? '9px 10px' : '9px 12px',
            borderRadius: 999,
            color: 'var(--sf-ink)',
            background:
              variant === 'sidebar-filter-drawer' || variant === 'sidebar-max-catalog'
                ? 'color-mix(in srgb, var(--sf-ink) 5%, transparent)'
                : 'transparent',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {link.label}
        </a>
      ))}
    </aside>
  );
}

/**
 * Wraps a storefront tree with the M3 cart provider and mounts the
 * floating cart trigger + slide-in drawer once at the root. The cart
 * is enabled iff the storefront has at least one configured payment
 * method — in that case the icon and drawer are rendered; otherwise
 * the cart context is still installed (so block-level "Add to cart"
 * CTAs can mount safely as no-ops) but neither the trigger nor the
 * drawer are visible.
 *
 * The icon is a fixed-position floating element pinned to the
 * inline-end side of the viewport. It deliberately doesn't get baked
 * into a per-template header because storefront templates render their
 * own headers; floating keeps it consistent across every template,
 * archetype, and the Souqy bundle.
 */
export function StorefrontChrome({
  storefront,
  storefrontSlug,
  storefrontBaseHref,
  enabled,
  currency,
  navPages,
  legalPolicies,
  chrome,
  children,
}: {
  storefront: Storefront;
  storefrontSlug: string;
  /**
   * Absolute URL of the storefront subdomain (e.g.
   * `https://shop.souqna.qa`). Used to build cross-host links so the
   * chrome navigates correctly from apex (`souqna.qa/brief/...`),
   * dev (`localhost:3000/brief/...`), and the builder preview iframe
   * — not just from the live subdomain.
   */
  storefrontBaseHref: string;
  enabled: boolean;
  currency: string;
  navPages: ChromeNavPage[];
  legalPolicies: ChromeLegalPolicy[];
  chrome?: StorefrontChromeConfig;
  children: ReactNode;
}) {
  const chromeConfig = normalizeStorefrontChromeConfig(chrome);
  const usePremiumChrome =
    PREMIUM_CHROME_TEMPLATES.has(storefront.templateId) || isPremiumNavbar(chromeConfig.navbar);
  return (
    <CartProvider storefrontSlug={storefrontSlug} enabled={enabled} currency={currency}>
      {usePremiumChrome ? (
        <PremiumStorefrontNav
          storefront={storefront}
          pages={navPages}
          legalPolicies={legalPolicies}
          storefrontBaseHref={storefrontBaseHref}
          variant={chromeConfig.navbar}
          cartVariant={chromeConfig.cart}
          announcement={chromeConfig.navAnnouncement}
          ctaLabel={chromeConfig.navCtaLabel}
          ctaHref={chromeConfig.navCtaHref}
          showSearch={chromeConfig.showSearch}
          showPolicyLinks={chromeConfig.showPolicyLinks}
          cartLabel={chromeConfig.cartLabel}
          sticky
        />
      ) : (
        <ChromePageNav
          storefront={storefront}
          pages={navPages}
          storefrontBaseHref={storefrontBaseHref}
          legalPolicies={legalPolicies}
          variant={chromeConfig.navbar}
          cartVariant={chromeConfig.cart}
          announcement={chromeConfig.navAnnouncement}
          ctaLabel={chromeConfig.navCtaLabel}
          ctaHref={chromeConfig.navCtaHref}
          showSearch={chromeConfig.showSearch}
          showPolicyLinks={chromeConfig.showPolicyLinks}
          cartLabel={chromeConfig.cartLabel}
        />
      )}
      <StorefrontSidebarChrome
        storefront={storefront}
        pages={navPages}
        storefrontBaseHref={storefrontBaseHref}
        variant={chromeConfig.sidebar}
        label={chromeConfig.sidebarLabel}
      />
      {children}
      <ChromeStorefrontFooter
        storefront={storefront}
        pages={navPages}
        policies={legalPolicies}
        storefrontBaseHref={storefrontBaseHref}
        variant={chromeConfig.footer}
        headline={chromeConfig.footerHeadline}
        text={chromeConfig.footerText}
        showNewsletter={chromeConfig.footerShowNewsletter}
      />
      <CartDrawer
        currency={currency}
        variant={chromeConfig.cart}
        labels={cartDrawerLabels(storefront.locale, chromeConfig)}
      />
    </CartProvider>
  );
}

/**
 * Top nav strip listing the founder's `showInNav` pages. Sits above
 * every template's hero so any storefront design — minimalist, dense,
 * full-bleed — gets a consistent way to reach secondary pages without
 * the chrome fighting the template's typography. Uses logical CSS so
 * the order flips automatically when the parent `<div dir="rtl">` is
 * set by the Storefront wrapper.
 */
function ChromePageNav({
  storefront,
  pages,
  storefrontBaseHref,
  legalPolicies,
  variant,
  cartVariant,
  announcement,
  ctaLabel,
  ctaHref,
  showSearch = true,
  showPolicyLinks = true,
  cartLabel,
}: {
  storefront: Storefront;
  pages: ChromeNavPage[];
  storefrontBaseHref: string;
  legalPolicies: ChromeLegalPolicy[];
  variant: StorefrontNavbarVariant;
  cartVariant: StorefrontCartVariant;
  announcement?: string;
  ctaLabel?: string;
  ctaHref?: string;
  showSearch?: boolean;
  showPolicyLinks?: boolean;
  cartLabel?: string;
}) {
  const isRtl = storefront.locale === 'ar';
  const homeLabel =
    isRtl ? '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629' : 'Home';
  const productsLabel =
    storefront.productIndex.title ||
    (isRtl
      ? '\u0643\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'
      : 'All Products');
  const links = [
    { href: storefrontBaseHref, label: homeLabel },
    ...(storefront.productIndex.enabled
      ? [{ href: `${storefrontBaseHref}/products`, label: productsLabel }]
      : []),
    ...pages.map((p) => ({ href: `${storefrontBaseHref}/${p.slug}`, label: p.title })),
    ...(showPolicyLinks
      ? legalPolicies.slice(0, 2).map((policy) => ({
          href: `${storefrontBaseHref}/${policy.key}`,
          label: policy.title,
        }))
      : []),
  ];
  const browseLabel = isRtl ? '\u062a\u0635\u0641\u062d' : 'Browse';
  const resolvedCtaHref = resolveChromeHref(ctaHref, storefrontBaseHref);

  return (
    <>
      {announcement ? <ChromeAnnouncement text={announcement} /> : null}
      <nav
        aria-label={isRtl ? '\u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631' : 'Storefront pages'}
        className="flex flex-wrap items-center justify-between"
        style={{
          gap: 'clamp(12px, 2vw, 22px)',
          paddingBlock: variant === 'navbar-compact' ? 8 : 'clamp(10px, 1.4vw, 16px)',
          paddingInline: 'clamp(16px, 4vw, 32px)',
          borderBottom: '1px solid color-mix(in srgb, var(--sf-accent) 18%, transparent)',
          background:
            variant === 'navbar-market'
              ? 'color-mix(in srgb, var(--sf-ink) 5%, var(--sf-ground))'
              : 'color-mix(in srgb, var(--sf-ground) 94%, transparent)',
          position: variant === 'navbar-clean' ? 'sticky' : 'relative',
          top: variant === 'navbar-clean' ? 0 : undefined,
          zIndex: variant === 'navbar-clean' ? 45 : undefined,
          backdropFilter: variant === 'navbar-clean' ? 'blur(16px)' : undefined,
        }}
      >
      <a
        href={storefrontBaseHref}
        rel="noopener"
        className="no-underline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          color: 'var(--sf-ink)',
        }}
      >
        <LogoOrMonogram storefront={storefront} size={28} />
        <span
          style={{
            maxWidth: 'min(260px, 48vw)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-serif), serif',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {storefront.businessName}
        </span>
      </a>
        <div
        className="flex flex-wrap items-center justify-end"
        style={{
          gap: 'clamp(12px, 2vw, 20px)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          letterSpacing: '0.04em',
        }}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            rel="noopener"
            className="no-underline transition-opacity hover:opacity-100"
            style={{ color: 'var(--sf-ink)', opacity: 0.78 }}
          >
            {link.label}
          </a>
        ))}
        {showSearch && storefront.productIndex.enabled ? (
          <a
            href={`${storefrontBaseHref}/products`}
            rel="noopener"
            className="no-underline"
            style={{
              color: 'var(--sf-ink)',
              opacity: 0.82,
              borderBottom: '1px solid color-mix(in srgb, var(--sf-accent) 44%, transparent)',
              paddingBottom: 2,
            }}
          >
            {browseLabel}
          </a>
        ) : null}
        {ctaLabel && resolvedCtaHref ? (
          <a
            href={resolvedCtaHref}
            rel="noopener"
            className="no-underline"
            style={{
              color: 'var(--sf-ground)',
              background: 'var(--sf-ink)',
              borderRadius: 999,
              padding: '8px 12px',
            }}
          >
            {ctaLabel}
          </a>
        ) : null}
        <CartIconButton
          label={cartLabel || (isRtl ? '\u0627\u0644\u0633\u0644\u0629' : 'Cart')}
          variant={cartVariant}
        />
        </div>
      </nav>
    </>
  );
}

function ChromeAnnouncement({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        textAlign: 'center',
        background: 'color-mix(in srgb, var(--sf-accent) 13%, var(--sf-ground))',
        borderBottom: '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)',
        color: 'var(--sf-ink)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: '0.06em',
      }}
    >
      {text}
    </div>
  );
}

function ChromeStorefrontFooter({
  storefront,
  pages,
  policies,
  storefrontBaseHref,
  variant,
  headline,
  text,
  showNewsletter,
}: {
  storefront: Storefront;
  pages: ChromeNavPage[];
  policies: ChromeLegalPolicy[];
  storefrontBaseHref: string;
  variant: StorefrontFooterVariant;
  headline?: string;
  text?: string;
  showNewsletter?: boolean;
}) {
  const isRtl = storefront.locale === 'ar';
  const year = new Date().getFullYear();
  const links = [
    { href: storefrontBaseHref, label: isRtl ? '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629' : 'Home' },
    ...(storefront.productIndex.enabled
      ? [
          {
            href: `${storefrontBaseHref}/products`,
            label:
              storefront.productIndex.title ||
              (isRtl ? '\u0643\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a' : 'All Products'),
          },
        ]
      : []),
    ...pages.slice(0, 4).map((page) => ({ href: `${storefrontBaseHref}/${page.slug}`, label: page.title })),
    ...policies.map((p) => ({ href: `${storefrontBaseHref}/${p.key}`, label: p.title })),
  ];
  return (
    <footer
      className="flex flex-wrap"
      style={{
        alignItems: variant === 'footer-brand-story' || variant === 'footer-luxury' ? 'end' : 'center',
        justifyContent:
          variant === 'footer-minimal' || variant === 'footer-links' ? 'center' : 'space-between',
        gap: 'clamp(16px, 3vw, 34px)',
        marginTop: 64,
        paddingBlock:
          variant === 'footer-luxury' || variant === 'footer-max-directory'
            ? 'clamp(32px, 5vw, 56px)'
            : 'clamp(20px, 3vw, 30px)',
        paddingInline: 'clamp(16px, 4vw, 32px)',
        borderTop: '1px solid color-mix(in srgb, var(--sf-accent) 18%, transparent)',
        background:
          variant === 'footer-luxury' || variant === 'footer-editorial'
            ? 'color-mix(in srgb, var(--sf-ink) 6%, transparent)'
            : undefined,
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11.5,
        letterSpacing: '0.06em',
        color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
      }}
    >
      <div style={{ display: 'grid', gap: 6, minWidth: 180 }}>
        <strong
          style={{
            color: 'var(--sf-ink)',
            fontFamily: 'var(--font-serif), serif',
            fontSize: variant === 'footer-luxury' ? 22 : 15,
            letterSpacing: 0,
          }}
        >
          {headline || storefront.businessName}
        </strong>
        <span>
          {text ||
            storefront.tagline ||
            (isRtl
              ? '\u0645\u062a\u062c\u0631 \u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0644\u0628\u0627\u062a'
              : `Commerce storefront · ${year}`)}
        </span>
        {showNewsletter || variant === 'footer-newsletter' ? (
          <a
            href={storefront.phone ? `https://wa.me/${storefront.phone.replace(/\D/g, '')}` : storefrontBaseHref}
            target={storefront.phone ? '_blank' : undefined}
            rel={storefront.phone ? 'noreferrer' : 'noopener'}
            className="no-underline"
            style={{
              justifySelf: 'start',
              marginTop: 6,
              color: 'var(--sf-ink)',
              border: '1px solid color-mix(in srgb, var(--sf-accent) 34%, transparent)',
              borderRadius: 999,
              padding: '8px 12px',
              background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
            }}
          >
            {isRtl
              ? '\u0627\u0633\u062a\u0644\u0645 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631'
              : 'Get store updates'}
          </a>
        ) : null}
      </div>
      <nav
        aria-label={isRtl ? '\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u062a\u0630\u064a\u064a\u0644' : 'Footer links'}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'inherit',
          gap: variant === 'footer-policy-grid' || variant === 'footer-max-directory' ? 10 : 18,
          maxWidth: variant === 'footer-max-directory' ? 620 : undefined,
        }}
      >
        {links.map((link) => (
          <a
            key={`${link.href}-${link.label}`}
            href={link.href}
            rel="noopener"
            className="no-underline transition-opacity hover:opacity-100"
            style={{
              color: 'inherit',
              opacity: 0.88,
              padding:
                variant === 'footer-policy-grid' || variant === 'footer-support'
                  ? '7px 10px'
                  : undefined,
              border:
                variant === 'footer-policy-grid' || variant === 'footer-support'
                  ? '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)'
                  : undefined,
              borderRadius:
                variant === 'footer-policy-grid' || variant === 'footer-support' ? 999 : undefined,
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

function resolveChromeHref(value: string | undefined, storefrontBaseHref: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:|sms:|whatsapp:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) return trimmed;
  if (trimmed === '/') return storefrontBaseHref;
  if (trimmed === storefrontBaseHref || trimmed.startsWith(`${storefrontBaseHref}/`)) return trimmed;
  if (trimmed.startsWith('/')) return `${storefrontBaseHref}${trimmed}`;
  return `${storefrontBaseHref}/${trimmed.replace(/^\/+/, '')}`;
}

function cartDrawerLabels(
  locale: Storefront['locale'],
  chrome: Required<StorefrontChromeConfig>,
): Partial<CartDrawerLabels> {
  const isRtl = locale === 'ar';
  const defaults: CartDrawerLabels = isRtl
    ? {
        title: '\u0633\u0644\u062a\u0643',
        close: '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0633\u0644\u0629',
        size: '\u0627\u0644\u0645\u0642\u0627\u0633',
        variant: '\u0627\u0644\u062e\u064a\u0627\u0631',
        height: '\u0627\u0644\u0637\u0648\u0644',
        remove: '\u0625\u0632\u0627\u0644\u0629',
        subtotal: '\u0627\u0644\u0645\u062c\u0645\u0648\u0639',
        checkout: '\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062f\u0641\u0639',
        emptyTitle: '\u0627\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063a\u0629',
        emptyText: '\u062a\u0635\u0641\u062d \u0627\u0644\u0645\u062a\u062c\u0631 \u0648\u0623\u0636\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062a\u064a \u062a\u0646\u0627\u0633\u0628\u0643.',
        continueBrowsing: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062a\u0635\u0641\u062d',
        decreaseQuantity: '\u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u0643\u0645\u064a\u0629',
        increaseQuantity: '\u0632\u064a\u0627\u062f\u0629 \u0627\u0644\u0643\u0645\u064a\u0629',
      }
    : {
        title: 'Your cart',
        close: 'Close cart',
        size: 'Size',
        variant: 'Variant',
        height: 'Height',
        remove: 'Remove',
        subtotal: 'Subtotal',
        checkout: 'Checkout',
        emptyTitle: 'Your cart is empty',
        emptyText: "Browse the storefront and add anything you'd like. It'll show up here.",
        continueBrowsing: 'Continue browsing',
        decreaseQuantity: 'Decrease quantity',
        increaseQuantity: 'Increase quantity',
      };
  return {
    ...defaults,
    title: chrome.cartLabel || defaults.title,
    checkout: chrome.cartCheckoutLabel || defaults.checkout,
    emptyTitle: chrome.cartEmptyTitle || defaults.emptyTitle,
    emptyText: chrome.cartEmptyText || defaults.emptyText,
  };
}

function isPremiumNavbar(variant: StorefrontNavbarVariant): boolean {
  return (
    variant !== 'navbar-simple' &&
    variant !== 'navbar-clean' &&
    variant !== 'navbar-compact' &&
    variant !== 'navbar-market'
  );
}

/**
 * Renders an avatar-style logo if one is uploaded, otherwise a soft accent
 * monogram derived from the business name. Templates compose this directly.
 *
 * Hero blocks may pass `overrideUrl` (custom logo image) or `overrideText`
 * (1–4 letters) to swap the default storefront logo for a per-block override
 * without affecting the global brand identity.
 */
export function LogoOrMonogram({
  storefront,
  size = 96,
  overrideUrl,
  overrideText,
}: {
  storefront: Storefront;
  size?: number;
  overrideUrl?: string;
  overrideText?: string;
}) {
  const url = overrideUrl ?? storefront.logoUrl;
  const initial =
    (overrideText && overrideText.trim()) ||
    (storefront.businessName?.trim()[0] ?? '·').toUpperCase();
  if (url && !overrideText) {
    return (
      <img
        src={url}
        alt={storefront.businessName}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid color-mix(in srgb, var(--sf-accent) 30%, transparent)',
          background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
        }}
      />
    );
  }
  const letters = initial.slice(0, 4);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--sf-accent) 14%, transparent)',
        color: 'var(--sf-accent)',
        fontFamily: 'var(--font-serif), serif',
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: letters.length > 1 ? size * 0.32 : size * 0.5,
        lineHeight: 1,
        letterSpacing: letters.length > 1 ? '0.02em' : 0,
      }}
    >
      {letters}
    </div>
  );
}
