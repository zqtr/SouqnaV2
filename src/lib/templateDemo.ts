import type { BusinessType, Storefront, TemplateId } from '@/lib/brief';
import type { Product } from '@/lib/products';
import type { Locale } from '@/i18n/locales';
import { templatePresets } from '@/lib/templates';
import {
  getTemplateIndustrySeed,
  type SeedProductWithImage,
} from '@/lib/blocks/templateIndustrySeed';
import { DEFAULT_CHECKOUT_SETTINGS, EMPTY_POLICIES } from '@/lib/storefrontSettings';
import { DEFAULT_PRODUCT_INDEX_SETTINGS } from '@/lib/productIndexSettings';

/**
 * Synthetic storefront factory for the **public** `/templates` showcase.
 *
 * The dashboard's owner-gated preview route
 * (`/account/[slug]/preview/template/[templateId]`) renders a real
 * template by feeding the founder's actual catalogue through
 * `bootBlocksFromStorefront` + the `Storefront` dispatcher. We can't use
 * it publicly — it requires auth and a real DB row. So this module
 * synthesizes an in-memory storefront + sample catalogue from the same
 * `templatePresets` + `getTemplateIndustrySeed()` sources, so the public
 * preview reads exactly like a real store without touching the database.
 *
 * Nothing here is persisted. The output is consumed by
 * `/template-live/[templateId]` (the full-bleed live embed + "See live"
 * target) and — for posters — the screenshot capture script.
 */

/**
 * Industry each template's demo store is dressed as. Kept in sync with
 * the vibe of each preset so `getTemplateIndustrySeed` returns copy and
 * products that fit the template's story. (Moved here from the old
 * `/templates` index page.)
 */
export const TEMPLATE_PREVIEW_BUSINESS: Record<TemplateId, BusinessType> = {
  atrium: 'ecommerce',
  souqline: 'home_kitchen',
  studio: 'graphic_design',
  lounge: 'clothing_store',
  monoline: 'cafe',
  kiosk: 'perfume_oud',
  bazaar: 'clothing_store',
  harvest: 'home_kitchen',
  vitrine: 'ecommerce',
  launchpad: 'graphic_design',
  frame: 'photography',
};

const DEMO_SLUG = 'template-preview';

/**
 * A complete `Product` skeleton. Every field the render path might read
 * has a safe default so seed rows only need to overlay the handful of
 * fields the seed actually carries (title, price, image, category…).
 */
const PRODUCT_DEFAULTS = {
  storefrontSlug: DEMO_SLUG,
  subtitle: null,
  description: null,
  priceQar: null,
  compareAtPriceQar: null,
  costPerItemQar: null,
  taxable: false,
  discountEligible: true,
  pricingMode: 'one_time',
  monthlyPriceQar: null,
  imageUrl: null,
  mediaAltText: null,
  category: null,
  productType: null,
  vendor: null,
  tags: [] as string[],
  templateKey: null,
  badges: [] as string[],
  handle: null,
  seoTitle: null,
  seoDescription: null,
  eventAt: null,
  publishedAt: null,
  saleStartsAt: null,
  saleEndsAt: null,
  status: 'active',
  stock: 25,
  sku: null,
  barcode: null,
  trackInventory: false,
  continueSellingWhenOutOfStock: true,
  lowStockThreshold: null,
  restockAt: null,
  supplierCostQar: null,
  purchaseOrderRef: null,
  stockStatusLabel: null,
  minOrderQuantity: 1,
  maxOrderQuantity: null,
  physicalProduct: true,
  weightGrams: null,
  packageDimensions: { lengthCm: null, widthCm: null, heightCm: null },
  requiresShipping: true,
  freeShippingEligible: false,
  countryOfOrigin: null,
  hsCode: null,
  customsDescription: null,
  digitalDelivery: false,
  metafields: {} as Record<string, string>,
  isCustomizable: false,
  customizationLabel: null,
  sizeOptions: [] as string[],
  sizeOptionPrices: [],
  allowCustomSize: false,
  variantOptions: [] as string[],
  variantOptionPrices: [],
  requiresHeightInput: false,
  heightInputLabel: null,
  heightOptions: [] as string[],
  position: 0,
  source: 'template-preview',
  sourceUrl: null,
  isDemo: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function seedProductToProduct(
  seed: SeedProductWithImage,
  index: number,
  locale: Locale,
): Product {
  const useAr = locale === 'ar';
  const title = (useAr && seed.titleAr) || seed.title;
  const description = (useAr && seed.descriptionAr) || seed.description;
  return {
    ...PRODUCT_DEFAULTS,
    id: `${DEMO_SLUG}-${index + 1}`,
    title,
    description,
    priceQar: seed.priceQar ?? null,
    imageUrl: seed.imageUrl,
    category: seed.category ?? null,
    status: seed.status ?? 'active',
    position: index,
    handle: `${DEMO_SLUG}-${index + 1}`,
  } as unknown as Product;
}

export type TemplateDemo = {
  data: Storefront;
  products: Product[];
  categoriesBySlug: Map<string, Set<string>>;
};

/**
 * Build an in-memory storefront + sample catalogue for `templateId`,
 * ready to hand to `bootBlocksFromStorefront` + `<Storefront>`.
 */
export function buildTemplateDemo(templateId: TemplateId, locale: Locale): TemplateDemo {
  const preset = templatePresets[templateId];
  const businessType = TEMPLATE_PREVIEW_BUSINESS[templateId];
  const seed = getTemplateIndustrySeed(templateId, businessType, {
    businessName: preset.label.split('·')[0]?.trim() || 'Souqna Studio',
    tagline: null,
  });

  const products = seed.products.map((p, i) => seedProductToProduct(p, i, locale));

  const categoriesBySlug = new Map<string, Set<string>>();
  for (const product of products) {
    if (!product.category) continue;
    const set = categoriesBySlug.get(product.category) ?? new Set<string>();
    set.add(product.id);
    categoriesBySlug.set(product.category, set);
  }

  const businessName = preset.label.split('·')[0]?.trim() || 'Souqna Studio';

  const data = {
    slug: DEMO_SLUG,
    locale,
    founderName: 'Souqna',
    businessName,
    contactEmail: 'hello@souqna.qa',
    ownership: 'individual',
    experience: 'established',
    businessType,
    marketVolume: 'growing',
    payments: 'ready',
    tagline: seed.tagline,
    phone: null,
    area: 'Doha',
    hours: null,
    instagram: null,
    logoUrl: null,
    faviconUrl: null,
    design: 'editorial',
    palette: preset.palette,
    templateId,
    crNumber: null,
    clerkUserId: 'template-preview',
    publishedBlocks: [],
    draftBlocks: [],
    themeOverrides: { ...preset.theme },
    isPublished: true,
    publishedAt: new Date(0),
    souqyRevision: null,
    souqyBlobUrl: null,
    souqySource: null,
    souqyBrief: {},
    policies: { ...EMPTY_POLICIES },
    checkout: { ...DEFAULT_CHECKOUT_SETTINGS },
    productIndex: { ...DEFAULT_PRODUCT_INDEX_SETTINGS },
    crConfirmedAt: null,
    customDomain: null,
    customDomainAddedAt: null,
    customDomainVerifiedAt: null,
    subdomainStatus: 'live',
    subdomainProvisionedAt: new Date(0),
    subdomainError: null,
    createdAt: new Date(0),
    expiresAt: new Date(8640000000000000),
  } as unknown as Storefront;

  return { data, products, categoriesBySlug };
}
