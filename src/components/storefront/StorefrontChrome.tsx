/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { ArchMark } from '@/components/primitives/ArchMark';
import type { Storefront } from '@/lib/brief';
import type { PolicyKey } from '@/lib/storefrontSettings';
import { env } from '@/lib/env';
import { CartProvider } from './cart/CartContext';
import { CartDrawer, type CartDrawerLabels } from './cart/CartDrawer';
import { CartIconButton } from './cart/CartIconButton';
import { StorefrontSidebar } from './StorefrontSidebar';
import { PremiumStorefrontNav } from './blocks/ShadcnCommerceBlocks';
import {
  normalizeStorefrontChromeConfig,
  type StorefrontCartVariant,
  type StorefrontChromeConfig,
  type StorefrontFooterVariant,
  type StorefrontNavbarVariant,
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
      <StorefrontSidebar
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

type FooterLink = { href: string; label: string; external?: boolean };
type FooterLayout = 'inline' | 'feature' | 'directory' | 'statement';
type FooterFeature = 'none' | 'newsletter' | 'whatsapp' | 'trust' | 'story' | 'support';

type FooterSpec = {
  layout: FooterLayout;
  feature: FooterFeature;
  /** Soft ink-tinted band behind the whole footer. */
  tint: boolean;
  /** Large serif brand lockup. */
  bigBrand: boolean;
  /** Break links into more, tighter columns. */
  dense: boolean;
  /** Render policies as a pill grid rather than a plain column. */
  policyPills: boolean;
};

function footerSpec(variant: StorefrontFooterVariant): FooterSpec {
  switch (variant) {
    case 'footer-links':
      return { layout: 'directory', feature: 'none', tint: false, bigBrand: false, dense: false, policyPills: false };
    case 'footer-commerce':
      return { layout: 'feature', feature: 'whatsapp', tint: false, bigBrand: false, dense: false, policyPills: false };
    case 'footer-newsletter':
      return { layout: 'feature', feature: 'newsletter', tint: true, bigBrand: false, dense: false, policyPills: false };
    case 'footer-brand-story':
      return { layout: 'feature', feature: 'story', tint: false, bigBrand: true, dense: false, policyPills: false };
    case 'footer-social-proof':
      return { layout: 'feature', feature: 'trust', tint: false, bigBrand: false, dense: false, policyPills: false };
    case 'footer-policy-grid':
      return { layout: 'directory', feature: 'none', tint: false, bigBrand: false, dense: true, policyPills: true };
    case 'footer-support':
      return { layout: 'feature', feature: 'support', tint: true, bigBrand: false, dense: false, policyPills: false };
    case 'footer-marketplace':
      return { layout: 'directory', feature: 'none', tint: false, bigBrand: false, dense: true, policyPills: false };
    case 'footer-luxury':
      return { layout: 'statement', feature: 'none', tint: true, bigBrand: true, dense: false, policyPills: false };
    case 'footer-editorial':
      return { layout: 'statement', feature: 'story', tint: false, bigBrand: true, dense: false, policyPills: false };
    case 'footer-max-directory':
      return { layout: 'directory', feature: 'none', tint: false, bigBrand: false, dense: true, policyPills: false };
    case 'footer-minimal':
    default:
      return { layout: 'inline', feature: 'none', tint: false, bigBrand: false, dense: false, policyPills: false };
  }
}

function footerCopy(isRtl: boolean) {
  return isRtl
    ? {
        home: 'الرئيسية',
        allProducts: 'كل المنتجات',
        shop: 'تسوّق',
        explore: 'الصفحات',
        policies: 'السياسات',
        contact: 'تواصل',
        stayInTouch: 'ابقَ على تواصل',
        updates: 'استلم تحديثات المتجر',
        whatsapp: 'واتساب',
        needHelp: 'تحتاج مساعدة؟',
        footerLinks: 'روابط التذييل',
        fallbackTagline: 'متجر جاهز للطلبات',
        rights: 'جميع الحقوق محفوظة',
        trust: ['دفع آمن', 'توصيل سريع', 'دعم محلي'],
      }
    : {
        home: 'Home',
        allProducts: 'All Products',
        shop: 'Shop',
        explore: 'Pages',
        policies: 'Policies',
        contact: 'Contact',
        stayInTouch: 'Stay in touch',
        updates: 'Get store updates',
        whatsapp: 'WhatsApp',
        needHelp: 'Need a hand?',
        footerLinks: 'Footer links',
        fallbackTagline: 'A storefront built for orders',
        rights: 'All rights reserved',
        trust: ['Secure checkout', 'Fast local delivery', 'Real human support'],
      };
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
  const spec = footerSpec(variant);
  const t = footerCopy(isRtl);

  const productsLabel = storefront.productIndex.title || t.allProducts;
  const productLinks: FooterLink[] = storefront.productIndex.enabled
    ? [{ href: `${storefrontBaseHref}/products`, label: productsLabel }]
    : [];
  const pageLinks: FooterLink[] = pages.map((p) => ({
    href: `${storefrontBaseHref}/${p.slug}`,
    label: p.title,
  }));
  const legalLinks: FooterLink[] = policies.map((p) => ({
    href: `${storefrontBaseHref}/${p.key}`,
    label: p.title,
  }));
  const waDigits = storefront.phone ? storefront.phone.replace(/\D/g, '') : '';
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;
  const contactLinks: FooterLink[] = waHref
    ? [{ href: waHref, label: t.whatsapp, external: true }]
    : [];

  const shopLinks: FooterLink[] = [
    { href: storefrontBaseHref, label: t.home },
    ...productLinks,
    ...pageLinks.slice(0, 6),
  ];

  // Directory columns — split more finely when dense.
  const columns: { heading: string; links: FooterLink[] }[] = spec.dense
    ? [
        { heading: t.shop, links: [{ href: storefrontBaseHref, label: t.home }, ...productLinks] },
        ...(pageLinks.length ? [{ heading: t.explore, links: pageLinks.slice(0, 6) }] : []),
        ...(!spec.policyPills && legalLinks.length ? [{ heading: t.policies, links: legalLinks }] : []),
        ...(contactLinks.length ? [{ heading: t.contact, links: contactLinks }] : []),
      ]
    : [
        { heading: t.shop, links: shopLinks },
        ...(legalLinks.length ? [{ heading: t.policies, links: legalLinks }] : []),
        ...(contactLinks.length ? [{ heading: t.contact, links: contactLinks }] : []),
      ];

  const brand = headline || storefront.businessName;
  const tagline = text || storefront.tagline || t.fallbackTagline;
  const wantsNewsletter = showNewsletter || spec.feature === 'newsletter';

  const brandBlock = (
    <FooterBrandBlock
      brand={brand}
      tagline={tagline}
      spec={spec}
      copy={t}
      wantsNewsletter={wantsNewsletter}
      waHref={waHref}
      fallbackHref={storefrontBaseHref}
      centered={spec.layout === 'inline'}
    />
  );

  return (
    <footer
      aria-label={t.footerLinks}
      style={{
        marginTop: 64,
        paddingBlock:
          spec.layout === 'statement' ? 'clamp(40px, 6vw, 72px)' : 'clamp(28px, 4vw, 46px)',
        paddingInline: 'clamp(16px, 4vw, 40px)',
        borderTop: '1px solid color-mix(in srgb, var(--sf-accent) 18%, transparent)',
        background: spec.tint ? 'color-mix(in srgb, var(--sf-ink) 5%, transparent)' : undefined,
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12,
        letterSpacing: '0.04em',
        color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
        display: 'grid',
        gap: 'clamp(22px, 4vw, 38px)',
      }}
    >
      {spec.layout === 'inline' ? (
        <div style={{ display: 'grid', justifyItems: 'center', gap: 18, textAlign: 'center' }}>
          {brandBlock}
          <FooterInlineLinks links={[...shopLinks, ...legalLinks]} centered />
        </div>
      ) : null}

      {spec.layout === 'statement' ? (
        <div style={{ display: 'grid', gap: 'clamp(20px, 3vw, 32px)' }}>
          {brandBlock}
          <FooterInlineLinks links={[...shopLinks, ...legalLinks, ...contactLinks]} />
        </div>
      ) : null}

      {spec.layout === 'feature' ? (
        <div
          className="souqna-footer-feature"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
            gap: 'clamp(24px, 5vw, 56px)',
            alignItems: 'start',
          }}
        >
          {brandBlock}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 'clamp(16px, 3vw, 32px)',
            }}
          >
            <FooterLinkColumn heading={t.shop} links={shopLinks} />
            {legalLinks.length ? <FooterLinkColumn heading={t.policies} links={legalLinks} /> : null}
          </div>
        </div>
      ) : null}

      {spec.layout === 'directory' ? (
        <div style={{ display: 'grid', gap: 'clamp(22px, 3vw, 32px)' }}>
          {brandBlock}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(${spec.dense ? 130 : 160}px, 1fr))`,
              gap: 'clamp(16px, 3vw, 34px)',
            }}
          >
            {columns.map((col) => (
              <FooterLinkColumn key={col.heading} heading={col.heading} links={col.links} />
            ))}
          </div>
          {spec.policyPills && legalLinks.length ? (
            <FooterPolicyPills heading={t.policies} links={legalLinks} />
          ) : null}
        </div>
      ) : null}

      <FooterBottomBar business={storefront.businessName} year={year} note={t.rights} />
      <style>{`
        @media (max-width: 720px) {
          .souqna-footer-feature { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterBrandBlock({
  brand,
  tagline,
  spec,
  copy,
  wantsNewsletter,
  waHref,
  fallbackHref,
  centered,
}: {
  brand: string;
  tagline: string;
  spec: FooterSpec;
  copy: ReturnType<typeof footerCopy>;
  wantsNewsletter: boolean;
  waHref: string | null;
  fallbackHref: string;
  centered?: boolean;
}) {
  const story = spec.feature === 'story';
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        minWidth: 0,
        justifyItems: centered ? 'center' : 'start',
        maxWidth: story ? 560 : centered ? undefined : 420,
      }}
    >
      <strong
        style={{
          color: 'var(--sf-ink)',
          fontFamily: 'var(--font-serif), serif',
          fontWeight: 500,
          fontSize: spec.bigBrand ? 'clamp(24px, 4vw, 38px)' : 18,
          lineHeight: 1.1,
          letterSpacing: spec.bigBrand ? '-0.02em' : 0,
        }}
      >
        {brand}
      </strong>
      <span
        style={{
          fontSize: story ? 14 : 12.5,
          lineHeight: story ? 1.7 : 1.5,
          color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
          maxWidth: story ? 520 : undefined,
        }}
      >
        {tagline}
      </span>

      {wantsNewsletter ? (
        <FooterCta
          href={waHref ?? fallbackHref}
          external={Boolean(waHref)}
          label={copy.updates}
          heading={copy.stayInTouch}
        />
      ) : null}

      {!wantsNewsletter && (spec.feature === 'whatsapp' || spec.feature === 'support') && waHref ? (
        <FooterCta
          href={waHref}
          external
          label={copy.whatsapp}
          heading={spec.feature === 'support' ? copy.needHelp : copy.contact}
          icon="chat"
        />
      ) : null}

      {spec.feature === 'trust' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {copy.trust.map((note) => (
            <span
              key={note}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 11px',
                borderRadius: 999,
                border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
                background: 'color-mix(in srgb, var(--sf-accent) 8%, transparent)',
                color: 'var(--sf-ink)',
                fontSize: 11,
                letterSpacing: '0.03em',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: 'var(--sf-accent)',
                }}
              />
              {note}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FooterCta({
  href,
  external,
  label,
  heading,
  icon,
}: {
  href: string;
  external?: boolean;
  label: string;
  heading?: string;
  icon?: 'chat';
}) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
      {heading ? (
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
          }}
        >
          {heading}
        </span>
      ) : null}
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : 'noopener'}
        className="no-underline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--sf-ink)',
          border: '1px solid color-mix(in srgb, var(--sf-accent) 34%, transparent)',
          borderRadius: 999,
          padding: '9px 14px',
          background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
          fontSize: 12,
          letterSpacing: '0.03em',
          width: 'fit-content',
        }}
      >
        {icon === 'chat' ? (
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
          </svg>
        ) : null}
        {label}
      </a>
    </div>
  );
}

function FooterLinkColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <nav aria-label={heading} style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--sf-ink) 50%, transparent)',
        }}
      >
        {heading}
      </span>
      <div style={{ display: 'grid', gap: 9 }}>
        {links.map((link) => (
          <FooterAnchor key={`${link.href}-${link.label}`} link={link} />
        ))}
      </div>
    </nav>
  );
}

function FooterInlineLinks({ links, centered }: { links: FooterLink[]; centered?: boolean }) {
  return (
    <nav
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: centered ? 'center' : 'flex-start',
        gap: 'clamp(14px, 2.5vw, 26px)',
      }}
    >
      {links.map((link) => (
        <FooterAnchor key={`${link.href}-${link.label}`} link={link} />
      ))}
    </nav>
  );
}

function FooterPolicyPills({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <nav aria-label={heading} style={{ display: 'grid', gap: 10 }}>
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--sf-ink) 50%, transparent)',
        }}
      >
        {heading}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {links.map((link) => (
          <a
            key={`${link.href}-${link.label}`}
            href={link.href}
            rel="noopener"
            className="no-underline transition-opacity hover:opacity-100"
            style={{
              color: 'var(--sf-ink)',
              opacity: 0.85,
              padding: '7px 12px',
              borderRadius: 999,
              border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
              fontSize: 11.5,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function FooterAnchor({ link }: { link: FooterLink }) {
  return (
    <a
      href={link.href}
      target={link.external ? '_blank' : undefined}
      rel={link.external ? 'noreferrer' : 'noopener'}
      className="no-underline transition-opacity hover:opacity-100"
      style={{ color: 'inherit', opacity: 0.85, fontSize: 12.5 }}
    >
      {link.label}
    </a>
  );
}

function FooterBottomBar({
  business,
  year,
  note,
}: {
  business: string;
  year: number;
  note: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between"
      style={{
        gap: 12,
        paddingTop: 18,
        borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: 'color-mix(in srgb, var(--sf-ink) 50%, transparent)',
      }}
    >
      <span>
        © {year} {business.toUpperCase()}
      </span>
      <span>{note}</span>
    </div>
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
        total: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a',
        shippingNote: '\u064a\u064f\u062d\u062a\u0633\u0628 \u0627\u0644\u0634\u062d\u0646 \u0639\u0646\u062f \u0627\u0644\u062f\u0641\u0639',
        secureNote: '\u062f\u0641\u0639 \u0622\u0645\u0646',
        items: '\u0645\u0646\u062a\u062c\u0627\u062a',
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
        total: 'Total',
        shippingNote: 'Shipping calculated at checkout',
        secureNote: 'Secure checkout',
        items: 'items',
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
