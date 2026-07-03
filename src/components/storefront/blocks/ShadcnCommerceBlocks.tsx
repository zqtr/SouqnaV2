'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CreditCard,
  Filter,
  Gift,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AddToCartButton } from '@/components/storefront/cart/AddToCartButton';
import { CartIconButton } from '@/components/storefront/cart/CartIconButton';
import { StorefrontReviewsWidget } from '@/components/storefront/reviews/StorefrontReviewsWidget';
import type { Storefront } from '@/lib/brief';
import { resolveCommerceProductSource } from '@/lib/blocks/commerce';
import { normalizeWaMePhone } from '@/lib/whatsappLinks';
import { isVideoMediaUrl, mediaKindFromUrl } from '@/lib/media';
import type {
  ChromeLegalPolicy,
  ChromeNavPage,
} from '@/components/storefront/StorefrontChrome';
import type { Product } from '@/lib/products';
import type { StorefrontCartVariant } from '@/lib/storefrontChrome';
import type { BlockRenderProps } from './BlockContext';
import type {
  EcommerceBlockProps,
  ShadcnCategoriesProps,
  ShadcnFooterProps,
  ShadcnHeroProps,
  ShadcnNavbarProps,
  ShadcnOfferModalProps,
  ShadcnOrderSummaryProps,
  ShadcnProductCardProps,
  ShadcnProductDetailProps,
  ShadcnProductListProps,
  ShadcnQuickViewProps,
  ShadcnReviewsProps,
  ShadcnTrustStripProps,
} from '@/lib/blocks/types';
import { productPathSegment } from './helpers';

type PremiumProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  priceQar: number | null;
  imageUrl: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  category: string;
  href: string;
  status: Product['status'];
  stock: number;
  sizeOptions: string[];
  sizeOptionPrices: Product['sizeOptionPrices'];
  allowCustomSize: boolean;
  variantOptions: string[];
  variantOptionPrices: Product['variantOptionPrices'];
  requiresHeightInput: boolean;
  heightInputLabel: string | null;
  heightOptions: string[];
};

type PremiumCategory = {
  id: string;
  label: string;
  imageUrl: string | null;
  href: string;
  count: number;
};

const FAMILY_LABELS = {
  en: {
    browse: 'Browse',
    products: 'Products',
    allProducts: 'All products',
    checkout: 'Checkout',
    cart: 'Cart',
    featured: 'Featured',
    add: 'Add to cart',
    view: 'View product',
    quick: 'Quick view',
    categories: 'Collections',
    reviews: 'Customer notes',
    trusted: 'Trusted checkout',
    order: 'Order preview',
    offer: 'Exclusive offer',
    empty: 'Add products to make this premium section live.',
    available: 'Available',
    soldOut: 'Sold out',
    delivery: 'Local delivery',
    secure: 'Secure checkout',
    whatsapp: 'WhatsApp support',
    catalog: 'Live catalogue',
  },
  ar: {
    browse: 'تصفح',
    products: 'المنتجات',
    allProducts: 'كل المنتجات',
    checkout: 'الدفع',
    cart: 'السلة',
    featured: 'مختار',
    add: 'أضف للسلة',
    view: 'عرض المنتج',
    quick: 'نظرة سريعة',
    categories: 'المجموعات',
    reviews: 'آراء العملاء',
    trusted: 'دفع موثوق',
    order: 'ملخص الطلب',
    offer: 'عرض خاص',
    empty: 'أضف منتجات ليظهر هذا القسم المميز.',
    available: 'متوفر',
    soldOut: 'نفد',
    delivery: 'توصيل محلي',
    secure: 'دفع آمن',
    whatsapp: 'دعم واتساب',
    catalog: 'كتالوج مباشر',
  },
};

function premiumChromeCopy(isRtl: boolean) {
  if (isRtl) {
    return {
      home: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
      storefrontPages: '\u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631',
      openMenu: '\u0641\u062a\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
      closeMenu: '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
      footerLinks: '\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0645\u062a\u062c\u0631',
      whatsapp: '\u0648\u0627\u062a\u0633\u0627\u0628',
      fallback: '\u0645\u062a\u062c\u0631 \u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u0627\u0644\u062f\u0641\u0639.',
      stars: (rating: number) => `${rating} \u0646\u062c\u0648\u0645`,
    };
  }
  return {
    home: 'Home',
    storefrontPages: 'Storefront pages',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    footerLinks: 'Store links',
    whatsapp: 'WhatsApp',
    fallback: 'A storefront ready for orders and checkout.',
    stars: (rating: number) => `${rating} stars`,
  };
}

function storefrontHref(value: string | undefined | null, storefrontBaseHref: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return `${storefrontBaseHref}/products`;
  if (/^(https?:|mailto:|tel:|sms:|whatsapp:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) return trimmed;
  if (trimmed === '/') return storefrontBaseHref;
  if (trimmed === storefrontBaseHref || trimmed.startsWith(`${storefrontBaseHref}/`)) return trimmed;
  if (trimmed.startsWith('/')) return `${storefrontBaseHref}${trimmed}`;
  return `${storefrontBaseHref}/${trimmed.replace(/^\/+/, '')}`;
}

function storefrontCheckoutHref(storefrontBaseHref: string): string {
  return `${storefrontBaseHref}/checkout`;
}

export function ShadcnNavbarBlock({ block, ctx }: BlockRenderProps<ShadcnNavbarProps>) {
  const props = block.props;
  return (
    <PremiumStorefrontNav
      storefront={ctx.storefront}
      storefrontBaseHref={ctx.storefrontBaseHref}
      pages={ctx.navPages}
      legalPolicies={ctx.legalPolicies}
      variant={props.variant}
      sticky={props.sticky}
      announcement={props.announcement}
      ctaLabel={props.ctaLabel}
      ctaHref={props.ctaHref}
      showSearch={props.showSearch}
      showPolicyLinks={props.showPolicyLinks}
      cartLabel={props.cartLabel}
      embedded
    />
  );
}

export function ShadcnHeroBlock({ block, ctx }: BlockRenderProps<ShadcnHeroProps>) {
  const props = block.props;
  const products = usePremiumProducts(props, ctx.products, ctx.storefrontBaseHref, 4);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  const lead = products[0];
  const primaryHref = storefrontHref(props.cta?.href, ctx.storefrontBaseHref);
  return (
    <section style={heroStyle(props.variant, props.tone)}>
      <div style={heroCopyStyle}>
        <Pill>{props.kicker || props.eyebrow || t.featured}</Pill>
        <h2 style={headlineStyle(ctx.isRtl)}>{props.title || ctx.storefront.businessName}</h2>
        <p style={bodyStyle}>{props.subtitle || ctx.storefront.tagline || t.catalog}</p>
        <div style={actionRowStyle}>
          <Link href={primaryHref} style={primaryLinkStyle}>
            {props.cta?.label || t.allProducts}
            <ArrowUpRight size={16} />
          </Link>
          {lead ? (
            <Link href={lead.href} style={ghostLinkStyle}>
              {t.view}
            </Link>
          ) : null}
        </div>
      </div>
      <div style={heroVisualGridStyle(props.variant)}>
        {products.length === 0 ? <EmptyPremium label={t.empty} /> : null}
        {products.map((product, index) => (
          <ProductVisual
            key={product.id}
            product={product}
            isRtl={ctx.isRtl}
            featured={index === 0}
            variant={props.variant === 'ecommerce-hero6' ? 'wide' : 'stack'}
          />
        ))}
      </div>
    </section>
  );
}

export function ShadcnTrustStripBlock({ block, ctx }: BlockRenderProps<ShadcnTrustStripProps>) {
  const props = block.props;
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  const metrics =
    props.metrics?.length
      ? props.metrics
      : [
          { value: String(ctx.products.length), labelEn: t.products, labelAr: t.products, icon: 'boxes' },
          { value: ctx.storefront.checkout.paymentMethods.length ? t.secure : t.whatsapp, labelEn: t.trusted, labelAr: t.trusted, icon: 'shield' },
          { value: ctx.storefront.area || 'Qatar', labelEn: t.delivery, labelAr: t.delivery, icon: 'truck' },
        ];
  return (
    <section style={stripStyle(props.variant)}>
      {metrics.map((metric, index) => (
        <div key={`${metric.value}-${index}`} style={metricCardStyle}>
          {iconFor(metric.icon)}
          <strong>{metric.value}</strong>
          <span>{ctx.isRtl ? metric.labelAr || metric.labelEn : metric.labelEn || metric.labelAr}</span>
        </div>
      ))}
    </section>
  );
}

export function ShadcnCategoriesBlock({ block, ctx }: BlockRenderProps<ShadcnCategoriesProps>) {
  const props = block.props;
  const categories = categoriesFromProducts(ctx.products, ctx.storefrontBaseHref);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  return (
    <section style={panelStyle}>
      <SectionHeading kicker={props.kicker || t.catalog} title={props.title || t.categories} subtitle={props.subtitle} isRtl={ctx.isRtl} />
      <div style={categoryGridStyle(props.variant)}>
        {categories.length === 0 ? <EmptyPremium label={t.empty} /> : null}
        {categories.map((category) => (
          <Link key={category.id} href={category.href} style={categoryTileStyle}>
            {category.imageUrl ? <img src={category.imageUrl} alt="" style={categoryImageStyle} /> : null}
            <span style={categoryOverlayStyle} />
            <span style={categoryTextStyle}>
              <strong>{category.label}</strong>
              <small>
                {category.count} {t.products}
              </small>
            </span>
          </Link>
        ))}
      </div>
      <PremiumSectionCta
        href={storefrontHref(props.cta?.href, ctx.storefrontBaseHref)}
        label={props.cta?.label || t.allProducts}
        isRtl={ctx.isRtl}
      />
    </section>
  );
}

export function ShadcnProductCardBlock({ block, ctx }: BlockRenderProps<ShadcnProductCardProps>) {
  const props = block.props;
  const products = usePremiumProducts(props, ctx.products, ctx.storefrontBaseHref, 4);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  return (
    <section style={panelStyle}>
      <SectionHeading kicker={props.kicker || t.featured} title={props.title || t.featured} subtitle={props.subtitle} isRtl={ctx.isRtl} />
      <div style={productCardGridStyle(props.variant)}>
        {products.length === 0 ? <EmptyPremium label={t.empty} /> : null}
        {products.map((product) => (
          <PremiumProductCard key={product.id} product={product} isRtl={ctx.isRtl} variant={props.variant} />
        ))}
      </div>
      <PremiumSectionCta
        href={`${ctx.storefrontBaseHref}/products`}
        label={props.cta?.label || t.allProducts}
        isRtl={ctx.isRtl}
      />
    </section>
  );
}

export function ShadcnProductListBlock({ block, ctx }: BlockRenderProps<ShadcnProductListProps>) {
  const props = block.props;
  const products = usePremiumProducts(props, ctx.products, ctx.storefrontBaseHref, 8);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  return (
    <section style={panelStyle}>
      <SectionHeading kicker={props.kicker || t.catalog} title={props.title || t.products} subtitle={props.subtitle} isRtl={ctx.isRtl} />
      <div style={listWrapStyle(props.variant)}>
        {products.length === 0 ? <EmptyPremium label={t.empty} /> : null}
        {products.map((product, index) => (
          <ProductRow key={product.id} product={product} isRtl={ctx.isRtl} index={index} />
        ))}
      </div>
      <PremiumSectionCta
        href={storefrontHref(props.cta?.href, ctx.storefrontBaseHref)}
        label={props.cta?.label || t.allProducts}
        isRtl={ctx.isRtl}
      />
    </section>
  );
}

export function ShadcnProductDetailBlock({ block, ctx }: BlockRenderProps<ShadcnProductDetailProps>) {
  const props = block.props;
  const product = pickOneProduct(props, ctx.products, ctx.storefrontBaseHref);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  if (!product) return <EmptyPremium label={t.empty} />;
  return (
    <section style={detailStyle(props.variant)}>
      <div style={detailImageShellStyle}>
        <ProductMedia product={product} alt={product.title} style={detailImageStyle} controls />
      </div>
      <div style={detailInfoStyle}>
        <Pill>{product.category || t.quick}</Pill>
        <h2 style={headlineStyle(ctx.isRtl)}>{props.title || product.title}</h2>
        <p style={bodyStyle}>{props.subtitle || product.description}</p>
        <strong style={priceStyle}>{product.price}</strong>
        <div style={actionRowStyle}>
          <Link href={product.href} style={ghostLinkStyle}>
            {t.view}
          </Link>
        </div>
        {canAddProductToCart(product) ? (
          <AddToCartButton
            productId={product.id}
            title={product.title}
            priceQar={product.priceQar}
            imageUrl={cartImageUrl(product)}
            sizeOptions={product.sizeOptions}
            sizeOptionPrices={product.sizeOptionPrices}
            allowCustomSize={product.allowCustomSize}
            variantOptions={product.variantOptions}
            variantOptionPrices={product.variantOptionPrices}
            requiresHeightInput={product.requiresHeightInput}
            heightInputLabel={product.heightInputLabel}
            heightOptions={product.heightOptions}
            variant="primary"
            label={t.add}
            isRtl={ctx.isRtl}
          />
        ) : null}
      </div>
    </section>
  );
}

export function ShadcnQuickViewBlock({ block, ctx }: BlockRenderProps<ShadcnQuickViewProps>) {
  const props = block.props;
  const product = pickOneProduct(props, ctx.products, ctx.storefrontBaseHref);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  if (!product) return <EmptyPremium label={t.empty} />;
  return (
    <section style={quickViewStyle}>
      <div>
        <Pill>{t.quick}</Pill>
        <h3 style={subheadStyle}>{props.title || t.quick}</h3>
        <p style={bodyStyle}>{props.subtitle || product.description}</p>
      </div>
      <PremiumProductCard product={product} isRtl={ctx.isRtl} variant="product-card24" />
      <PremiumSectionCta href={product.href} label={t.view} isRtl={ctx.isRtl} />
    </section>
  );
}

export function ShadcnReviewsBlock({ block, ctx }: BlockRenderProps<ShadcnReviewsProps>) {
  const props = block.props;
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  const installed = (ctx.installedAppIds ?? []).includes('reviews');
  if (!installed && !ctx.isPreview) return null;
  return (
    <section style={panelStyle}>
      {!installed ? (
        <>
          <SectionHeading kicker={props.kicker || t.trusted} title={props.title || t.reviews} subtitle={props.subtitle} isRtl={ctx.isRtl} />
          <EmptyPremium
            label={
              ctx.isRtl
                ? '\u062b\u0628\u062a \u062a\u0637\u0628\u064a\u0642 Reviews \u0644\u0625\u0636\u0627\u0641\u0629 \u062a\u0642\u064a\u064a\u0645\u0627\u062a \u062d\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645.'
                : 'Install the Reviews app to add live customer reviews to this section.'
            }
          />
        </>
      ) : (
        <StorefrontReviewsWidget
          storefrontSlug={ctx.storefront.slug}
          isRtl={ctx.isRtl}
          variant={props.variant}
          kicker={props.kicker || t.trusted}
          title={props.title || t.reviews}
          subtitle={props.subtitle}
          previewFallbackReviews={ctx.isPreview ? props.reviews : undefined}
        />
      )}
    </section>
  );
}
export function ShadcnOrderSummaryBlock({ block, ctx }: BlockRenderProps<ShadcnOrderSummaryProps>) {
  const props = block.props;
  const products = usePremiumProducts(props, ctx.products, ctx.storefrontBaseHref, 3);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  const subtotal = products.reduce((sum, product) => sum + (product.priceQar ?? 0), 0);
  const shipping = ctx.storefront.checkout.shippingFlatQar ?? 0;
  const checkoutHref = props.cta?.href
    ? storefrontHref(props.cta.href, ctx.storefrontBaseHref)
    : storefrontCheckoutHref(ctx.storefrontBaseHref);
  return (
    <section style={summaryStyle(props.variant)}>
      <SectionHeading kicker={props.kicker || t.checkout} title={props.title || t.order} subtitle={props.subtitle || props.note} isRtl={ctx.isRtl} />
      <div style={summaryCardStyle}>
        {products.map((product) => (
          <div key={product.id} style={summaryRowStyle}>
            <span>{product.title}</span>
            <strong>{product.price}</strong>
          </div>
        ))}
        <div style={summaryRowStyle}>
          <span>{ctx.isRtl ? 'التوصيل' : 'Delivery'}</span>
          <strong>{ctx.storefront.checkout.currency} {shipping}</strong>
        </div>
        <div style={{ ...summaryRowStyle, borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 14%, transparent)', paddingTop: 14 }}>
          <span>{ctx.isRtl ? 'المجموع' : 'Total'}</span>
          <strong>{ctx.storefront.checkout.currency} {subtotal + shipping}</strong>
        </div>
        <Link href={checkoutHref} style={summaryCtaStyle}>
          {props.cta?.label || (ctx.isRtl ? '\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u062f\u0641\u0639' : 'Continue checkout')}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export function ShadcnOfferModalBlock({ block, ctx }: BlockRenderProps<ShadcnOfferModalProps>) {
  const props = block.props;
  const products = usePremiumProducts(props, ctx.products, ctx.storefrontBaseHref, 2);
  const t = FAMILY_LABELS[ctx.isRtl ? 'ar' : 'en'];
  const primaryHref = storefrontHref(props.cta?.href ?? products[0]?.href, ctx.storefrontBaseHref);
  return (
    <aside style={offerStyle(props.variant)}>
      <Gift size={24} />
      <div>
        <Pill>{props.discountLabel || t.offer}</Pill>
        <h3 style={subheadStyle}>{props.title || t.offer}</h3>
        <p style={bodyStyle}>{props.subtitle || props.note || ctx.storefront.tagline}</p>
      </div>
      <Link href={primaryHref} style={offerCtaStyle}>
        {props.cta?.label || t.allProducts}
        <ArrowUpRight size={15} />
      </Link>
      <div style={miniProductRailStyle}>
        {products.map((product) => (
          <article key={product.id} style={miniProductStyle}>
            <Link href={product.href} style={miniImageLinkStyle}>
              <ProductMedia product={product} alt="" style={miniImageStyle} />
            </Link>
            <Link href={product.href} style={miniTitleLinkStyle}>
              {product.title}
            </Link>
            {canAddProductToCart(product) ? (
              <AddToCartButton
                productId={product.id}
                title={product.title}
                priceQar={product.priceQar}
                imageUrl={cartImageUrl(product)}
                sizeOptions={product.sizeOptions}
                sizeOptionPrices={product.sizeOptionPrices}
                allowCustomSize={product.allowCustomSize}
                variantOptions={product.variantOptions}
                variantOptionPrices={product.variantOptionPrices}
                requiresHeightInput={product.requiresHeightInput}
                heightInputLabel={product.heightInputLabel}
                heightOptions={product.heightOptions}
                variant="inline"
                label={t.add}
                isRtl={ctx.isRtl}
              />
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

export function ShadcnFooterBlock({ block, ctx }: BlockRenderProps<ShadcnFooterProps>) {
  const props = block.props;
  return (
    <PremiumFooter
      storefront={ctx.storefront}
      storefrontBaseHref={ctx.storefrontBaseHref}
      title={props.title}
      subtitle={props.subtitle}
      variant={props.variant}
      pages={ctx.navPages}
      legalPolicies={ctx.legalPolicies}
      showNewsletter={props.showNewsletter}
    />
  );
}

/** Clean, self-contained nav copy — avoids the shared FAMILY_LABELS. */
function premiumNavCopy(isRtl: boolean) {
  return isRtl
    ? {
        allProducts: 'كل المنتجات',
        browse: 'تصفّح',
        cart: 'السلة',
        shop: 'تسوّق',
        search: 'ابحث في المتجر',
      }
    : {
        allProducts: 'All Products',
        browse: 'Browse',
        cart: 'Cart',
        shop: 'Shop',
        search: 'Search the store',
      };
}

type NavLink = { label: string; href: string };
type NavLayout = 'standard' | 'center' | 'search' | 'command' | 'hybrid' | 'split' | 'mega' | 'luxury';

function navLayout(variant?: string): NavLayout {
  switch (variant) {
    case 'navbar-center-logo':
    case 'navbar-editorial':
      return 'center';
    case 'navbar-search-first':
      return 'search';
    case 'navbar-command':
    case 'navbar-max-command':
      return 'command';
    case 'navbar-sidebar-hybrid':
      return 'hybrid';
    case 'navbar-split':
      return 'split';
    case 'navbar-mega-menu':
      return 'mega';
    case 'navbar-luxury':
      return 'luxury';
    default:
      return 'standard';
  }
}

const navDividerStyle: CSSProperties = {
  width: 1,
  height: 22,
  background: 'color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 20%, transparent)',
  margin: '0 4px',
  flexShrink: 0,
};

const navSearchFieldStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  maxWidth: 460,
  margin: '0 auto',
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 18%, transparent)',
  background: 'color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 4%, transparent)',
  color: 'var(--sf-nav-ink, var(--sf-ink))',
};

const navSearchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: 13,
  fontFamily: 'inherit',
};

const navCommandPillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  maxWidth: 420,
  margin: '0 auto',
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 18%, transparent)',
  background: 'color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 5%, transparent)',
  color: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  fontSize: 13,
};

const navKbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  padding: '3px 6px',
  borderRadius: 6,
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 22%, transparent)',
  opacity: 0.75,
};

const megaPanelStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  insetInlineStart: 0,
  marginTop: 12,
  minWidth: 240,
  padding: 10,
  borderRadius: 16,
  background: 'var(--sf-ground)',
  border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
  boxShadow: '0 24px 60px -34px color-mix(in srgb, var(--sf-ink) 74%, transparent)',
  display: 'grid',
  gap: 2,
  zIndex: 60,
};

const megaItemStyle: CSSProperties = {
  padding: '9px 11px',
  borderRadius: 9,
  color: 'var(--sf-ink)',
  textDecoration: 'none',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const navRailChipStyle: CSSProperties = {
  flexShrink: 0,
  padding: '7px 12px',
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 16%, transparent)',
  color: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  fontSize: 12,
  background: 'color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 4%, transparent)',
};

/**
 * Premium storefront navbar. The 16 premium `StorefrontNavbarVariant`
 * values map to eight structural layouts (see {@link navLayout}):
 * brand+links (standard/split), centered-logo (center-logo/editorial),
 * a real search field (search-first), a ⌘K command pill (command/
 * max-command), a hover mega-menu (mega-menu), a slim sidebar-hybrid bar,
 * an uppercase-serif luxury bar, and an optional second category rail.
 * Style (floating capsule, dark inversion, announcement tint) still comes
 * from {@link premiumNavStyle}.
 */
export function PremiumStorefrontNav({
  storefront,
  storefrontBaseHref,
  pages,
  legalPolicies,
  variant = 'ecommerce-navbar2',
  cartVariant = 'cart-inline-bag',
  sticky,
  embedded = false,
  announcement,
  ctaLabel,
  ctaHref,
  showSearch = true,
  showPolicyLinks = true,
  cartLabel,
}: {
  storefront: Storefront;
  storefrontBaseHref: string;
  pages: ChromeNavPage[];
  legalPolicies: ChromeLegalPolicy[];
  variant?: string;
  cartVariant?: StorefrontCartVariant;
  sticky?: boolean;
  embedded?: boolean;
  announcement?: string;
  ctaLabel?: string;
  ctaHref?: string;
  showSearch?: boolean;
  showPolicyLinks?: boolean;
  cartLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const isRtl = storefront.locale === 'ar';
  const chromeText = premiumChromeCopy(isRtl);
  const nav = premiumNavCopy(isRtl);
  const layout = navLayout(variant);
  const luxury = layout === 'luxury';

  const productsHref = storefront.productIndex.enabled
    ? `${storefrontBaseHref}/products`
    : storefrontBaseHref;

  const links: NavLink[] = [
    { label: chromeText.home, href: storefrontBaseHref },
    ...(storefront.productIndex.enabled
      ? [{ label: storefront.productIndex.title || nav.allProducts, href: productsHref }]
      : []),
    ...pages.map((page) => ({ label: page.title, href: `${storefrontBaseHref}/${page.slug}` })),
  ];
  const legalLinks: NavLink[] = showPolicyLinks
    ? legalPolicies.slice(0, 2).map((policy) => ({
        label: policy.title,
        href: `${storefrontBaseHref}/${policy.key}`,
      }))
    : [];
  const allDesktopLinks = [...links, ...legalLinks];
  const megaItems: NavLink[] = [
    ...(storefront.productIndex.enabled
      ? [{ label: storefront.productIndex.title || nav.allProducts, href: productsHref }]
      : []),
    ...pages.map((page) => ({ label: page.title, href: `${storefrontBaseHref}/${page.slug}` })),
    ...legalLinks,
  ];
  const resolvedCtaHref = resolvePremiumChromeHref(ctaHref, storefrontBaseHref);

  const navStyle: CSSProperties = {
    ...premiumNavStyle(sticky, embedded, variant),
    ...(layout === 'center'
      ? { gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }
      : {}),
  };

  const brand = (
    <PremiumNavBrand
      storefront={storefront}
      href={storefrontBaseHref}
      centered={layout === 'center'}
      serif={luxury || variant === 'navbar-editorial'}
    />
  );

  const actions = (
    <PremiumNavActions
      productsHref={productsHref}
      showBrowse={showSearch && layout !== 'search' && layout !== 'command'}
      browseLabel={nav.browse}
      ctaLabel={ctaLabel}
      ctaHref={resolvedCtaHref}
      cartLabel={cartLabel || nav.cart}
      cartVariant={cartVariant}
      split={layout === 'split'}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      menuOpenLabel={chromeText.openMenu}
      menuCloseLabel={chromeText.closeMenu}
    />
  );

  let mid: ReactNode;
  switch (layout) {
    case 'search':
      mid = <PremiumNavSearch productsHref={productsHref} placeholder={nav.search} />;
      break;
    case 'command':
      mid = <PremiumNavCommand productsHref={productsHref} placeholder={nav.search} />;
      break;
    case 'hybrid':
      mid = <PremiumNavLinks links={allDesktopLinks} start />;
      break;
    case 'mega':
      mid = (
        <PremiumNavMega
          home={{ label: chromeText.home, href: storefrontBaseHref }}
          shopLabel={nav.shop}
          items={megaItems}
        />
      );
      break;
    default:
      mid = <PremiumNavLinks links={allDesktopLinks} uppercase={luxury} />;
  }

  return (
    <>
      <style>{`
        @media (max-width: 760px) {
          .souqna-premium-nav {
            grid-template-columns: 1fr auto !important;
            border-radius: ${embedded ? '22px' : '0'} !important;
          }
          .souqna-premium-nav__links,
          .souqna-premium-nav__browse,
          .souqna-premium-nav__cta,
          .souqna-premium-nav__search,
          .souqna-premium-nav__rail {
            display: none !important;
          }
          .souqna-premium-nav__menu {
            display: inline-grid !important;
          }
        }
        .souqna-mega__panel {
          opacity: 0;
          visibility: hidden;
          transform: translateY(6px);
          transition: opacity 160ms ease, transform 160ms ease, visibility 160ms;
          pointer-events: none;
        }
        .souqna-mega:hover .souqna-mega__panel,
        .souqna-mega:focus-within .souqna-mega__panel {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
          pointer-events: auto;
        }
        .souqna-mega__item:hover {
          background: color-mix(in srgb, var(--sf-ink) 6%, transparent);
        }
      `}</style>
      {announcement ? <PremiumNavAnnouncement text={announcement} embedded={embedded} /> : null}
      <nav className="souqna-premium-nav" style={navStyle} aria-label={chromeText.storefrontPages}>
        {layout === 'center' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
              <PremiumNavLinks links={links} uppercase={luxury} start />
            </div>
            {brand}
            {actions}
          </>
        ) : (
          <>
            {brand}
            {mid}
            {actions}
          </>
        )}
        {variant === 'navbar-category-rail' ? (
          <PremiumNavCategoryRail links={[...links.slice(1), ...legalLinks]} />
        ) : null}
        {open ? (
          <PremiumNavMobileMenu
            links={links}
            legalLinks={legalLinks}
            ctaLabel={ctaLabel}
            ctaHref={resolvedCtaHref}
            isRtl={isRtl}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </nav>
    </>
  );
}

function PremiumNavBrand({
  storefront,
  href,
  centered,
  serif,
}: {
  storefront: Storefront;
  href: string;
  centered?: boolean;
  serif?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        ...brandStyle,
        justifyContent: centered ? 'center' : undefined,
        fontFamily: serif ? 'var(--font-serif, serif)' : undefined,
        fontWeight: serif ? 500 : brandStyle.fontWeight,
      }}
    >
      {storefront.logoUrl ? (
        <img src={storefront.logoUrl} alt={storefront.businessName} style={navLogoStyle} />
      ) : (
        <span style={monogramStyle}>{storefront.businessName.slice(0, 1)}</span>
      )}
      <span
        style={{
          ...brandNameStyle,
          fontSize: serif ? 18 : undefined,
          letterSpacing: serif ? '0.01em' : undefined,
        }}
      >
        {storefront.businessName}
      </span>
    </Link>
  );
}

function PremiumNavLinks({
  links,
  uppercase,
  start,
  className = 'souqna-premium-nav__links',
}: {
  links: NavLink[];
  uppercase?: boolean;
  start?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...desktopNavLinksStyle, justifyContent: start ? 'flex-start' : 'center' }}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            ...navLinkStyle,
            textTransform: uppercase ? 'uppercase' : undefined,
            letterSpacing: uppercase ? '0.08em' : undefined,
            fontSize: uppercase ? 12 : navLinkStyle.fontSize,
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function PremiumNavActions({
  productsHref,
  showBrowse,
  browseLabel,
  ctaLabel,
  ctaHref,
  cartLabel,
  cartVariant,
  split,
  open,
  onToggle,
  menuOpenLabel,
  menuCloseLabel,
}: {
  productsHref: string;
  showBrowse: boolean;
  browseLabel: string;
  ctaLabel?: string;
  ctaHref: string | null;
  cartLabel: string;
  cartVariant: StorefrontCartVariant;
  split: boolean;
  open: boolean;
  onToggle: () => void;
  menuOpenLabel: string;
  menuCloseLabel: string;
}) {
  return (
    <div style={navActionsStyle}>
      {showBrowse ? (
        <Link className="souqna-premium-nav__browse" href={productsHref} style={navSearchStyle}>
          <Search size={15} />
          <span>{browseLabel}</span>
        </Link>
      ) : null}
      {split && ctaLabel && ctaHref ? (
        <span className="souqna-premium-nav__cta" style={navDividerStyle} aria-hidden />
      ) : null}
      {ctaLabel && ctaHref ? (
        <Link className="souqna-premium-nav__cta" href={ctaHref} style={navCtaStyle}>
          {ctaLabel}
          <ArrowUpRight size={14} />
        </Link>
      ) : null}
      <CartIconButton label={cartLabel} variant={cartVariant} />
      <button
        className="souqna-premium-nav__menu"
        type="button"
        onClick={onToggle}
        style={mobileMenuButtonStyle}
        aria-label={open ? menuCloseLabel : menuOpenLabel}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </div>
  );
}

function PremiumNavSearch({
  productsHref,
  placeholder,
}: {
  productsHref: string;
  placeholder: string;
}) {
  return (
    <form
      action={productsHref}
      method="get"
      role="search"
      className="souqna-premium-nav__search"
      style={navSearchFieldStyle}
    >
      <Search size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
      <input name="q" placeholder={placeholder} aria-label={placeholder} style={navSearchInputStyle} />
    </form>
  );
}

function PremiumNavCommand({
  productsHref,
  placeholder,
}: {
  productsHref: string;
  placeholder: string;
}) {
  return (
    <Link href={productsHref} className="souqna-premium-nav__search" style={navCommandPillStyle}>
      <Search size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'start', opacity: 0.7 }}>{placeholder}</span>
      <kbd style={navKbdStyle}>⌘K</kbd>
    </Link>
  );
}

function PremiumNavMega({
  home,
  shopLabel,
  items,
}: {
  home: NavLink;
  shopLabel: string;
  items: NavLink[];
}) {
  return (
    <div className="souqna-premium-nav__links" style={{ ...desktopNavLinksStyle, overflow: 'visible' }}>
      <Link href={home.href} style={navLinkStyle}>
        {home.label}
      </Link>
      <div className="souqna-mega" style={{ position: 'relative' }}>
        <button
          type="button"
          aria-haspopup="true"
          style={{
            ...navLinkStyle,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {shopLabel}
          <ChevronRight size={13} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <div
          className="souqna-mega__panel"
          role="menu"
          style={{
            ...megaPanelStyle,
            gridTemplateColumns: items.length > 6 ? '1fr 1fr' : '1fr',
          }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="souqna-mega__item"
              style={megaItemStyle}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumNavCategoryRail({ links }: { links: NavLink[] }) {
  if (links.length === 0) return null;
  return (
    <div
      className="souqna-premium-nav__rail"
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 12%, transparent)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}
    >
      {links.map((link) => (
        <Link key={link.href} href={link.href} style={navRailChipStyle}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function PremiumNavMobileMenu({
  links,
  legalLinks,
  ctaLabel,
  ctaHref,
  isRtl,
  onClose,
}: {
  links: NavLink[];
  legalLinks: NavLink[];
  ctaLabel?: string;
  ctaHref: string | null;
  isRtl: boolean;
  onClose: () => void;
}) {
  return (
    <div style={mobileMenuStyle}>
      {[...links, ...legalLinks].map((link) => (
        <Link key={link.href} href={link.href} style={mobileLinkStyle} onClick={onClose}>
          {link.label}
          <ChevronRight size={15} style={isRtl ? rtlChevronStyle : undefined} />
        </Link>
      ))}
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} style={mobileLinkStyle} onClick={onClose}>
          {ctaLabel}
          <ChevronRight size={15} style={isRtl ? rtlChevronStyle : undefined} />
        </Link>
      ) : null}
    </div>
  );
}

function PremiumFooter({
  storefront,
  storefrontBaseHref,
  title,
  subtitle,
  variant,
  pages,
  legalPolicies,
  showNewsletter,
}: {
  storefront: Storefront;
  storefrontBaseHref: string;
  title?: string;
  subtitle?: string;
  variant: string;
  pages: ChromeNavPage[];
  legalPolicies: ChromeLegalPolicy[];
  showNewsletter?: boolean;
}) {
  const isRtl = storefront.locale === 'ar';
  const chromeText = premiumChromeCopy(isRtl);
  const t = FAMILY_LABELS[isRtl ? 'ar' : 'en'];
  const whatsAppPhone = normalizeWaMePhone(storefront.phone);
  return (
    <footer style={premiumFooterStyle(variant)}>
      <div>
        <Pill>{chromeText.footerLinks}</Pill>
        <h2 style={subheadStyle}>{title || storefront.businessName}</h2>
        <p style={bodyStyle}>{subtitle || storefront.tagline || chromeText.fallback}</p>
      </div>
      <div style={footerLinksStyle}>
        <Link href={storefrontBaseHref}>{chromeText.home}</Link>
        {storefront.productIndex.enabled ? <Link href={`${storefrontBaseHref}/products`}>{storefront.productIndex.title || t.allProducts}</Link> : null}
        {pages.slice(0, 4).map((page) => (
          <Link key={page.slug} href={`${storefrontBaseHref}/${page.slug}`}>
            {page.title}
          </Link>
        ))}
        {legalPolicies.slice(0, 3).map((policy) => (
          <Link key={policy.key} href={`${storefrontBaseHref}/${policy.key}`}>
            {policy.title}
          </Link>
        ))}
        {whatsAppPhone ? (
          <a href={`https://wa.me/${whatsAppPhone}`} target="_blank" rel="noreferrer">
            {chromeText.whatsapp}
          </a>
        ) : null}
        {showNewsletter ? (
          <a
            href={whatsAppPhone ? `https://wa.me/${whatsAppPhone}` : storefrontBaseHref}
            target={whatsAppPhone ? '_blank' : undefined}
            rel={whatsAppPhone ? 'noreferrer' : undefined}
          >
            {isRtl
              ? '\u0627\u0633\u062a\u0644\u0645 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631'
              : 'Get store updates'}
          </a>
        ) : null}
      </div>
    </footer>
  );
}

function PremiumNavAnnouncement({ text, embedded }: { text: string; embedded: boolean }) {
  return (
    <div
      style={{
        margin: embedded ? '0 0 10px' : 0,
        padding: '8px 14px',
        textAlign: 'center',
        borderRadius: embedded ? 999 : 0,
        border: embedded ? '1px solid color-mix(in srgb, var(--sf-accent) 20%, transparent)' : undefined,
        background: 'color-mix(in srgb, var(--sf-accent) 14%, var(--sf-ground))',
        color: 'var(--sf-ink)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: '0.08em',
      }}
    >
      {text}
    </div>
  );
}

function resolvePremiumChromeHref(value: string | undefined, storefrontBaseHref: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return storefrontHref(trimmed, storefrontBaseHref);
}

function usePremiumProducts(
  props: EcommerceBlockProps,
  products: Product[],
  baseHref: string,
  limit: number,
) {
  return useMemo(
    () => selectPremiumProducts(props, products, baseHref, limit),
    [props, products, baseHref, limit],
  );
}

function selectPremiumProducts(
  props: EcommerceBlockProps,
  products: Product[],
  baseHref: string,
  limit: number,
): PremiumProduct[] {
  const selected = resolveCommerceProductSource(products, props.productSource, props.productIds ?? [])
    .slice(0, limit);
  return (selected.length > 0 ? selected : products.slice(0, limit)).map((product) =>
    toPremiumProduct(product, baseHref),
  );
}

function pickOneProduct(
  props: { productId?: string } & EcommerceBlockProps,
  products: Product[],
  baseHref: string,
): PremiumProduct | null {
  const picked = props.productId ? products.find((product) => product.id === props.productId) : null;
  if (picked) return toPremiumProduct(picked, baseHref);
  return selectPremiumProducts(props, products, baseHref, 1)[0] ?? null;
}

function toPremiumProduct(product: Product, baseHref: string): PremiumProduct {
  const priceQar = product.pricingMode === 'monthly_payment' ? product.monthlyPriceQar : product.priceQar;
  const media = resolveProductMedia(product);
  return {
    id: product.id,
    title: product.title,
    description: product.description || '',
    price: priceQar != null ? `QAR ${priceQar.toLocaleString('en-US')}` : 'QAR',
    priceQar,
    imageUrl: media.type === 'image' ? media.url : null,
    mediaUrl: media.url,
    mediaType: media.type,
    category: product.category || 'Product',
    href: `${baseHref}/p/${productPathSegment(product)}`,
    status: product.status,
    stock: product.stock,
    sizeOptions: product.sizeOptions,
    sizeOptionPrices: product.sizeOptionPrices,
    allowCustomSize: product.allowCustomSize,
    variantOptions: product.variantOptions,
    variantOptionPrices: product.variantOptionPrices,
    requiresHeightInput: product.requiresHeightInput,
    heightInputLabel: product.heightInputLabel,
    heightOptions: product.heightOptions,
  };
}

function resolveProductMedia(product: Product): { url: string | null; type: PremiumProduct['mediaType'] } {
  const extended = product as Product & {
    videoUrl?: unknown;
    mediaUrl?: unknown;
    mediaType?: unknown;
  };
  const videoUrl = normalizeMediaUrl(extended.videoUrl);
  if (videoUrl) {
    return { url: videoUrl, type: 'video' };
  }

  const mediaUrl = normalizeMediaUrl(extended.mediaUrl);
  const mediaType = typeof extended.mediaType === 'string' ? extended.mediaType.toLowerCase() : '';
  if (mediaUrl) {
    return {
      url: mediaUrl,
      type: mediaType.includes('video') || looksLikeVideoUrl(mediaUrl) ? 'video' : 'image',
    };
  }

  const imageUrl = normalizeMediaUrl(product.imageUrl);
  if (!imageUrl) return { url: null, type: null };
  return { url: imageUrl, type: isVideoMediaUrl(imageUrl) ? 'video' : 'image' };
}

function normalizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function looksLikeVideoUrl(url: string): boolean {
  return mediaKindFromUrl(url) === 'video';
}

function canAddProductToCart(product: PremiumProduct): product is PremiumProduct & { priceQar: number } {
  return product.priceQar != null && product.status !== 'draft' && product.status !== 'sold_out';
}

function cartImageUrl(product: PremiumProduct): string | null {
  return product.imageUrl || (product.mediaType === 'image' ? product.mediaUrl : null);
}

function categoriesFromProducts(products: Product[], baseHref: string): PremiumCategory[] {
  const map = new Map<string, PremiumCategory>();
  for (const product of products) {
    const label = product.category?.trim() || 'Products';
    const key = label.toLowerCase();
    const media = resolveProductMedia(product);
    const categoryImageUrl = media.type === 'image' ? media.url : null;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.imageUrl && categoryImageUrl) existing.imageUrl = categoryImageUrl;
      continue;
    }
    map.set(key, {
      id: key.replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-'),
      label,
      imageUrl: categoryImageUrl,
      href: `${baseHref}/products?category=${encodeURIComponent(label)}`,
      count: 1,
    });
  }
  return Array.from(map.values()).slice(0, 8);
}

function ProductMedia({
  product,
  alt,
  style,
  controls = false,
}: {
  product: PremiumProduct;
  alt: string;
  style: CSSProperties;
  controls?: boolean;
}) {
  if (product.mediaType === 'video' && product.mediaUrl) {
    return (
      <video
        src={product.mediaUrl}
        style={style}
        controls={controls}
        autoPlay={!controls}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt || product.title}
      />
    );
  }

  if (product.mediaUrl) {
    return <img src={product.mediaUrl} alt={alt} style={style} />;
  }

  return (
    <span style={{ ...style, display: 'grid', placeItems: 'center', color: 'currentColor' }}>
      <ShoppingBag size={38} />
    </span>
  );
}

function ProductVisual({
  product,
  isRtl,
  featured,
  variant,
}: {
  product: PremiumProduct;
  isRtl: boolean;
  featured?: boolean;
  variant: 'stack' | 'wide';
}) {
  const t = FAMILY_LABELS[isRtl ? 'ar' : 'en'];
  return (
    <article style={productVisualStyle(featured, variant)}>
      <Link href={product.href} style={visualMediaLinkStyle}>
        <ProductMedia product={product} alt={product.title} style={visualImageStyle} />
      </Link>
      <span style={visualCaptionStyle}>
        <strong>{product.title}</strong>
        <span style={visualCaptionFooterStyle}>
          <small>{product.price}</small>
          <span style={visualCaptionActionsStyle}>
            <Link href={product.href} style={visualViewLinkStyle}>
              {t.view}
            </Link>
            {canAddProductToCart(product) ? (
              <AddToCartButton
                productId={product.id}
                title={product.title}
                priceQar={product.priceQar}
                imageUrl={cartImageUrl(product)}
                sizeOptions={product.sizeOptions}
                sizeOptionPrices={product.sizeOptionPrices}
                allowCustomSize={product.allowCustomSize}
                variantOptions={product.variantOptions}
                variantOptionPrices={product.variantOptionPrices}
                requiresHeightInput={product.requiresHeightInput}
                heightInputLabel={product.heightInputLabel}
                heightOptions={product.heightOptions}
                variant="icon"
                label={t.add}
                isRtl={isRtl}
              />
            ) : null}
          </span>
        </span>
      </span>
      {isRtl ? null : <ArrowUpRight size={16} />}
    </article>
  );
}

function PremiumProductCard({
  product,
  isRtl,
  variant,
}: {
  product: PremiumProduct;
  isRtl: boolean;
  variant: string;
}) {
  const t = FAMILY_LABELS[isRtl ? 'ar' : 'en'];
  return (
    <article style={cardStyle(variant)}>
      <Link href={product.href} style={imageLinkStyle}>
        <ProductMedia product={product} alt={product.title} style={cardImageStyle} />
        <span style={floatingBadgeStyle}>{product.status === 'sold_out' ? t.soldOut : t.available}</span>
      </Link>
      <div style={cardBodyStyle}>
        <small style={monoMutedStyle}>{product.category}</small>
        <h3 style={cardTitleStyle}>{product.title}</h3>
        {product.description ? <p style={cardDescriptionStyle}>{product.description}</p> : null}
        <div style={cardFooterStyle}>
          <strong style={priceStyle}>{product.price}</strong>
          {canAddProductToCart(product) ? (
            <AddToCartButton
              productId={product.id}
              title={product.title}
              priceQar={product.priceQar}
              imageUrl={cartImageUrl(product)}
              sizeOptions={product.sizeOptions}
              sizeOptionPrices={product.sizeOptionPrices}
              allowCustomSize={product.allowCustomSize}
              variantOptions={product.variantOptions}
              variantOptionPrices={product.variantOptionPrices}
              requiresHeightInput={product.requiresHeightInput}
              heightInputLabel={product.heightInputLabel}
              heightOptions={product.heightOptions}
              variant="icon"
              label={t.add}
              isRtl={isRtl}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProductRow({ product, isRtl, index }: { product: PremiumProduct; isRtl: boolean; index: number }) {
  const t = FAMILY_LABELS[isRtl ? 'ar' : 'en'];
  return (
    <div style={productRowStyle}>
      <span style={rowIndexStyle}>{String(index + 1).padStart(2, '0')}</span>
      <ProductMedia product={product} alt="" style={rowImageStyle} />
      <div style={{ minWidth: 0 }}>
        <Link href={product.href} style={rowTitleStyle}>{product.title}</Link>
        <p style={rowDescriptionStyle}>{product.description || product.category}</p>
      </div>
      <strong style={priceStyle}>{product.price}</strong>
      {canAddProductToCart(product) ? (
        <AddToCartButton
          productId={product.id}
          title={product.title}
          priceQar={product.priceQar}
          imageUrl={cartImageUrl(product)}
          sizeOptions={product.sizeOptions}
          sizeOptionPrices={product.sizeOptionPrices}
          allowCustomSize={product.allowCustomSize}
          variantOptions={product.variantOptions}
          variantOptionPrices={product.variantOptionPrices}
          requiresHeightInput={product.requiresHeightInput}
          heightInputLabel={product.heightInputLabel}
          heightOptions={product.heightOptions}
          variant="inline"
          label={t.add}
          isRtl={isRtl}
        />
      ) : null}
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
  isRtl,
}: {
  kicker?: string;
  title?: string;
  subtitle?: string;
  isRtl: boolean;
}) {
  return (
    <header style={sectionHeaderStyle}>
      {kicker ? <Pill>{kicker}</Pill> : null}
      <h2 style={sectionTitleStyle(isRtl)}>{title}</h2>
      {subtitle ? <p style={bodyStyle}>{subtitle}</p> : null}
    </header>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span style={pillStyle}>{children}</span>;
}

function EmptyPremium({ label }: { label: string }) {
  return <div style={emptyStyle}>{label}</div>;
}

function PremiumSectionCta({
  href,
  label,
  isRtl,
}: {
  href: string;
  label: string;
  isRtl: boolean;
}) {
  return (
    <Link href={href} style={sectionCtaStyle}>
      {label}
      <ArrowUpRight size={15} style={isRtl ? rtlChevronStyle : undefined} />
    </Link>
  );
}

function iconFor(icon?: string) {
  const props = { size: 20, strokeWidth: 1.7 };
  if (icon === 'truck') return <Truck {...props} />;
  if (icon === 'boxes') return <Boxes {...props} />;
  if (icon === 'card') return <CreditCard {...props} />;
  if (icon === 'heart') return <Heart {...props} />;
  if (icon === 'filter') return <Filter {...props} />;
  return <ShieldCheck {...props} />;
}

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: 'clamp(18px, 3vw, 28px)',
};

function heroStyle(variant: string, tone?: string): CSSProperties {
  const dark = tone === 'charcoal' || variant === 'ecommerce-hero6';
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: 'clamp(20px, 4vw, 48px)',
    alignItems: 'center',
    minHeight: 'min(760px, 82vh)',
    padding: 'clamp(24px, 5vw, 72px)',
    borderRadius: 32,
    overflow: 'hidden',
    background: dark
      ? 'linear-gradient(135deg, color-mix(in srgb, var(--sf-ink) 96%, #000), color-mix(in srgb, var(--sf-accent) 26%, var(--sf-ink)))'
      : 'linear-gradient(135deg, color-mix(in srgb, var(--sf-ground) 92%, white), color-mix(in srgb, var(--sf-accent) 20%, var(--sf-ground)))',
    color: dark ? 'var(--sf-ground)' : 'var(--sf-ink)',
    boxShadow: '0 34px 90px -66px color-mix(in srgb, var(--sf-ink) 80%, transparent)',
  };
}

const heroCopyStyle: CSSProperties = {
  display: 'grid',
  gap: 18,
  maxWidth: 620,
};

function headlineStyle(isRtl: boolean): CSSProperties {
  return {
    margin: 0,
    fontFamily: isRtl ? 'var(--font-arabic-serif), var(--font-serif), serif' : 'var(--font-serif), serif',
    fontSize: 'clamp(42px, 8vw, 104px)',
    lineHeight: 0.92,
    letterSpacing: 0,
    overflowWrap: 'anywhere',
  };
}

const bodyStyle: CSSProperties = {
  margin: 0,
  color: 'color-mix(in srgb, currentColor 68%, transparent)',
  fontSize: 'clamp(14px, 1.5vw, 18px)',
  lineHeight: 1.7,
};

const actionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
};

const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 999,
  background: 'var(--sf-ink)',
  color: 'var(--sf-ground)',
  textDecoration: 'none',
  fontWeight: 700,
};

const ghostLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: 999,
  color: 'inherit',
  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  textDecoration: 'none',
};

const sectionCtaStyle: CSSProperties = {
  justifySelf: 'start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 15px',
  borderRadius: 999,
  color: 'var(--sf-ink)',
  background: 'color-mix(in srgb, var(--sf-accent) 13%, var(--sf-ground))',
  border: '1px solid color-mix(in srgb, var(--sf-accent) 34%, transparent)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 800,
  boxShadow: '0 18px 44px -36px color-mix(in srgb, var(--sf-ink) 70%, transparent)',
};

function heroVisualGridStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: variant === 'ecommerce-hero1' ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    alignItems: 'stretch',
  };
}

function productVisualStyle(featured?: boolean, variant: 'stack' | 'wide' = 'stack'): CSSProperties {
  return {
    position: 'relative',
    minHeight: featured || variant === 'wide' ? 330 : 210,
    gridColumn: featured && variant === 'wide' ? 'span 2' : undefined,
    display: 'flex',
    alignItems: 'end',
    padding: 14,
    overflow: 'hidden',
    borderRadius: 24,
    textDecoration: 'none',
    color: 'inherit',
    background: 'color-mix(in srgb, var(--sf-ground) 78%, transparent)',
    border: '1px solid color-mix(in srgb, currentColor 13%, transparent)',
  };
}

const visualImageStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center',
  padding: 12,
  background: 'color-mix(in srgb, var(--sf-ground) 72%, transparent)',
};

const visualMediaLinkStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  color: 'inherit',
};

const visualCaptionStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gap: 3,
  width: '100%',
  padding: 12,
  borderRadius: 16,
  background: 'color-mix(in srgb, var(--sf-ground) 82%, transparent)',
  color: 'var(--sf-ink)',
};

const visualCaptionFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const visualCaptionActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const visualViewLinkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 800,
};

function stripStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
    padding: variant === 'trust-strip3' ? 16 : 10,
    borderRadius: 24,
    background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}

const metricCardStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  padding: 16,
  borderRadius: 18,
  background: 'color-mix(in srgb, var(--sf-ground) 90%, transparent)',
  border: '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  maxWidth: 760,
};

function sectionTitleStyle(isRtl: boolean): CSSProperties {
  return {
    margin: 0,
    fontFamily: isRtl ? 'var(--font-arabic-serif), var(--font-serif), serif' : 'var(--font-serif), serif',
    fontSize: 'clamp(30px, 5vw, 64px)',
    lineHeight: 1,
    letterSpacing: 0,
  };
}

function categoryGridStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: variant === 'product-categories5' ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 14,
  };
}

const categoryTileStyle: CSSProperties = {
  position: 'relative',
  minHeight: 210,
  borderRadius: 26,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'end',
  padding: 16,
  color: 'white',
  textDecoration: 'none',
  background: 'var(--sf-ink)',
};

const categoryImageStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const categoryOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.72))',
};

const categoryTextStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gap: 2,
};

function productCardGridStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: variant === 'product-card24' ? 'repeat(auto-fit, minmax(260px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  };
}

function cardStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    overflow: 'hidden',
    borderRadius: variant === 'product-card24' ? 28 : 18,
    background: 'color-mix(in srgb, var(--sf-ground) 92%, white)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
    boxShadow: '0 28px 80px -68px color-mix(in srgb, var(--sf-ink) 80%, transparent)',
  };
}

const imageLinkStyle: CSSProperties = {
  position: 'relative',
  minHeight: 260,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--sf-ink)',
  background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
};

const cardImageStyle: CSSProperties = {
  width: '100%',
  height: 280,
  objectFit: 'contain',
  objectPosition: 'center',
  padding: 14,
};

const floatingBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  insetInlineStart: 12,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
  color: 'var(--sf-ink)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const cardBodyStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 16,
};

const monoMutedStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--sf-ink) 48%, transparent)',
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.08,
};

const cardDescriptionStyle: CSSProperties = {
  margin: 0,
  color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)',
  lineHeight: 1.5,
};

const cardFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 4,
};

const priceStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
  fontWeight: 800,
};

function listWrapStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gap: variant === 'product-list7' ? 12 : 8,
  };
}

const productRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 64px minmax(0, 1fr) auto auto',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  borderRadius: 18,
  background: 'color-mix(in srgb, var(--sf-ground) 90%, transparent)',
  border: '1px solid color-mix(in srgb, var(--sf-ink) 9%, transparent)',
};

const rowIndexStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'color-mix(in srgb, var(--sf-accent) 88%, transparent)',
};

const rowImageStyle: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 14,
  objectFit: 'contain',
  objectPosition: 'center',
  padding: 5,
  background: 'color-mix(in srgb, var(--sf-accent) 12%, transparent)',
};

const rowTitleStyle: CSSProperties = {
  color: 'var(--sf-ink)',
  textDecoration: 'none',
  fontWeight: 800,
};

const rowDescriptionStyle: CSSProperties = {
  margin: '4px 0 0',
  color: 'color-mix(in srgb, var(--sf-ink) 58%, transparent)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function detailStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: 'clamp(18px, 4vw, 44px)',
    alignItems: 'center',
    padding: variant === 'product-detail9' ? 'clamp(18px, 4vw, 44px)' : 0,
    borderRadius: 30,
    background: variant === 'product-detail9' ? 'color-mix(in srgb, var(--sf-ink) 4%, transparent)' : undefined,
  };
}

const detailImageShellStyle: CSSProperties = {
  minHeight: 420,
  position: 'relative',
  borderRadius: 30,
  overflow: 'hidden',
  display: 'grid',
  placeItems: 'center',
  background: 'color-mix(in srgb, var(--sf-accent) 12%, transparent)',
};

const detailImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 420,
  objectFit: 'contain',
  objectPosition: 'center',
  padding: 'clamp(14px, 3vw, 30px)',
};

const detailInfoStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  alignContent: 'center',
};

const quickViewStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.8fr) minmax(260px, 1fr)',
  gap: 18,
  alignItems: 'center',
  padding: 18,
  borderRadius: 28,
  border: '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)',
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--sf-ground) 92%, white), color-mix(in srgb, var(--sf-accent) 12%, var(--sf-ground)))',
};

const subheadStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif), serif',
  fontSize: 'clamp(24px, 4vw, 42px)',
  lineHeight: 1,
};

function summaryStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: variant === 'order-summary2' ? 'minmax(0, 1fr) minmax(280px, 420px)' : '1fr',
    gap: 18,
    alignItems: 'start',
  };
}

const summaryCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: 20,
  borderRadius: 24,
  background: 'color-mix(in srgb, var(--sf-ground) 94%, white)',
  border: '1px solid color-mix(in srgb, var(--sf-accent) 24%, transparent)',
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
};

const summaryCtaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 14,
  background: 'var(--sf-ink)',
  color: 'var(--sf-ground)',
  textDecoration: 'none',
  fontWeight: 800,
};

function offerStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: 16,
    alignItems: 'start',
    padding: variant === 'offer-modal5' ? 24 : 18,
    borderRadius: 28,
    color: 'var(--sf-ground)',
    background: 'linear-gradient(135deg, var(--sf-ink), color-mix(in srgb, var(--sf-accent) 38%, var(--sf-ink)))',
  };
}

const offerCtaStyle: CSSProperties = {
  justifySelf: 'start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 14px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
  color: 'var(--sf-ink)',
  textDecoration: 'none',
  fontWeight: 900,
  boxShadow: '0 16px 40px -30px rgba(0,0,0,0.65)',
};

const miniProductRailStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
};

const miniProductStyle: CSSProperties = {
  minWidth: 170,
  display: 'grid',
  gap: 8,
  color: 'inherit',
};

const miniImageLinkStyle: CSSProperties = {
  display: 'block',
  color: 'inherit',
  textDecoration: 'none',
};

const miniImageStyle: CSSProperties = {
  width: '100%',
  height: 90,
  borderRadius: 16,
  objectFit: 'contain',
  objectPosition: 'center',
  padding: 8,
  background: 'color-mix(in srgb, var(--sf-ground) 18%, transparent)',
};

const miniTitleLinkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  fontWeight: 800,
  lineHeight: 1.2,
};

function premiumNavStyle(sticky?: boolean, embedded?: boolean, variant?: string): CSSProperties {
  const floating =
    variant === 'navbar-floating' ||
    variant === 'navbar-capsule' ||
    variant === 'navbar-luxury' ||
    variant === 'navbar-max-command';
  const dark =
    variant === 'navbar-luxury' ||
    variant === 'navbar-max-command' ||
    variant === 'navbar-sidebar-hybrid';
  return {
    position: sticky ? 'sticky' : 'relative',
    top: sticky ? (floating && !embedded ? 12 : 0) : undefined,
    zIndex: sticky ? 50 : undefined,
    display: 'grid',
    gridTemplateColumns:
      variant === 'navbar-center-logo'
        ? 'minmax(0, 1fr) auto minmax(0, 1fr)'
        : 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 16,
    padding:
      variant === 'navbar-compact'
        ? '9px clamp(14px, 3vw, 24px)'
        : embedded
          ? '14px 18px'
          : '14px clamp(16px, 4vw, 34px)',
    margin: floating && !embedded ? '12px clamp(12px, 3vw, 28px) 0' : embedded ? undefined : 0,
    border:
      floating || embedded
        ? '1px solid color-mix(in srgb, var(--sf-accent) 22%, transparent)'
        : undefined,
    borderBottom:
      floating
        ? undefined
        : embedded
          ? '1px solid color-mix(in srgb, var(--sf-accent) 20%, transparent)'
          : '1px solid color-mix(in srgb, var(--sf-ink) 8%, transparent)',
    borderRadius: floating || embedded ? 999 : 0,
    background:
      dark
        ? 'linear-gradient(135deg, var(--sf-ink), color-mix(in srgb, var(--sf-accent) 28%, var(--sf-ink)))'
        : variant === 'navbar-announcement'
          ? 'linear-gradient(90deg, color-mix(in srgb, var(--sf-accent) 18%, var(--sf-ground)), var(--sf-ground))'
          : variant === 'ecommerce-navbar2' || floating
            ? 'color-mix(in srgb, var(--sf-ground) 90%, transparent)'
            : 'var(--sf-ground)',
    ['--sf-nav-ink' as string]: dark ? 'var(--sf-ground)' : 'var(--sf-ink)',
    color: dark ? 'var(--sf-ground)' : undefined,
    boxShadow: floating ? '0 18px 60px -44px color-mix(in srgb, var(--sf-ink) 74%, transparent)' : undefined,
    backdropFilter: 'blur(18px)',
  };
}

const brandStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  color: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  fontWeight: 800,
};

const brandNameStyle: CSSProperties = {
  minWidth: 0,
  maxWidth: 'min(280px, 34vw)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const navLogoStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  objectFit: 'cover',
};

const monogramStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  background: 'color-mix(in srgb, var(--sf-accent) 18%, transparent)',
  color: 'var(--sf-accent)',
};

const desktopNavLinksStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 18,
  minWidth: 0,
  overflowX: 'auto',
  whiteSpace: 'nowrap',
  scrollbarWidth: 'none',
};

const navLinkStyle: CSSProperties = {
  color: 'color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 74%, transparent)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
};

const navActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'end',
  gap: 8,
  flexShrink: 0,
};

const navSearchStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 12px',
  borderRadius: 999,
  color: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 18%, transparent)',
};

const navCtaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 12px',
  borderRadius: 999,
  color: 'var(--sf-ground)',
  background: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const mobileMenuButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: 'none',
  placeItems: 'center',
  borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--sf-nav-ink, var(--sf-ink)) 18%, transparent)',
  background: 'transparent',
  color: 'var(--sf-nav-ink, var(--sf-ink))',
};

const mobileMenuStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gap: 8,
  paddingTop: 12,
};

const mobileLinkStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  color: 'var(--sf-nav-ink, var(--sf-ink))',
  textDecoration: 'none',
  padding: '10px 0',
  borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
};

const rtlChevronStyle: CSSProperties = {
  transform: 'rotate(180deg)',
};

function premiumFooterStyle(variant: string): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
    gap: 20,
    alignItems: 'start',
    padding: variant === 'ecommerce-footer18' ? 28 : 20,
    borderRadius: 28,
    background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}

const footerLinksStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'start',
  gap: 12,
};

const pillStyle: CSSProperties = {
  width: 'fit-content',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--sf-accent) 16%, transparent)',
  color: 'var(--sf-accent)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const emptyStyle: CSSProperties = {
  padding: 26,
  borderRadius: 20,
  border: '1px dashed color-mix(in srgb, var(--sf-ink) 18%, transparent)',
  color: 'color-mix(in srgb, var(--sf-ink) 58%, transparent)',
};
