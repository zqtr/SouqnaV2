'use client';

import { CartDrawer } from '@/components/storefront/cart/CartDrawer';
import { CartProvider } from '@/components/storefront/cart/CartContext';
import {
  ShadcnCategoriesBlock,
  ShadcnFooterBlock,
  ShadcnHeroBlock,
  ShadcnNavbarBlock,
  ShadcnOfferModalBlock,
  ShadcnOrderSummaryBlock,
  ShadcnProductCardBlock,
  ShadcnProductDetailBlock,
  ShadcnProductListBlock,
  ShadcnQuickViewBlock,
  ShadcnReviewsBlock,
  ShadcnTrustStripBlock,
} from '@/components/storefront/blocks/ShadcnCommerceBlocks';
import type { Storefront } from '@/lib/brief';
import type { Product } from '@/lib/products';
import type { BlockContext } from '@/components/storefront/blocks/BlockContext';
import type { CSSProperties } from 'react';

const storefront = {
  businessName: 'Souqna Product Suite',
  tagline: 'Premium commerce blocks wired to real products, media, and cart actions.',
  logoUrl: null,
  phone: '+974 5555 0000',
  area: 'Doha',
  locale: 'en',
  palette: 'sand_gold',
  checkout: {
    currency: 'QAR',
    paymentMethods: ['cod', 'skipcash'],
    shippingFlatQar: 20,
  },
  productIndex: {
    enabled: true,
    title: 'All Products',
  },
} as Storefront;

const products = [
  {
    id: 'showcase-oud-amber',
    storefrontSlug: 'template-showcase',
    title: 'Oud & Amber Launch Set',
    description: 'A complete launch product with premium imagery and cart-ready options.',
    priceQar: 280,
    pricingMode: 'one_time',
    monthlyPriceQar: null,
    imageUrl: '/seed-products/vitrine/1.svg',
    category: 'Launch sets',
    eventAt: null,
    status: 'active',
    stock: 12,
    isCustomizable: false,
    customizationLabel: null,
    sizeOptions: ['Small', 'Medium', 'Large'],
    sizeOptionPrices: [
      { label: 'Small', priceDeltaQar: 0 },
      { label: 'Medium', priceDeltaQar: 20 },
      { label: 'Large', priceDeltaQar: 40 },
    ],
    allowCustomSize: true,
    variantOptions: ['Amber', 'Oud', 'Gift wrap'],
    variantOptionPrices: [
      { label: 'Amber', priceDeltaQar: 0 },
      { label: 'Oud', priceDeltaQar: 35 },
      { label: 'Gift wrap', priceDeltaQar: 15 },
    ],
    requiresHeightInput: false,
    heightInputLabel: null,
    heightOptions: [],
    position: 1,
    source: 'showcase',
    sourceUrl: null,
    isDemo: true,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
  },
  {
    id: 'showcase-video-drop',
    storefrontSlug: 'template-showcase',
    title: 'Video Product Drop',
    description: 'A sample product with changeable video media. Cards preview it muted; detail view exposes controls.',
    priceQar: 420,
    pricingMode: 'one_time',
    monthlyPriceQar: null,
    imageUrl: '/seed-products/atrium/1.svg',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    category: 'Video drops',
    eventAt: null,
    status: 'active',
    stock: 8,
    isCustomizable: false,
    customizationLabel: null,
    sizeOptions: [],
    sizeOptionPrices: [],
    allowCustomSize: false,
    variantOptions: ['Launch reel', 'Product demo'],
    variantOptionPrices: [
      { label: 'Launch reel', priceDeltaQar: 0 },
      { label: 'Product demo', priceDeltaQar: 45 },
    ],
    requiresHeightInput: false,
    heightInputLabel: null,
    heightOptions: [],
    position: 2,
    source: 'showcase',
    sourceUrl: null,
    isDemo: true,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
  },
  {
    id: 'showcase-gift-capsule',
    storefrontSlug: 'template-showcase',
    title: 'Gift Capsule Pack',
    description: 'A compact product for list, category, and offer modules.',
    priceQar: 190,
    pricingMode: 'one_time',
    monthlyPriceQar: null,
    imageUrl: '/seed-products/bazaar/3.svg',
    category: 'Gift capsules',
    eventAt: null,
    status: 'active',
    stock: 18,
    isCustomizable: false,
    customizationLabel: null,
    sizeOptions: [],
    sizeOptionPrices: [],
    allowCustomSize: false,
    variantOptions: ['Classic', 'Signature', 'Premium'],
    variantOptionPrices: [
      { label: 'Classic', priceDeltaQar: 0 },
      { label: 'Signature', priceDeltaQar: 25 },
      { label: 'Premium', priceDeltaQar: 60 },
    ],
    requiresHeightInput: false,
    heightInputLabel: null,
    heightOptions: [],
    position: 3,
    source: 'showcase',
    sourceUrl: null,
    isDemo: true,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
  },
] as unknown as Array<Product & { videoUrl?: string }>;

const ctx = {
  storefront,
  storefrontBaseHref: '/template-showcase',
  products,
  theme: { palette: 'sand_gold' },
  copy: {},
  vocabulary: {},
  isRtl: false,
  isPreview: true,
  categoriesBySlug: new Map<string, Set<string>>(),
  navPages: [
    { slug: 'collections', title: 'Collections', status: 'published' },
    { slug: 'about', title: 'About', status: 'published' },
  ],
  legalPolicies: [
    { key: 'privacy', title: 'Privacy' },
    { key: 'terms', title: 'Terms' },
  ],
} as unknown as BlockContext;

function block(type: string, props: Record<string, unknown> = {}) {
  return {
    id: `showcase-${type}`,
    type,
    props,
    style: {},
  } as never;
}

export function SouqnaWiredCommerceShowcase() {
  return (
    <CartProvider storefrontSlug="template-showcase" enabled currency="QAR">
      <div
        style={
          {
            '--sf-ground': '#f7ecd9',
            '--sf-ink': '#261f17',
            '--sf-accent': '#8c3540',
          } as CSSProperties
        }
        className="space-y-5"
      >
        <ShadcnNavbarBlock
          block={block('shadcnNavbar', { variant: 'ecommerce-navbar2', sticky: false })}
          ctx={ctx}
        />
        <ShadcnHeroBlock
          block={block('shadcnHero', {
            variant: 'ecommerce-hero6',
            tone: 'charcoal',
            title: 'Souqna-wired Product Suite',
            subtitle: 'Every product surface below uses real sample products, video media, and cart actions.',
            cta: { label: 'Browse all products', href: '/template-showcase/products' },
          })}
          ctx={ctx}
        />
        <ShadcnTrustStripBlock
          block={block('shadcnTrustStrip', { variant: 'trust-strip3' })}
          ctx={ctx}
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShadcnProductCardBlock
            block={block('shadcnProductCard', {
              variant: 'product-card24',
              title: 'Cards with working cart',
              subtitle: 'Product-safe media framing, including video previews.',
            })}
            ctx={ctx}
          />
          <ShadcnQuickViewBlock
            block={block('shadcnQuickView', {
              variant: 'product-quick-view7',
              productId: 'showcase-video-drop',
              title: 'Video quick view',
            })}
            ctx={ctx}
          />
        </div>
        <ShadcnProductDetailBlock
          block={block('shadcnProductDetail', {
            variant: 'product-detail9',
            productId: 'showcase-video-drop',
            title: 'Video product detail',
            subtitle: 'The video source is read from product data, so merchants can change the media at product level when video fields are available.',
          })}
          ctx={ctx}
        />
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <ShadcnProductListBlock
            block={block('shadcnProductList', {
              variant: 'product-list7',
              title: 'Cart-ready product list',
            })}
            ctx={ctx}
          />
          <ShadcnOfferModalBlock
            block={block('shadcnOfferModal', {
              variant: 'offer-modal5',
              title: 'Offer rail with cart actions',
              subtitle: 'The rail is no longer link-only.',
            })}
            ctx={ctx}
          />
        </div>
        <ShadcnCategoriesBlock
          block={block('shadcnCategories', { variant: 'product-categories5' })}
          ctx={ctx}
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShadcnOrderSummaryBlock
            block={block('shadcnOrderSummary', { variant: 'order-summary2' })}
            ctx={ctx}
          />
          <ShadcnReviewsBlock block={block('shadcnReviews', { variant: 'reviews23' })} ctx={ctx} />
        </div>
        <ShadcnFooterBlock block={block('shadcnFooter', { variant: 'ecommerce-footer18' })} ctx={ctx} />
      </div>
      <CartDrawer currency="QAR" variant="cart-luxury-sheet" />
    </CartProvider>
  );
}
