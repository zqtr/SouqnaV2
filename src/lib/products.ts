import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';
import { getStorefront } from './brief';
import { dispatchAppEventDetached } from './apps/dispatch';
import {
  type Capability,
  type Role,
  hasCapability,
  isRole,
  sanitizeCapabilities,
} from './team/capabilities';
import {
  DEFAULT_PRODUCT_HEIGHT_OPTIONS,
  type PricedProductOption,
  normalizeHeightInputLabel,
  normalizeHeightOptions,
  normalizePricedOptions,
} from './productOptions';

/**
 * Product catalogue per storefront.
 *
 * Generic enough to cover every archetype: a title, optional description, an
 * optional image, an optional price in QAR, an optional category (used by Menu
 * to group rows), and an optional `eventAt` consumed only by the Calendar
 * archetype. `position` drives display order; `status` lets the founder hide
 * a row without deleting it.
 */
export type ProductStatus = 'active' | 'draft' | 'sold_out';
export type PricingMode = 'one_time' | 'monthly_payment';
export type PackageDimensions = {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

const EMPTY_PACKAGE_DIMENSIONS: PackageDimensions = {
  lengthCm: null,
  widthCm: null,
  heightCm: null,
};

export type Product = {
  id: string;
  storefrontSlug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceQar: number | null;
  compareAtPriceQar: number | null;
  costPerItemQar: number | null;
  taxable: boolean;
  discountEligible: boolean;
  pricingMode: PricingMode;
  monthlyPriceQar: number | null;
  imageUrl: string | null;
  mediaAltText: string | null;
  category: string | null;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  templateKey: string | null;
  badges: string[];
  handle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  eventAt: Date | null;
  publishedAt: Date | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  status: ProductStatus;
  stock: number;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: number | null;
  restockAt: Date | null;
  supplierCostQar: number | null;
  purchaseOrderRef: string | null;
  stockStatusLabel: string | null;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  physicalProduct: boolean;
  weightGrams: number | null;
  packageDimensions: PackageDimensions;
  requiresShipping: boolean;
  freeShippingEligible: boolean;
  countryOfOrigin: string | null;
  hsCode: string | null;
  customsDescription: string | null;
  digitalDelivery: boolean;
  metafields: Record<string, string>;
  isCustomizable: boolean;
  customizationLabel: string | null;
  sizeOptions: string[];
  sizeOptionPrices: PricedProductOption[];
  allowCustomSize: boolean;
  variantOptions: string[];
  variantOptionPrices: PricedProductOption[];
  requiresHeightInput: boolean;
  heightInputLabel: string | null;
  heightOptions: string[];
  position: number;
  source: string;
  sourceUrl?: string | null;
  /** True when this row was inserted by `seedTemplateDemoProducts`. Drives
   *  the "remove demo content" affordance on /account/products. Stays
   *  false for everything else, including products imported via apps. */
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ProductRow = {
  id: string;
  storefront_slug: string;
  title: string;
  subtitle?: string | null;
  description: string | null;
  price_qar: string | null;
  compare_at_price_qar?: string | null;
  cost_per_item_qar?: string | null;
  taxable?: boolean | null;
  discount_eligible?: boolean | null;
  pricing_mode?: PricingMode | null;
  monthly_price_qar?: string | null;
  image_url: string | null;
  media_alt_text?: string | null;
  category: string | null;
  product_type?: string | null;
  vendor?: string | null;
  tags?: unknown;
  template_key?: string | null;
  badges?: unknown;
  handle?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  event_at: string | null;
  published_at?: string | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  status: ProductStatus;
  stock?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  track_inventory?: boolean | null;
  continue_selling_when_out_of_stock?: boolean | null;
  low_stock_threshold?: number | string | null;
  restock_at?: string | null;
  supplier_cost_qar?: string | null;
  purchase_order_ref?: string | null;
  stock_status_label?: string | null;
  min_order_quantity?: number | string | null;
  max_order_quantity?: number | string | null;
  physical_product?: boolean | null;
  weight_grams?: number | string | null;
  package_dimensions?: unknown;
  requires_shipping?: boolean | null;
  free_shipping_eligible?: boolean | null;
  country_of_origin?: string | null;
  hs_code?: string | null;
  customs_description?: string | null;
  digital_delivery?: boolean | null;
  metafields?: unknown;
  is_customizable?: boolean | null;
  customization_label?: string | null;
  size_options?: unknown;
  allow_custom_size?: boolean | null;
  variant_options?: unknown;
  requires_height_input?: boolean | null;
  height_input_label?: string | null;
  height_options?: unknown;
  position: number;
  source: string | null;
  source_url?: string | null;
  is_demo?: boolean | null;
  created_at: string;
  updated_at: string;
};

function parsePricedOptions(value: unknown): PricedProductOption[] {
  if (typeof value !== 'string') return normalizePricedOptions(value);
  try {
    return normalizePricedOptions(JSON.parse(value));
  } catch {
    return normalizePricedOptions([]);
  }
}

function parseHeightOptions(value: unknown): string[] {
  if (typeof value !== 'string') return normalizeHeightOptions(value);
  try {
    return normalizeHeightOptions(JSON.parse(value));
  } catch {
    return normalizeHeightOptions([]);
  }
}

function parseStringArray(value: unknown): string[] {
  const raw =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
          }
        })()
      : value;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' && typeof item !== 'number') continue;
    const label = String(item).replace(/\s+/g, ' ').trim().slice(0, 60);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function parseStringMap(value: unknown): Record<string, string> {
  const raw =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return {};
          }
        })()
      : value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val !== 'string' && typeof val !== 'number') continue;
    const k = key.replace(/\s+/g, ' ').trim().slice(0, 60);
    const v = String(val).replace(/\s+/g, ' ').trim().slice(0, 240);
    if (k && v) out[k] = v;
  }
  return out;
}

function parsePackageDimensions(value: unknown): PackageDimensions {
  const raw =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return {};
          }
        })()
      : value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_PACKAGE_DIMENSIONS;
  const obj = raw as Record<string, unknown>;
  return {
    lengthCm: normalizeNullableNumber(obj.lengthCm ?? obj.length_cm),
    widthCm: normalizeNullableNumber(obj.widthCm ?? obj.width_cm),
    heightCm: normalizeNullableNumber(obj.heightCm ?? obj.height_cm),
  };
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalizeInteger(value: unknown, fallback: number): number {
  const n = normalizeNullableNumber(value);
  if (n === null) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeText(value: unknown, max = 240): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).replace(/\s+/g, ' ').trim().slice(0, max);
  return normalized || null;
}

export function normalizeProductHandle(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 96);
  return normalized || null;
}

export function productPathSegment(product: Pick<Product, 'id' | 'handle'>): string {
  return encodeURIComponent(product.handle || product.id);
}

function nullableDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fromRow(row: ProductRow): Product {
  const sizeOptionPrices = parsePricedOptions(row.size_options);
  const variantOptionPrices = parsePricedOptions(row.variant_options);
  const sizeOptions = sizeOptionPrices.map((option) => option.label);
  const variantOptions = variantOptionPrices.map((option) => option.label);
  const heightOptions = parseHeightOptions(row.height_options);
  return {
    id: row.id,
    storefrontSlug: row.storefront_slug,
    title: row.title,
    subtitle: row.subtitle ?? null,
    description: row.description,
    priceQar: row.price_qar !== null ? Number(row.price_qar) : null,
    compareAtPriceQar:
      row.compare_at_price_qar !== null && row.compare_at_price_qar !== undefined
        ? Number(row.compare_at_price_qar)
        : null,
    costPerItemQar:
      row.cost_per_item_qar !== null && row.cost_per_item_qar !== undefined
        ? Number(row.cost_per_item_qar)
        : null,
    taxable: row.taxable !== false,
    discountEligible: row.discount_eligible !== false,
    pricingMode: row.pricing_mode === 'monthly_payment' ? 'monthly_payment' : 'one_time',
    monthlyPriceQar:
      row.monthly_price_qar !== null && row.monthly_price_qar !== undefined
        ? Number(row.monthly_price_qar)
        : null,
    imageUrl: row.image_url,
    mediaAltText: row.media_alt_text ?? null,
    category: row.category,
    productType: row.product_type ?? null,
    vendor: row.vendor ?? null,
    tags: parseStringArray(row.tags),
    templateKey: row.template_key ?? null,
    badges: parseStringArray(row.badges),
    handle: normalizeProductHandle(row.handle),
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    eventAt: nullableDate(row.event_at),
    publishedAt: nullableDate(row.published_at),
    saleStartsAt: nullableDate(row.sale_starts_at),
    saleEndsAt: nullableDate(row.sale_ends_at),
    status: row.status,
    stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : 0,
    sku: row.sku ?? null,
    barcode: row.barcode ?? null,
    trackInventory: row.track_inventory === true,
    continueSellingWhenOutOfStock: row.continue_selling_when_out_of_stock === true,
    lowStockThreshold: normalizeNullableNumber(row.low_stock_threshold),
    restockAt: nullableDate(row.restock_at),
    supplierCostQar:
      row.supplier_cost_qar !== null && row.supplier_cost_qar !== undefined
        ? Number(row.supplier_cost_qar)
        : null,
    purchaseOrderRef: row.purchase_order_ref ?? null,
    stockStatusLabel: row.stock_status_label ?? null,
    minOrderQuantity: Math.max(1, normalizeInteger(row.min_order_quantity, 1)),
    maxOrderQuantity: normalizeNullableNumber(row.max_order_quantity),
    physicalProduct: row.physical_product !== false,
    weightGrams: normalizeNullableNumber(row.weight_grams),
    packageDimensions: parsePackageDimensions(row.package_dimensions),
    requiresShipping: row.requires_shipping !== false,
    freeShippingEligible: row.free_shipping_eligible === true,
    countryOfOrigin: row.country_of_origin ?? null,
    hsCode: row.hs_code ?? null,
    customsDescription: row.customs_description ?? null,
    digitalDelivery: row.digital_delivery === true,
    metafields: parseStringMap(row.metafields),
    isCustomizable: row.is_customizable === true,
    customizationLabel: row.customization_label ?? null,
    sizeOptions,
    sizeOptionPrices,
    allowCustomSize: row.allow_custom_size === true,
    variantOptions,
    variantOptionPrices,
    requiresHeightInput: row.requires_height_input === true,
    heightInputLabel: row.height_input_label ?? null,
    heightOptions,
    position: row.position,
    source: row.source ?? 'manual',
    sourceUrl: row.source_url ?? null,
    isDemo: row.is_demo === true,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export type ProductWriteInput = {
  title: string;
  subtitle?: string | null;
  description: string | null;
  priceQar: number | null;
  compareAtPriceQar?: number | null;
  costPerItemQar?: number | null;
  taxable?: boolean;
  discountEligible?: boolean;
  pricingMode?: PricingMode;
  monthlyPriceQar?: number | null;
  imageUrl: string | null;
  mediaAltText?: string | null;
  category: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[];
  templateKey?: string | null;
  badges?: string[];
  handle?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  eventAt: Date | null;
  publishedAt?: Date | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  status: ProductStatus;
  stock?: number;
  sku?: string | null;
  barcode?: string | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
  lowStockThreshold?: number | null;
  restockAt?: Date | null;
  supplierCostQar?: number | null;
  purchaseOrderRef?: string | null;
  stockStatusLabel?: string | null;
  minOrderQuantity?: number;
  maxOrderQuantity?: number | null;
  physicalProduct?: boolean;
  weightGrams?: number | null;
  packageDimensions?: PackageDimensions;
  requiresShipping?: boolean;
  freeShippingEligible?: boolean;
  countryOfOrigin?: string | null;
  hsCode?: string | null;
  customsDescription?: string | null;
  digitalDelivery?: boolean;
  metafields?: Record<string, string>;
  isCustomizable?: boolean;
  customizationLabel?: string | null;
  sizeOptions?: Array<string | PricedProductOption>;
  allowCustomSize?: boolean;
  variantOptions?: Array<string | PricedProductOption>;
  requiresHeightInput?: boolean;
  heightInputLabel?: string | null;
  heightOptions?: string[];
  /** Only the demo seeder sets this true. Surfaces "sample product"
   *  banners on the merchant dashboard and gates the bulk-clear action. */
  isDemo?: boolean;
  source?: string;
  sourceUrl?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeWritePayload(p: ProductWriteInput) {
  const minOrderQuantity = Math.max(1, normalizeInteger(p.minOrderQuantity, 1));
  const maxOrderQuantity = normalizeNullableNumber(p.maxOrderQuantity);
  return {
    subtitle: normalizeText(p.subtitle, 240),
    compareAtPriceQar: normalizeNullableNumber(p.compareAtPriceQar),
    costPerItemQar: normalizeNullableNumber(p.costPerItemQar),
    taxable: p.taxable !== false,
    discountEligible: p.discountEligible !== false,
    mediaAltText: normalizeText(p.mediaAltText, 180),
    productType: normalizeText(p.productType, 80),
    vendor: normalizeText(p.vendor, 120),
    tags: JSON.stringify(parseStringArray(p.tags ?? [])),
    templateKey: normalizeText(p.templateKey, 80),
    badges: JSON.stringify(parseStringArray(p.badges ?? [])),
    handle: normalizeProductHandle(p.handle) ?? normalizeProductHandle(p.title),
    seoTitle: normalizeText(p.seoTitle, 160),
    seoDescription: normalizeText(p.seoDescription, 220),
    publishedAt: p.publishedAt ?? null,
    saleStartsAt: p.saleStartsAt ?? null,
    saleEndsAt: p.saleEndsAt ?? null,
    sku: normalizeText(p.sku, 80),
    barcode: normalizeText(p.barcode, 80),
    trackInventory: p.trackInventory === true,
    continueSellingWhenOutOfStock: p.continueSellingWhenOutOfStock === true,
    lowStockThreshold: normalizeNullableNumber(p.lowStockThreshold),
    restockAt: p.restockAt ?? null,
    supplierCostQar: normalizeNullableNumber(p.supplierCostQar),
    purchaseOrderRef: normalizeText(p.purchaseOrderRef, 80),
    stockStatusLabel: normalizeText(p.stockStatusLabel, 80),
    minOrderQuantity,
    maxOrderQuantity:
      maxOrderQuantity !== null ? Math.max(minOrderQuantity, Math.floor(maxOrderQuantity)) : null,
    physicalProduct: p.physicalProduct !== false,
    weightGrams: normalizeNullableNumber(p.weightGrams),
    packageDimensions: JSON.stringify(parsePackageDimensions(p.packageDimensions)),
    requiresShipping: p.requiresShipping !== false,
    freeShippingEligible: p.freeShippingEligible === true,
    countryOfOrigin: normalizeText(p.countryOfOrigin, 80),
    hsCode: normalizeText(p.hsCode, 40),
    customsDescription: normalizeText(p.customsDescription, 160),
    digitalDelivery: p.digitalDelivery === true,
    metafields: JSON.stringify(parseStringMap(p.metafields ?? {})),
  };
}

/**
 * Public storefront read — returns only `active` and `sold_out` products,
 * ordered for display. Drafts are owner-only.
 */
export const getPublicProducts = cache(async (slug: string): Promise<Product[]> => {
  noStore();
  const rows = (await db()`
    select * from products
    where storefront_slug = ${slug}
      and status in ('active','sold_out')
      and (published_at is null or published_at <= now())
    order by position asc, created_at asc
  `) as unknown as ProductRow[];
  return rows.map(fromRow);
});

/**
 * Owner read — every row, including drafts.
 */
export async function getAllProducts(slug: string): Promise<Product[]> {
  noStore();
  const rows = (await db()`
    select * from products
    where storefront_slug = ${slug}
    order by position asc, created_at asc
  `) as unknown as ProductRow[];
  return rows.map(fromRow);
}

export async function countMerchantProducts(slug: string): Promise<number> {
  noStore();
  const rows = (await db()`
    select count(*)::int as n
    from products
    where storefront_slug = ${slug}
      and coalesce(is_demo, false) = false
  `) as unknown as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

/**
 * Cross-storefront read for the /account Products tab. Joins products
 * against the owning brief so the founder's full catalogue can be shown
 * in one list, with the storefront name attached to each row.
 *
 * Sort: newest storefront first, then per-storefront `position` so the
 * group ordering still matches what the dashboard surface shows.
 */
export type ProductWithStorefront = Product & {
  storefrontName: string;
  storefrontLocale: 'en' | 'ar';
};

export async function getProductsForUser(clerkUserId: string): Promise<ProductWithStorefront[]> {
  if (!clerkUserId) return [];
  noStore();
  const rows = (await db()`
    select p.*, b.business_name, b.locale, b.created_at as storefront_created_at
    from products p
    join briefs b on b.slug = p.storefront_slug
    where b.clerk_user_id = ${clerkUserId}
      and b.expires_at > now()
    order by b.created_at desc, p.position asc, p.created_at asc
  `) as unknown as (ProductRow & {
    business_name: string;
    locale: 'en' | 'ar';
    storefront_created_at: string;
  })[];
  return rows.map((row) => ({
    ...fromRow(row),
    storefrontName: row.business_name,
    storefrontLocale: row.locale,
  }));
}

export async function getProduct(slug: string, id: string): Promise<Product | null> {
  noStore();
  const rows = UUID_RE.test(id)
    ? ((await db()`
        select * from products
        where storefront_slug = ${slug} and id = ${id}
        limit 1
      `) as unknown as ProductRow[])
    : ((await db()`
        select * from products
        where storefront_slug = ${slug} and lower(handle) = lower(${id})
        limit 1
      `) as unknown as ProductRow[]);
  const row = rows[0];
  return row ? fromRow(row) : null;
}

export async function insertProduct(slug: string, p: ProductWriteInput): Promise<Product> {
  // Append new products to the end of the list by default.
  const isCustomizable = p.isCustomizable === true;
  const customizationLabel = isCustomizable ? (p.customizationLabel ?? null) : null;
  const normalizedSizeOptionPrices = normalizePricedOptions(p.sizeOptions ?? []);
  const normalizedSizeOptions = normalizedSizeOptionPrices.map((option) => option.label);
  const sizeOptions = JSON.stringify(normalizedSizeOptionPrices);
  const variantOptions = JSON.stringify(normalizePricedOptions(p.variantOptions ?? []));
  const allowCustomSize =
    p.allowCustomSize === true && normalizedSizeOptions.length > 0;
  const requiresHeightInput = p.requiresHeightInput === true;
  const heightInputLabel = requiresHeightInput
    ? normalizeHeightInputLabel(p.heightInputLabel)
    : null;
  const normalizedHeightOptions = normalizeHeightOptions(p.heightOptions ?? []);
  const heightOptions = JSON.stringify(
    requiresHeightInput
      ? normalizedHeightOptions.length > 0
        ? normalizedHeightOptions
        : DEFAULT_PRODUCT_HEIGHT_OPTIONS
      : [],
  );
  const commerce = normalizeWritePayload(p);
  const tail = (await db()`
    select coalesce(max(position), -1) + 1 as next from products where storefront_slug = ${slug}
  `) as unknown as { next: number }[];
  const next = Number(tail[0]?.next ?? 0);
  const rows = (await db()`
    insert into products (
      storefront_slug, title, subtitle, description, price_qar, compare_at_price_qar,
      cost_per_item_qar, taxable, discount_eligible, image_url, media_alt_text,
      pricing_mode, monthly_price_qar,
      category, product_type, vendor, tags, template_key, badges, handle, seo_title,
      seo_description, event_at, published_at, sale_starts_at, sale_ends_at, status,
      stock, sku, barcode, track_inventory, continue_selling_when_out_of_stock,
      low_stock_threshold, restock_at, supplier_cost_qar, purchase_order_ref,
      stock_status_label, min_order_quantity, max_order_quantity, physical_product,
      weight_grams, package_dimensions, requires_shipping, free_shipping_eligible,
      country_of_origin, hs_code, customs_description, digital_delivery, metafields,
      is_customizable, customization_label, size_options, allow_custom_size,
      variant_options, requires_height_input, height_input_label, height_options,
      position, is_demo, source, source_url
    ) values (
      ${slug}, ${p.title}, ${commerce.subtitle}, ${p.description}, ${p.priceQar}, ${commerce.compareAtPriceQar},
      ${commerce.costPerItemQar}, ${commerce.taxable}, ${commerce.discountEligible}, ${p.imageUrl}, ${commerce.mediaAltText},
      ${p.pricingMode ?? 'one_time'}, ${p.monthlyPriceQar ?? null},
      ${p.category}, ${commerce.productType}, ${commerce.vendor}, ${commerce.tags}::jsonb, ${commerce.templateKey}, ${commerce.badges}::jsonb,
      ${commerce.handle}, ${commerce.seoTitle}, ${commerce.seoDescription}, ${p.eventAt}, ${commerce.publishedAt},
      ${commerce.saleStartsAt}, ${commerce.saleEndsAt}, ${p.status},
      ${p.stock ?? 0}, ${commerce.sku}, ${commerce.barcode}, ${commerce.trackInventory}, ${commerce.continueSellingWhenOutOfStock},
      ${commerce.lowStockThreshold}, ${commerce.restockAt}, ${commerce.supplierCostQar}, ${commerce.purchaseOrderRef},
      ${commerce.stockStatusLabel}, ${commerce.minOrderQuantity}, ${commerce.maxOrderQuantity}, ${commerce.physicalProduct},
      ${commerce.weightGrams}, ${commerce.packageDimensions}::jsonb, ${commerce.requiresShipping}, ${commerce.freeShippingEligible},
      ${commerce.countryOfOrigin}, ${commerce.hsCode}, ${commerce.customsDescription}, ${commerce.digitalDelivery}, ${commerce.metafields}::jsonb,
      ${isCustomizable}, ${customizationLabel}, ${sizeOptions}::jsonb, ${allowCustomSize},
      ${variantOptions}::jsonb, ${requiresHeightInput}, ${heightInputLabel}, ${heightOptions}::jsonb,
      ${next}, ${p.isDemo === true}, ${p.source ?? 'manual'}, ${p.sourceUrl ?? null}
    )
    returning *
  `) as unknown as ProductRow[];
  const row = rows[0];
  if (!row) throw new Error('insert failed');
  const product = fromRow(row);
  if (product.status !== 'draft') {
    dispatchAppEventDetached({
      kind: 'product.created',
      storefrontSlug: slug,
      product,
    });
  }
  return product;
}

export async function updateProductRow(
  slug: string,
  id: string,
  p: ProductWriteInput,
): Promise<Product | null> {
  const isCustomizable = p.isCustomizable === true;
  const customizationLabel = isCustomizable ? (p.customizationLabel ?? null) : null;
  const normalizedSizeOptionPrices = normalizePricedOptions(p.sizeOptions ?? []);
  const normalizedSizeOptions = normalizedSizeOptionPrices.map((option) => option.label);
  const sizeOptions = JSON.stringify(normalizedSizeOptionPrices);
  const variantOptions = JSON.stringify(normalizePricedOptions(p.variantOptions ?? []));
  const allowCustomSize =
    p.allowCustomSize === true && normalizedSizeOptions.length > 0;
  const requiresHeightInput = p.requiresHeightInput === true;
  const heightInputLabel = requiresHeightInput
    ? normalizeHeightInputLabel(p.heightInputLabel)
    : null;
  const normalizedHeightOptions = normalizeHeightOptions(p.heightOptions ?? []);
  const heightOptions = JSON.stringify(
    requiresHeightInput
      ? normalizedHeightOptions.length > 0
        ? normalizedHeightOptions
        : DEFAULT_PRODUCT_HEIGHT_OPTIONS
      : [],
  );
  const commerce = normalizeWritePayload(p);
  const rows = (await db()`
    update products set
      title       = ${p.title},
      subtitle    = ${commerce.subtitle},
      description = ${p.description},
      price_qar   = ${p.priceQar},
      compare_at_price_qar = ${commerce.compareAtPriceQar},
      cost_per_item_qar = ${commerce.costPerItemQar},
      taxable = ${commerce.taxable},
      discount_eligible = ${commerce.discountEligible},
      pricing_mode = ${p.pricingMode ?? 'one_time'},
      monthly_price_qar = ${p.monthlyPriceQar ?? null},
      image_url   = ${p.imageUrl},
      media_alt_text = ${commerce.mediaAltText},
      category    = ${p.category},
      product_type = ${commerce.productType},
      vendor = ${commerce.vendor},
      tags = ${commerce.tags}::jsonb,
      template_key = ${commerce.templateKey},
      badges = ${commerce.badges}::jsonb,
      handle = ${commerce.handle},
      seo_title = ${commerce.seoTitle},
      seo_description = ${commerce.seoDescription},
      event_at    = ${p.eventAt},
      published_at = ${commerce.publishedAt},
      sale_starts_at = ${commerce.saleStartsAt},
      sale_ends_at = ${commerce.saleEndsAt},
      status      = ${p.status},
      stock       = coalesce(${p.stock ?? null}, stock),
      sku = ${commerce.sku},
      barcode = ${commerce.barcode},
      track_inventory = ${commerce.trackInventory},
      continue_selling_when_out_of_stock = ${commerce.continueSellingWhenOutOfStock},
      low_stock_threshold = ${commerce.lowStockThreshold},
      restock_at = ${commerce.restockAt},
      supplier_cost_qar = ${commerce.supplierCostQar},
      purchase_order_ref = ${commerce.purchaseOrderRef},
      stock_status_label = ${commerce.stockStatusLabel},
      min_order_quantity = ${commerce.minOrderQuantity},
      max_order_quantity = ${commerce.maxOrderQuantity},
      physical_product = ${commerce.physicalProduct},
      weight_grams = ${commerce.weightGrams},
      package_dimensions = ${commerce.packageDimensions}::jsonb,
      requires_shipping = ${commerce.requiresShipping},
      free_shipping_eligible = ${commerce.freeShippingEligible},
      country_of_origin = ${commerce.countryOfOrigin},
      hs_code = ${commerce.hsCode},
      customs_description = ${commerce.customsDescription},
      digital_delivery = ${commerce.digitalDelivery},
      metafields = ${commerce.metafields}::jsonb,
      is_customizable = ${isCustomizable},
      customization_label = ${customizationLabel},
      size_options = ${sizeOptions}::jsonb,
      allow_custom_size = ${allowCustomSize},
      variant_options = ${variantOptions}::jsonb,
      requires_height_input = ${requiresHeightInput},
      height_input_label = ${heightInputLabel},
      height_options = ${heightOptions}::jsonb,
      source_url  = ${p.sourceUrl ?? null},
      updated_at  = now()
    where storefront_slug = ${slug} and id = ${id}
    returning *
  `) as unknown as ProductRow[];
  const row = rows[0];
  return row ? fromRow(row) : null;
}

export async function deleteProductRow(slug: string, id: string): Promise<boolean> {
  const deleted = await deleteProductRowWithSnapshot(slug, id);
  return deleted !== null;
}

export async function deleteProductRowWithSnapshot(
  slug: string,
  id: string,
): Promise<Product | null> {
  const rows = (await db()`
    delete from products
    where storefront_slug = ${slug} and id = ${id}
    returning *
  `) as unknown as ProductRow[];
  const row = rows[0];
  return row ? fromRow(row) : null;
}

/**
 * Reorder products by accepting an ordered list of IDs. We rewrite the
 * `position` column for every product in the storefront in one transaction.
 */
export async function reorderProductRows(slug: string, orderedIds: string[]): Promise<void> {
  // Neon HTTP driver doesn't expose multi-statement transactions; the loop is
  // fine for our scale (a single founder, modest catalogue). Each update is
  // scoped to (slug, id) so a stale ID can't mutate someone else's row.
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) continue;
    await db()`
      update products
      set position = ${i}, updated_at = now()
      where storefront_slug = ${slug} and id = ${id}
    `;
  }
}

/**
 * Ownership gate — every product server action calls this first. Returns the
 * storefront row if the signed-in Clerk user owns it, or null. Callers must
 * treat null as 401/403.
 */
export async function assertStorefrontOwner(slug: string, clerkUserId: string | null) {
  if (!clerkUserId) return null;
  const sf = await getStorefront(slug);
  if (!sf || sf.clerkUserId !== clerkUserId) return null;
  return sf;
}

/**
 * Shared-access gate.
 *
 * Resolves whether `clerkUserId` may exercise `capability` on `slug`.
 * Owner short-circuits the membership table: the user identified by
 * `briefs.clerk_user_id` is always treated as role='owner' with every
 * capability. Non-owners must have a row in `storefront_members` whose
 * effective capability set (role preset + jsonb overrides) grants the
 * requested capability.
 *
 * Returns null on deny so callers can mirror the existing
 * assertStorefrontOwner pattern (null → 401/403).
 */
export type StorefrontAccess =
  Awaited<ReturnType<typeof getStorefront>> extends infer SF
    ? SF extends null | undefined
      ? never
      : {
          storefront: NonNullable<SF>;
          role: Role;
          capabilities: Partial<Record<Capability, boolean>>;
        }
    : never;

export async function assertStorefrontAccess(
  slug: string,
  clerkUserId: string | null,
  capability: Capability,
): Promise<StorefrontAccess | null> {
  if (!clerkUserId) return null;
  const sf = await getStorefront(slug);
  if (!sf) return null;
  if (sf.clerkUserId === clerkUserId) {
    return { storefront: sf, role: 'owner', capabilities: {} } as StorefrontAccess;
  }
  const rows = (await db()`
    select role, capabilities
    from storefront_members
    where storefront_slug = ${slug} and clerk_user_id = ${clerkUserId}
    limit 1
  `) as Array<{ role: string; capabilities: unknown }>;
  const row = rows[0];
  if (!row || !isRole(row.role)) return null;
  const caps = sanitizeCapabilities(row.capabilities);
  if (!hasCapability({ role: row.role, capabilities: caps }, capability)) return null;
  return { storefront: sf, role: row.role, capabilities: caps } as StorefrontAccess;
}

/**
 * Bulk-clear seeded demo products. Returns the ids that were removed so
 * the caller can write a single summary audit row rather than one per
 * deletion. Scoped to a single storefront — never call without a slug.
 */
export async function deleteDemoProducts(slug: string): Promise<string[]> {
  const rows = (await db()`
    delete from products
    where storefront_slug = ${slug} and is_demo = true
    returning id
  `) as unknown as { id: string }[];
  return rows.map((row) => row.id);
}

/**
 * Top products by order count over the given window. Joins the live
 * `products` catalogue against `checkout_order_items` so a renamed or
 * deleted product still surfaces by its current row (the item's
 * `product_id` is a soft FK and goes null on delete — those orphans
 * are filtered out here).
 *
 * Drives the dashboard home "Top products" card and any future merch
 * leaderboard. The 30-day window is owned by the caller so the same
 * helper can power a 7-day or 90-day chart later.
 */
export type TopProductByOrders = {
  product: Product;
  ordersCount: number;
  revenueQar: number;
};

export async function topProductsByOrders(
  slug: string,
  sinceDays: number,
  limit = 3,
): Promise<TopProductByOrders[]> {
  noStore();
  const rows = (await db()`
    select p.*,
           count(i.id)::int as orders_count,
           coalesce(sum(i.price_qar_snapshot * i.quantity), 0)::int as revenue_qar
    from products p
    join checkout_order_items i on i.product_id = p.id
    join checkout_orders o on o.id = i.order_id
    where p.storefront_slug = ${slug}
      and o.storefront_slug = ${slug}
      and o.created_at >= now() - (${sinceDays}::int * interval '1 day')
      and o.order_status <> 'cancelled'
    group by p.id
    order by orders_count desc, revenue_qar desc
    limit ${limit}
  `) as unknown as (ProductRow & {
    orders_count: number;
    revenue_qar: number;
  })[];
  return rows.map((row) => ({
    product: fromRow(row),
    ordersCount: Number(row.orders_count ?? 0),
    revenueQar: Number(row.revenue_qar ?? 0),
  }));
}

export type InventoryAnalyticsSnapshot = {
  productCount: number;
  totalUnitsOnHand: number;
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
  lowStockProducts: Array<{ id: string; title: string; stock: number }>;
};

export async function inventoryAnalyticsForStorefront(
  slug: string,
): Promise<InventoryAnalyticsSnapshot> {
  noStore();
  const rows = (await db()`
    select id, title, stock, status
    from products
    where storefront_slug = ${slug}
      and coalesce(is_demo, false) = false
  `) as unknown as Array<{
    id: string;
    title: string;
    stock: number | string | null;
    status: ProductStatus;
  }>;

  const normalized = rows.map((row) => ({
    id: row.id,
    title: row.title,
    stock: Number(row.stock ?? 0),
    status: row.status,
  }));
  const lowStockProducts = normalized
    .filter((row) => row.status !== 'draft' && row.stock > 0 && row.stock <= 3)
    .sort((a, b) => a.stock - b.stock || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(({ id, title, stock }) => ({ id, title, stock }));

  return {
    productCount: normalized.length,
    totalUnitsOnHand: normalized.reduce((sum, row) => sum + Math.max(0, row.stock), 0),
    lowStockCount: normalized.filter((row) => row.status !== 'draft' && row.stock > 0 && row.stock <= 3).length,
    outOfStockCount: normalized.filter((row) => row.status === 'sold_out' || row.stock <= 0).length,
    overstockCount: normalized.filter((row) => row.stock >= 50).length,
    lowStockProducts,
  };
}
