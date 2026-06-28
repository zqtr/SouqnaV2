'use server';

import { z } from 'zod';
import * as XLSX from 'xlsx';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import { isLocale, type Locale } from '@/i18n/locales';
import { getCopy } from '@/content/copy';
import { hasDb } from '@/lib/db';
import {
  assertStorefrontOwner,
  countMerchantProducts,
  deleteDemoProducts,
  deleteProductRowWithSnapshot,
  insertProduct,
  reorderProductRows,
  updateProductRow,
  type Product,
  type ProductWriteInput,
} from '@/lib/products';
import { setProductCategories } from '@/lib/categories';
import { recordPulseActivity } from '@/lib/pulseActivity';
import { pushNotification } from '@/lib/notifications';
import { getPlan, planUnlocksMonthlyPayments } from '@/lib/billing';
import { productCapFailure } from '@/lib/planEnforcement';
import {
  DEFAULT_PRODUCT_HEIGHT_OPTIONS,
  normalizeHeightInputLabel,
  normalizeHeightOptions,
  normalizePricedOptions,
} from '@/lib/productOptions';

/**
 * All product actions share the same surface: the signed-in Clerk user must
 * own the storefront referenced by `slug`. Ownership is re-checked on every
 * call against `briefs.clerk_user_id` so a stale session can't be impersonated.
 */

const TitleSchema = z.string().trim().min(1).max(160);
const StatusSchema = z.enum(['active', 'draft', 'sold_out']);
const SlugSchema = z.string().trim().min(3).max(40);
const LocaleSchema = z.string().refine(isLocale, 'invalid locale');
const PricedOptionSchema = z.object({
  label: z.string().trim().min(1).max(40),
  priceDeltaQar: z.number().min(-999_999).max(999_999).default(0),
});
const NullablePriceSchema = z
  .union([z.number().nonnegative().max(99_999_999), z.literal(null)])
  .optional()
  .default(null);
const NullableSignedPriceSchema = z
  .union([z.number().min(-999_999).max(99_999_999), z.literal(null)])
  .optional()
  .default(null);
const OptionalTextSchema = (max: number) => z.string().trim().max(max).optional().default('');
const OptionalDateSchema = z.string().trim().max(80).optional().default('');
const StringListSchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }, z.array(z.string().trim().min(1).max(80)).max(40))
  .optional()
  .default([]);
const StringMapSchema = z
  .preprocess((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value;
  }, z.record(z.string().trim().min(1).max(60), z.string().trim().max(240)))
  .optional()
  .default({});
const PackageDimensionsSchema = z
  .object({
    lengthCm: z.number().nonnegative().max(100_000).optional().nullable(),
    widthCm: z.number().nonnegative().max(100_000).optional().nullable(),
    heightCm: z.number().nonnegative().max(100_000).optional().nullable(),
  })
  .optional()
  .default({});

const ProductFieldsSchema = z.object({
  title: TitleSchema,
  subtitle: OptionalTextSchema(240),
  description: z.string().trim().max(4000).optional().default(''),
  priceQar: NullablePriceSchema,
  compareAtPriceQar: NullablePriceSchema,
  costPerItemQar: NullablePriceSchema,
  taxable: z.boolean().optional().default(true),
  discountEligible: z.boolean().optional().default(true),
  pricingMode: z.enum(['one_time', 'monthly_payment']).optional().default('one_time'),
  monthlyPriceQar: NullablePriceSchema,
  imageUrl: z.string().trim().url().optional().or(z.literal('')).default(''),
  mediaAltText: OptionalTextSchema(180),
  // Legacy free-text label. Still accepted from older clients but the
  // canonical category data lives in `categoryIds` (see migration 011).
  category: z.string().trim().max(80).optional().default(''),
  productType: OptionalTextSchema(80),
  vendor: OptionalTextSchema(120),
  tags: StringListSchema,
  templateKey: OptionalTextSchema(80),
  badges: StringListSchema,
  handle: OptionalTextSchema(120),
  seoTitle: OptionalTextSchema(160),
  seoDescription: OptionalTextSchema(220),
  // Picker output: ids of every category linked to this product. The
  // server replaces the join rows in `setProductCategories`, which also
  // rewrites `products.category` to the first selected name so legacy
  // storefront surfaces (Menu, homepage chips) keep matching.
  categoryIds: z.array(z.string().uuid()).max(20).optional().default([]),
  eventAt: OptionalDateSchema,
  publishedAt: OptionalDateSchema,
  saleStartsAt: OptionalDateSchema,
  saleEndsAt: OptionalDateSchema,
  status: StatusSchema.default('active'),
  stock: z.number().int().min(0).max(999_999).optional().default(0),
  sku: OptionalTextSchema(80),
  barcode: OptionalTextSchema(80),
  trackInventory: z.boolean().optional().default(false),
  continueSellingWhenOutOfStock: z.boolean().optional().default(false),
  lowStockThreshold: NullableSignedPriceSchema,
  restockAt: OptionalDateSchema,
  supplierCostQar: NullablePriceSchema,
  purchaseOrderRef: OptionalTextSchema(80),
  stockStatusLabel: OptionalTextSchema(80),
  minOrderQuantity: z.number().int().min(1).max(999_999).optional().default(1),
  maxOrderQuantity: z.number().int().min(1).max(999_999).optional().nullable().default(null),
  physicalProduct: z.boolean().optional().default(true),
  weightGrams: z.number().int().min(0).max(999_999_999).optional().nullable().default(null),
  packageDimensions: PackageDimensionsSchema,
  requiresShipping: z.boolean().optional().default(true),
  freeShippingEligible: z.boolean().optional().default(false),
  countryOfOrigin: OptionalTextSchema(80),
  hsCode: OptionalTextSchema(40),
  customsDescription: OptionalTextSchema(160),
  digitalDelivery: z.boolean().optional().default(false),
  metafields: StringMapSchema,
  isCustomizable: z.boolean().optional().default(false),
  customizationLabel: z.string().trim().max(48).optional().default(''),
  requiresHeightInput: z.boolean().optional().default(false),
  heightInputLabel: z.string().trim().max(40).optional().default(''),
  heightOptions: z
    .preprocess(
      (value) => normalizeHeightOptions(value),
      z.array(z.string().trim().max(40)),
    )
    .optional()
    .default([]),
  allowCustomSize: z.boolean().optional().default(false),
  sizeOptions: z
    .preprocess(
      (value) => normalizePricedOptions(value),
      z.array(PricedOptionSchema),
    )
    .optional()
    .default([]),
  variantOptions: z
    .preprocess(
      (value) => normalizePricedOptions(value),
      z.array(PricedOptionSchema),
    )
    .optional()
    .default([]),
});

const CreateSchema = ProductFieldsSchema.extend({
  slug: SlugSchema,
  locale: LocaleSchema,
});

const UpdateSchema = CreateSchema.extend({
  id: z.string().uuid(),
});

const DeleteSchema = z.object({
  slug: SlugSchema,
  locale: LocaleSchema,
  id: z.string().uuid(),
});

const ReorderSchema = z.object({
  slug: SlugSchema,
  locale: LocaleSchema,
  orderedIds: z.array(z.string().uuid()).max(500),
});

export type CreateProductInput = z.input<typeof CreateSchema>;
export type UpdateProductInput = z.input<typeof UpdateSchema>;
export type DeleteProductInput = z.input<typeof DeleteSchema>;
export type ReorderProductsInput = z.input<typeof ReorderSchema>;

export type ProductActionState =
  | { status: 'idle' }
  | { status: 'success'; product?: Product }
  | { status: 'error'; message: string; field?: string };

const ImportRowSchema = z.object({
  title: TitleSchema,
  description: z.string().trim().max(800).optional().default(''),
  priceQar: z
    .union([z.number().nonnegative().max(99_999_999), z.literal(null)])
    .optional()
    .default(null),
  imageUrl: z.string().trim().url().optional().or(z.literal('')).default(''),
  sourceUrl: z.string().trim().url().optional().or(z.literal('')).default(''),
  category: z.string().trim().max(80).optional().default(''),
  status: StatusSchema.optional().default('active'),
});

const ImportProductsSchema = z.object({
  slug: SlugSchema,
  locale: LocaleSchema,
  rows: z.array(ImportRowSchema).min(1).max(200),
});

const ImportWebsiteSchema = z.object({
  slug: SlugSchema,
  locale: LocaleSchema,
  url: z.string().trim().url(),
});

export type ImportProductsInput = z.input<typeof ImportProductsSchema>;
export type ImportWebsiteProductsInput = z.input<typeof ImportWebsiteSchema>;

export type ProductImportState =
  | { status: 'success'; count: number }
  | { status: 'error'; message: string; field?: string };

function rateGate(scope: string, limit = 60): { ok: true } | { ok: false } {
  return { ok: rateLimit(scope, limit, 60_000).ok };
}

function dateFromInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isHandleConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const rec = err as { code?: string; message?: string; constraint?: string };
  return (
    rec.code === '23505' &&
    ((rec.constraint ?? '').includes('products_storefront_handle_unique') ||
      (rec.message ?? '').includes('products_storefront_handle_unique') ||
      (rec.message ?? '').toLowerCase().includes('duplicate key'))
  );
}

function handleConflictMessage(locale: Locale): string {
  return locale === 'ar'
    ? 'رابط المنتج مستخدم بالفعل. اختر رابطاً مختلفاً.'
    : 'This product handle is already used. Choose a different handle.';
}

function buildPayload(parsed: z.infer<typeof ProductFieldsSchema>): ProductWriteInput {
  const eventAt = dateFromInput(parsed.eventAt);
  const heightOptions = parsed.requiresHeightInput
    ? normalizeHeightOptions(parsed.heightOptions)
    : [];
  return {
    title: parsed.title,
    subtitle: parsed.subtitle ? parsed.subtitle : null,
    description: parsed.description ? parsed.description : null,
    priceQar: typeof parsed.priceQar === 'number' ? parsed.priceQar : null,
    compareAtPriceQar:
      typeof parsed.compareAtPriceQar === 'number' ? parsed.compareAtPriceQar : null,
    costPerItemQar: typeof parsed.costPerItemQar === 'number' ? parsed.costPerItemQar : null,
    taxable: parsed.taxable,
    discountEligible: parsed.discountEligible,
    pricingMode: parsed.pricingMode,
    monthlyPriceQar:
      parsed.pricingMode === 'monthly_payment' && typeof parsed.monthlyPriceQar === 'number'
        ? parsed.monthlyPriceQar
        : null,
    imageUrl: parsed.imageUrl ? parsed.imageUrl : null,
    mediaAltText: parsed.mediaAltText ? parsed.mediaAltText : null,
    category: parsed.category ? parsed.category : null,
    productType: parsed.productType ? parsed.productType : null,
    vendor: parsed.vendor ? parsed.vendor : null,
    tags: parsed.tags,
    templateKey: parsed.templateKey ? parsed.templateKey : null,
    badges: parsed.badges,
    handle: parsed.handle ? parsed.handle : null,
    seoTitle: parsed.seoTitle ? parsed.seoTitle : null,
    seoDescription: parsed.seoDescription ? parsed.seoDescription : null,
    eventAt,
    publishedAt: dateFromInput(parsed.publishedAt),
    saleStartsAt: dateFromInput(parsed.saleStartsAt),
    saleEndsAt: dateFromInput(parsed.saleEndsAt),
    status: parsed.status,
    stock: parsed.stock,
    sku: parsed.sku ? parsed.sku : null,
    barcode: parsed.barcode ? parsed.barcode : null,
    trackInventory: parsed.trackInventory,
    continueSellingWhenOutOfStock: parsed.continueSellingWhenOutOfStock,
    lowStockThreshold:
      typeof parsed.lowStockThreshold === 'number' ? parsed.lowStockThreshold : null,
    restockAt: dateFromInput(parsed.restockAt),
    supplierCostQar:
      typeof parsed.supplierCostQar === 'number' ? parsed.supplierCostQar : null,
    purchaseOrderRef: parsed.purchaseOrderRef ? parsed.purchaseOrderRef : null,
    stockStatusLabel: parsed.stockStatusLabel ? parsed.stockStatusLabel : null,
    minOrderQuantity: parsed.minOrderQuantity,
    maxOrderQuantity:
      typeof parsed.maxOrderQuantity === 'number' ? parsed.maxOrderQuantity : null,
    physicalProduct: parsed.physicalProduct,
    weightGrams: typeof parsed.weightGrams === 'number' ? parsed.weightGrams : null,
    packageDimensions: {
      lengthCm:
        typeof parsed.packageDimensions.lengthCm === 'number'
          ? parsed.packageDimensions.lengthCm
          : null,
      widthCm:
        typeof parsed.packageDimensions.widthCm === 'number'
          ? parsed.packageDimensions.widthCm
          : null,
      heightCm:
        typeof parsed.packageDimensions.heightCm === 'number'
          ? parsed.packageDimensions.heightCm
          : null,
    },
    requiresShipping: parsed.requiresShipping,
    freeShippingEligible: parsed.freeShippingEligible,
    countryOfOrigin: parsed.countryOfOrigin ? parsed.countryOfOrigin : null,
    hsCode: parsed.hsCode ? parsed.hsCode : null,
    customsDescription: parsed.customsDescription ? parsed.customsDescription : null,
    digitalDelivery: parsed.digitalDelivery,
    metafields: parsed.metafields,
    isCustomizable: parsed.isCustomizable === true,
    customizationLabel:
      parsed.isCustomizable && parsed.customizationLabel ? parsed.customizationLabel : null,
    sizeOptions: normalizePricedOptions(parsed.sizeOptions),
    allowCustomSize:
      parsed.allowCustomSize === true && normalizePricedOptions(parsed.sizeOptions).length > 0,
    variantOptions: normalizePricedOptions(parsed.variantOptions),
    requiresHeightInput: parsed.requiresHeightInput === true,
    heightInputLabel:
      parsed.requiresHeightInput && parsed.heightInputLabel
        ? normalizeHeightInputLabel(parsed.heightInputLabel)
        : null,
    heightOptions:
      parsed.requiresHeightInput && heightOptions.length > 0
        ? heightOptions
        : parsed.requiresHeightInput
          ? DEFAULT_PRODUCT_HEIGHT_OPTIONS
          : [],
  };
}

function importPayload(row: z.infer<typeof ImportRowSchema>, source: string): ProductWriteInput {
  return {
    title: row.title,
    description: row.description ? row.description : null,
    priceQar: typeof row.priceQar === 'number' ? row.priceQar : null,
    pricingMode: 'one_time',
    monthlyPriceQar: null,
    imageUrl: row.imageUrl ? row.imageUrl : null,
    category: row.category ? row.category : null,
    eventAt: null,
    status: row.status,
    isCustomizable: false,
    customizationLabel: null,
    sizeOptions: [],
    allowCustomSize: false,
    variantOptions: [],
    requiresHeightInput: false,
    heightInputLabel: null,
    heightOptions: [],
    source,
    sourceUrl: row.sourceUrl ? row.sourceUrl : null,
  };
}

function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, ' $1 ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvRecords(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function importRowsFromRecords(records: string[][]): z.infer<typeof ImportRowSchema>[] {
  const meaningful = records.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (meaningful.length < 2) return [];
  const headers = meaningful[0]!.map((cell) => normalizeImportHeader(String(cell ?? '')));
  const get = (record: string[], ...names: string[]) => {
    for (const name of names.map(normalizeImportHeader)) {
      const idx = headers.indexOf(name);
      if (idx >= 0) return String(record[idx] ?? '').trim();
    }
    return '';
  };
  const rows: z.infer<typeof ImportRowSchema>[] = [];
  for (const record of meaningful.slice(1)) {
    const title =
      get(record, 'title', 'name', 'product', 'product_name_en_update', 'product_name_en') ||
      get(record, 'product_name_ar_update', 'product_name_ar');
    if (!title) continue;
    const description =
      get(
        record,
        'description',
        'body',
        'product_description_en_update',
        'product_description_en',
      ) || get(record, 'product_description_ar_update', 'product_description_ar');
    const imageUrl = get(record, 'image_url', 'image', 'picture', 'photo');
    const sourceUrl = get(record, 'product_url', 'source_url', 'url', 'link');
    const category = get(record, 'category', 'collection', 'type');
    const priceRaw = get(record, 'price_qar', 'price', 'qar', 'amount', 'price_global_update');
    const statusRaw = get(record, 'status').toLowerCase();
    const status =
      statusRaw === 'draft' || statusRaw === 'sold_out' || statusRaw === 'active'
        ? statusRaw
        : 'active';
    const parsed = ImportRowSchema.safeParse({
      title,
      description,
      priceQar: numericPrice(priceRaw),
      imageUrl,
      sourceUrl,
      category,
      status,
    });
    if (parsed.success) rows.push(parsed.data);
  }
  return rows.slice(0, 200);
}

function importRowsFromCsv(input: string): z.infer<typeof ImportRowSchema>[] {
  return importRowsFromRecords(parseCsvRecords(input));
}

function importRowsFromWorkbook(buffer: ArrayBuffer): z.infer<typeof ImportRowSchema>[] {
  const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  const records = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  });
  return importRowsFromRecords(records);
}

function textBetween(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  return decodeHtml(match[1].trim());
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function numericPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!cleaned) return null;
  const n = Number(cleaned[0]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function absoluteUrl(value: unknown, base: string): string {
  if (typeof value !== 'string' || value.trim() === '') return '';
  try {
    return new URL(value.trim(), base).toString();
  } catch {
    return '';
  }
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  const obj = value as Record<string, unknown>;
  const graph = Array.isArray(obj['@graph']) ? flattenJsonLd(obj['@graph']) : [];
  return [obj, ...graph];
}

function isProductNode(node: Record<string, unknown>): boolean {
  const type = node['@type'];
  if (typeof type === 'string') return type.toLowerCase().includes('product');
  if (Array.isArray(type)) return type.some((t) => String(t).toLowerCase().includes('product'));
  return false;
}

function rowFromJsonLd(node: Record<string, unknown>, baseUrl: string) {
  const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  const offer = offers && typeof offers === 'object' ? (offers as Record<string, unknown>) : {};
  const imageRaw = Array.isArray(node.image) ? node.image[0] : node.image;
  return ImportRowSchema.safeParse({
    title: typeof node.name === 'string' ? node.name : '',
    description: typeof node.description === 'string' ? node.description : '',
    priceQar: numericPrice(offer.price ?? offer.lowPrice ?? node.price),
    imageUrl: absoluteUrl(imageRaw, baseUrl),
    sourceUrl: baseUrl,
    category: typeof node.category === 'string' ? node.category : '',
    status: 'active',
  });
}

async function scrapeProductPage(url: string): Promise<z.infer<typeof ImportRowSchema>[]> {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Souqna product importer (+https://souqna.qa)',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`website returned ${response.status}`);
  const html = (await response.text()).slice(0, 2_000_000);
  const rows: z.infer<typeof ImportRowSchema>[] = [];

  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const nodes = flattenJsonLd(JSON.parse(match[1] ?? 'null')).filter(isProductNode);
      for (const node of nodes) {
        const parsed = rowFromJsonLd(node, url);
        if (parsed.success) rows.push(parsed.data);
      }
    } catch {
      /* ignore invalid JSON-LD blocks */
    }
  }

  if (rows.length > 0) return rows;

  const title =
    textBetween(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
    '';
  const description =
    textBetween(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    textBetween(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    '';
  const image = textBetween(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  const price =
    textBetween(
      html,
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    ) ?? textBetween(html, /<meta[^>]+name=["']price["'][^>]+content=["']([^"']+)["']/i);

  const parsed = ImportRowSchema.safeParse({
    title,
    description,
    priceQar: numericPrice(price),
    imageUrl: absoluteUrl(image, url),
    sourceUrl: url,
    category: '',
    status: 'active',
  });
  return parsed.success ? [parsed.data] : [];
}

function productMetadata(product: Product): Record<string, unknown> {
  return {
    handle: product.handle,
    subtitle: product.subtitle,
    priceQar: product.priceQar,
    compareAtPriceQar: product.compareAtPriceQar,
    costPerItemQar: product.costPerItemQar,
    pricingMode: product.pricingMode,
    monthlyPriceQar: product.monthlyPriceQar,
    status: product.status,
    category: product.category,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    badges: product.badges,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    imageUrl: product.imageUrl,
    mediaAltText: product.mediaAltText,
    sku: product.sku,
    barcode: product.barcode,
    trackInventory: product.trackInventory,
    minOrderQuantity: product.minOrderQuantity,
    maxOrderQuantity: product.maxOrderQuantity,
    isCustomizable: product.isCustomizable,
    customizationLabel: product.customizationLabel,
    sizeOptions: product.sizeOptions,
    sizeOptionPrices: product.sizeOptionPrices,
    allowCustomSize: product.allowCustomSize,
    variantOptions: product.variantOptions,
    variantOptionPrices: product.variantOptionPrices,
    requiresHeightInput: product.requiresHeightInput,
    heightInputLabel: product.heightInputLabel,
    heightOptions: product.heightOptions,
    position: product.position,
  };
}

async function recordProductActivity(input: {
  kind: string;
  actorClerkUserId: string;
  ownerClerkUserId: string;
  storefrontSlug: string;
  product?: Product;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordPulseActivity({
    source: 'products',
    kind: input.kind,
    actorClerkUserId: input.actorClerkUserId,
    ownerClerkUserId: input.ownerClerkUserId,
    storefrontSlug: input.storefrontSlug,
    resourceType: 'product',
    resourceId: input.product?.id ?? null,
    title: input.product?.title ?? null,
    summary: input.summary,
    metadata: {
      ...(input.product ? productMetadata(input.product) : {}),
      ...(input.metadata ?? {}),
    },
  });
}

type ProductNotificationEvent =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'bulkDeleted'
  | 'duplicated'
  | 'imported'
  | 'reordered'
  | 'demoRemoved';

const PRODUCT_EVENT_COPY: Record<
  ProductNotificationEvent,
  {
    kind: string;
    title: (value: string) => string;
    titleAr: (value: string) => string;
    body: (value: string) => string;
    bodyAr: (value: string) => string;
  }
> = {
  created: {
    kind: 'product.created',
    title: (value) => `Created Product ${value}`,
    titleAr: (value) => `\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0646\u062a\u062c ${value}`,
    body: () => 'Open Products to review inventory, media, variants, and storefront visibility.',
    bodyAr: () =>
      '\u0627\u0641\u062a\u062d \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0648\u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a \u0648\u0638\u0647\u0648\u0631\u0647 \u0641\u064a \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
  updated: {
    kind: 'product.updated',
    title: (value) => `Updated Product ${value}`,
    titleAr: (value) => `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0646\u062a\u062c ${value}`,
    body: () => 'The product changes were saved and the storefront was refreshed.',
    bodyAr: () =>
      '\u062a\u0645 \u062d\u0641\u0638 \u062a\u0639\u062f\u064a\u0644\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c \u0648\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
  deleted: {
    kind: 'product.deleted',
    title: (value) => `Deleted Product ${value}`,
    titleAr: (value) => `\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u062a\u062c ${value}`,
    body: () => 'The product was removed from the catalogue and storefront surfaces.',
    bodyAr: () =>
      '\u062a\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0646\u062a\u062c \u0645\u0646 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c \u0648\u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
  bulkDeleted: {
    kind: 'product.deleted',
    title: (value) => `Deleted Products ${value}`,
    titleAr: (value) => `\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a ${value}`,
    body: () => 'The selected products were removed from the catalogue and storefront surfaces.',
    bodyAr: () =>
      '\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u0645\u0646 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c \u0648\u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
  duplicated: {
    kind: 'product.duplicated',
    title: (value) => `Duplicated Product ${value}`,
    titleAr: (value) => `\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0645\u0646\u062a\u062c ${value}`,
    body: () => 'The duplicate is saved as a draft so it can be reviewed before publishing.',
    bodyAr: () =>
      '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0646\u0633\u062e\u0629 \u0643\u0645\u0633\u0648\u062f\u0629 \u0644\u0645\u0631\u0627\u062c\u0639\u062a\u0647\u0627 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631.',
  },
  imported: {
    kind: 'product.imported',
    title: (value) => `Imported Products ${value}`,
    titleAr: (value) => `\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a ${value}`,
    body: () => 'Imported products were added to the catalogue.',
    bodyAr: () =>
      '\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0648\u0631\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c.',
  },
  reordered: {
    kind: 'product.reordered',
    title: (value) => `Reordered Products ${value}`,
    titleAr: (value) => `\u062a\u0645 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a ${value}`,
    body: () => 'The catalogue order was updated for storefront product sections.',
    bodyAr: () =>
      '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c \u0641\u064a \u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
  demoRemoved: {
    kind: 'products.demo.removed',
    title: (value) => `Removed Sample Products ${value}`,
    titleAr: (value) => `\u062a\u0645 \u062d\u0630\u0641 \u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0639\u064a\u0646\u0629 ${value}`,
    body: () => 'Sample products were cleared from this storefront.',
    bodyAr: () =>
      '\u062a\u0645 \u062d\u0630\u0641 \u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0639\u064a\u0646\u0629 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u062c\u0631.',
  },
};

async function pushProductEventNotification(input: {
  userId: string;
  slug: string;
  event: ProductNotificationEvent;
  product?: Product;
  count?: number;
  dedupeKey: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const copy = PRODUCT_EVENT_COPY[input.event];
  const value = input.product?.title ?? `${input.count ?? 0}`;
  await pushNotification({
    userId: input.userId,
    kind: copy.kind,
    title: copy.title(value),
    titleAr: copy.titleAr(value),
    body: copy.body(value),
    bodyAr: copy.bodyAr(value),
    href: `/account/products?store=${encodeURIComponent(input.slug)}`,
    meta: {
      dedupeKey: input.dedupeKey,
      slug: input.slug,
      productId: input.product?.id ?? null,
      productTitle: input.product?.title ?? null,
      count: input.count ?? null,
      ...(input.meta ?? {}),
    },
  });
}

async function gate(slug: string) {
  if (!hasDb()) return null;
  const { userId } = await auth();
  return assertStorefrontOwner(slug, userId);
}

async function gateProductCap(
  slug: string,
  ownerClerkUserId: string,
  incomingCount: number,
): Promise<{ status: 'error'; message: string; field?: string } | null> {
  const plan = await getPlan(ownerClerkUserId);
  const existing = await countMerchantProducts(slug);
  return productCapFailure(plan, existing, incomingCount);
}

export async function createProduct(input: CreateProductInput): Promise<ProductActionState> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    const locale = isLocale(input.locale) ? (input.locale as Locale) : 'en';
    const t = getCopy(locale).products.form;
    const titleErr = parsed.error.flatten().fieldErrors.title;
    if (titleErr?.length) {
      return { status: 'error', message: t.error.titleRequired, field: 'title' };
    }
    return { status: 'error', message: t.error.generic };
  }
  const data = parsed.data;
  const t = getCopy(data.locale as Locale).products.form;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-create:${ip}`).ok) {
    return { status: 'error', message: t.error.generic };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  const plan = await getPlan(owner.clerkUserId);
  const capError = await gateProductCap(data.slug, owner.clerkUserId, 1);
  if (capError) return capError;
  if (data.pricingMode === 'monthly_payment' && !planUnlocksMonthlyPayments(plan)) {
    return {
      status: 'error',
      message: 'Monthly-payment pricing is available on Max+.',
      field: 'pricingMode',
    };
  }

  try {
    const product = await insertProduct(data.slug, buildPayload(data));
    // Always rewrite the join rows; this also keeps the legacy
    // `products.category` text column in sync (= first selected name
    // or null when the picker is empty).
    await setProductCategories(data.slug, product.id, data.categoryIds ?? []);
    await recordProductActivity({
      kind: 'product.created',
      actorClerkUserId: owner.clerkUserId,
      ownerClerkUserId: owner.clerkUserId,
      storefrontSlug: data.slug,
      product,
      summary: `Created product ${product.title}`,
      metadata: { categoryIds: data.categoryIds ?? [] },
    });
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'created',
      product,
      dedupeKey: `product-created-${product.id}`,
      meta: { categoryIds: data.categoryIds ?? [] },
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success', product };
  } catch (err) {
    console.error('[createProduct] insert failed', err);
    if (isHandleConflict(err)) {
      return {
        status: 'error',
        message: handleConflictMessage(data.locale as Locale),
        field: 'handle',
      };
    }
    return { status: 'error', message: t.error.generic };
  }
}

export async function updateProduct(input: UpdateProductInput): Promise<ProductActionState> {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    const locale = isLocale(input.locale) ? (input.locale as Locale) : 'en';
    const t = getCopy(locale).products.form;
    const titleErr = parsed.error.flatten().fieldErrors.title;
    if (titleErr?.length) {
      return { status: 'error', message: t.error.titleRequired, field: 'title' };
    }
    return { status: 'error', message: t.error.generic };
  }
  const data = parsed.data;
  const t = getCopy(data.locale as Locale).products.form;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-update:${ip}`).ok) {
    return { status: 'error', message: t.error.generic };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  const plan = await getPlan(owner.clerkUserId);
  if (data.pricingMode === 'monthly_payment' && !planUnlocksMonthlyPayments(plan)) {
    return {
      status: 'error',
      message: 'Monthly-payment pricing is available on Max+.',
      field: 'pricingMode',
    };
  }

  try {
    const product = await updateProductRow(data.slug, data.id, buildPayload(data));
    if (!product) return { status: 'error', message: t.error.generic };
    // Always rewrite the join rows: an empty array clears categories.
    await setProductCategories(data.slug, product.id, data.categoryIds ?? []);
    await recordProductActivity({
      kind: 'product.updated',
      actorClerkUserId: owner.clerkUserId,
      ownerClerkUserId: owner.clerkUserId,
      storefrontSlug: data.slug,
      product,
      summary: `Updated product ${product.title}`,
      metadata: { categoryIds: data.categoryIds ?? [] },
    });
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'updated',
      product,
      dedupeKey: `product-updated-${product.id}-${product.updatedAt.toISOString()}`,
      meta: { categoryIds: data.categoryIds ?? [] },
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success', product };
  } catch (err) {
    console.error('[updateProduct] update failed', err);
    if (isHandleConflict(err)) {
      return {
        status: 'error',
        message: handleConflictMessage(data.locale as Locale),
        field: 'handle',
      };
    }
    return { status: 'error', message: t.error.generic };
  }
}

export async function deleteProduct(input: DeleteProductInput): Promise<ProductActionState> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) {
    const locale = isLocale(input.locale) ? (input.locale as Locale) : 'en';
    return { status: 'error', message: getCopy(locale).products.form.error.generic };
  }
  const data = parsed.data;
  const t = getCopy(data.locale as Locale).products.form;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-delete:${ip}`, 30).ok) {
    return { status: 'error', message: t.error.generic };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    const product = await deleteProductRowWithSnapshot(data.slug, data.id);
    if (!product) return { status: 'error', message: t.error.generic };
    await recordProductActivity({
      kind: 'product.deleted',
      actorClerkUserId: owner.clerkUserId,
      ownerClerkUserId: owner.clerkUserId,
      storefrontSlug: data.slug,
      product,
      summary: `Deleted product ${product.title}`,
    });
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'deleted',
      product,
      dedupeKey: `product-deleted-${product.id}-${Date.now()}`,
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success' };
  } catch (err) {
    console.error('[deleteProduct] delete failed', err);
    return { status: 'error', message: t.error.generic };
  }
}

const DuplicateSchema = z.object({
  slug: SlugSchema,
  id: z.string().uuid(),
});

export type DuplicateProductInput = z.input<typeof DuplicateSchema>;

/**
 * Clone an existing product into the same storefront. The duplicate is
 * appended to the end of the catalogue with a `(copy)` title suffix and
 * `status = 'draft'` so it never accidentally surfaces on the live
 * storefront before the founder has reviewed it.
 *
 * Re-uses `getProduct` + `insertProduct` so the new row picks up a fresh
 * id, position, and timestamps without us having to write a CTE.
 */
export async function duplicateProduct(input: DuplicateProductInput): Promise<ProductActionState> {
  const parsed = DuplicateSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request.' };
  const { slug, id } = parsed.data;
  const owner = await gate(slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  const { getProduct } = await import('@/lib/products');
  const source = await getProduct(slug, id);
  if (!source) return { status: 'error', message: 'Product not found.' };
  const capError = await gateProductCap(slug, owner.clerkUserId, 1);
  if (capError) return capError;

  try {
    const dup = await insertProduct(slug, {
      title: `${source.title} (copy)`,
      subtitle: source.subtitle,
      description: source.description,
      priceQar: source.priceQar,
      compareAtPriceQar: source.compareAtPriceQar,
      costPerItemQar: source.costPerItemQar,
      taxable: source.taxable,
      discountEligible: source.discountEligible,
      pricingMode: source.pricingMode,
      monthlyPriceQar: source.monthlyPriceQar,
      imageUrl: source.imageUrl,
      mediaAltText: source.mediaAltText,
      category: source.category,
      productType: source.productType,
      vendor: source.vendor,
      tags: source.tags,
      templateKey: source.templateKey,
      badges: source.badges,
      handle: null,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      eventAt: source.eventAt,
      publishedAt: null,
      saleStartsAt: source.saleStartsAt,
      saleEndsAt: source.saleEndsAt,
      status: 'draft',
      stock: source.stock,
      sku: source.sku,
      barcode: source.barcode,
      trackInventory: source.trackInventory,
      continueSellingWhenOutOfStock: source.continueSellingWhenOutOfStock,
      lowStockThreshold: source.lowStockThreshold,
      restockAt: source.restockAt,
      supplierCostQar: source.supplierCostQar,
      purchaseOrderRef: source.purchaseOrderRef,
      stockStatusLabel: source.stockStatusLabel,
      minOrderQuantity: source.minOrderQuantity,
      maxOrderQuantity: source.maxOrderQuantity,
      physicalProduct: source.physicalProduct,
      weightGrams: source.weightGrams,
      packageDimensions: source.packageDimensions,
      requiresShipping: source.requiresShipping,
      freeShippingEligible: source.freeShippingEligible,
      countryOfOrigin: source.countryOfOrigin,
      hsCode: source.hsCode,
      customsDescription: source.customsDescription,
      digitalDelivery: source.digitalDelivery,
      metafields: source.metafields,
      isCustomizable: source.isCustomizable,
      customizationLabel: source.customizationLabel,
      sizeOptions: source.sizeOptionPrices,
      allowCustomSize: source.allowCustomSize,
      variantOptions: source.variantOptionPrices,
      requiresHeightInput: source.requiresHeightInput,
      heightInputLabel: source.heightInputLabel,
      heightOptions: source.heightOptions,
    });
    await recordProductActivity({
      kind: 'product.duplicated',
      actorClerkUserId: owner.clerkUserId,
      ownerClerkUserId: owner.clerkUserId,
      storefrontSlug: slug,
      product: dup,
      summary: `Duplicated product ${source.title}`,
      metadata: { sourceProductId: source.id },
    });
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug,
      event: 'duplicated',
      product: dup,
      dedupeKey: `product-duplicated-${dup.id}`,
      meta: { sourceProductId: source.id },
    });
    revalidatePath('/account/products');
    revalidatePath(`/brief/${slug}`);
    return { status: 'success', product: dup };
  } catch (err) {
    console.error('[duplicateProduct] failed', err);
    return { status: 'error', message: 'Duplicate failed.' };
  }
}

const BulkDeleteSchema = z.object({
  slug: SlugSchema,
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export type BulkDeleteInput = z.input<typeof BulkDeleteSchema>;

export async function bulkDeleteProducts(
  input: BulkDeleteInput,
): Promise<{ status: 'success'; deleted: number } | { status: 'error'; message: string }> {
  const parsed = BulkDeleteSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Invalid request.' };
  const { slug, ids } = parsed.data;
  const owner = await gate(slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  let deleted = 0;
  for (const id of ids) {
    const product = await deleteProductRowWithSnapshot(slug, id);
    if (product) {
      deleted++;
      await recordProductActivity({
        kind: 'product.deleted',
        actorClerkUserId: owner.clerkUserId,
        ownerClerkUserId: owner.clerkUserId,
        storefrontSlug: slug,
        product,
        summary: `Deleted product ${product.title}`,
        metadata: { bulk: true },
      });
    }
  }
  if (deleted > 0) {
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug,
      event: 'bulkDeleted',
      count: deleted,
      dedupeKey: `products-bulk-deleted-${slug}-${Date.now()}`,
      meta: { bulk: true, ids },
    });
  }
  revalidatePath('/account/products');
  revalidatePath(`/brief/${slug}`);
  return { status: 'success', deleted };
}

export async function importProducts(input: ImportProductsInput): Promise<ProductImportState> {
  const parsed = ImportProductsSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Check the CSV columns and try again.', field: 'csv' };
  }
  const data = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-import:${ip}`, 12).ok) {
    return { status: 'error', message: 'Too many imports. Try again in a moment.' };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };
  const capError = await gateProductCap(data.slug, owner.clerkUserId, data.rows.length);
  if (capError) return { status: 'error', message: capError.message, field: 'csv' };

  try {
    let count = 0;
    for (const row of data.rows) {
      const product = await insertProduct(data.slug, importPayload(row, 'csv_import'));
      count++;
      await recordProductActivity({
        kind: 'product.imported',
        actorClerkUserId: owner.clerkUserId,
        ownerClerkUserId: owner.clerkUserId,
        storefrontSlug: data.slug,
        product,
        summary: `Imported product ${product.title}`,
        metadata: { source: 'csv_import' },
      });
    }
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'imported',
      count,
      dedupeKey: `products-imported-csv-${data.slug}-${Date.now()}`,
      meta: { source: 'csv_import' },
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success', count };
  } catch (err) {
    console.error('[importProducts] failed', err);
    return { status: 'error', message: 'Could not import products. Check URLs and prices.' };
  }
}

export async function importProductsFile(formData: FormData): Promise<ProductImportState> {
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? '');
  const file = formData.get('file');
  const parsed = z.object({ slug: SlugSchema, locale: LocaleSchema }).safeParse({ slug, locale });
  if (!parsed.success || !(file instanceof File)) {
    return { status: 'error', message: 'Choose a CSV or XLSX product file.', field: 'file' };
  }
  if (file.size > 5_000_000) {
    return {
      status: 'error',
      message: 'File is too large. Keep imports under 5 MB.',
      field: 'file',
    };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-file-import:${ip}`, 12).ok) {
    return { status: 'error', message: 'Too many imports. Try again in a moment.' };
  }

  const owner = await gate(parsed.data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    const name = file.name.toLowerCase();
    const rows =
      name.endsWith('.xlsx') || name.endsWith('.xls')
        ? importRowsFromWorkbook(await file.arrayBuffer())
        : importRowsFromCsv(await file.text());
    if (rows.length === 0) {
      return {
        status: 'error',
        message:
          'No products found. Use title/name or Product Name (En)(Update), plus price/image columns.',
        field: 'file',
      };
    }
    const capError = await gateProductCap(parsed.data.slug, owner.clerkUserId, rows.length);
    if (capError) return { status: 'error', message: capError.message, field: 'file' };

    let count = 0;
    for (const row of rows) {
      const product = await insertProduct(parsed.data.slug, importPayload(row, 'file_import'));
      count++;
      await recordProductActivity({
        kind: 'product.imported',
        actorClerkUserId: owner.clerkUserId,
        ownerClerkUserId: owner.clerkUserId,
        storefrontSlug: parsed.data.slug,
        product,
        summary: `Imported product ${product.title}`,
        metadata: { source: 'file_import', fileName: file.name },
      });
    }
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: parsed.data.slug,
      event: 'imported',
      count,
      dedupeKey: `products-imported-file-${parsed.data.slug}-${Date.now()}`,
      meta: { source: 'file_import', fileName: file.name },
    });
    revalidatePath(`/brief/${parsed.data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${parsed.data.slug}/preview`);
    return { status: 'success', count };
  } catch (err) {
    console.error('[importProductsFile] failed', err);
    return { status: 'error', message: 'Could not import that file. Check the workbook format.' };
  }
}

export async function importProductsFromWebsite(
  input: ImportWebsiteProductsInput,
): Promise<ProductImportState> {
  const parsed = ImportWebsiteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid public product URL.', field: 'url' };
  }
  const data = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-website-import:${ip}`, 10).ok) {
    return { status: 'error', message: 'Too many website scans. Try again in a moment.' };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    const scraped = await scrapeProductPage(data.url);
    if (!scraped.length) {
      return {
        status: 'error',
        message:
          'No product data found. Try a direct product page, or use CSV with title, price, image_url.',
        field: 'url',
      };
    }
    const rowsToImport = scraped.slice(0, 30);
    const capError = await gateProductCap(data.slug, owner.clerkUserId, rowsToImport.length);
    if (capError) return { status: 'error', message: capError.message, field: 'url' };
    let count = 0;
    for (const row of rowsToImport) {
      const product = await insertProduct(data.slug, importPayload(row, 'website_import'));
      count++;
      await recordProductActivity({
        kind: 'product.imported',
        actorClerkUserId: owner.clerkUserId,
        ownerClerkUserId: owner.clerkUserId,
        storefrontSlug: data.slug,
        product,
        summary: `Imported product ${product.title}`,
        metadata: { source: 'website_import', url: data.url },
      });
    }
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'imported',
      count,
      dedupeKey: `products-imported-website-${data.slug}-${Date.now()}`,
      meta: { source: 'website_import', url: data.url },
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success', count };
  } catch (err) {
    console.error('[importProductsFromWebsite] failed', err);
    return { status: 'error', message: 'Could not read that website. Try CSV instead.' };
  }
}

export async function reorderProducts(input: ReorderProductsInput): Promise<ProductActionState> {
  const parsed = ReorderSchema.safeParse(input);
  if (!parsed.success) {
    const locale = isLocale(input.locale) ? (input.locale as Locale) : 'en';
    return { status: 'error', message: getCopy(locale).products.form.error.generic };
  }
  const data = parsed.data;
  const t = getCopy(data.locale as Locale).products.form;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-reorder:${ip}`, 60).ok) {
    return { status: 'error', message: t.error.generic };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    await reorderProductRows(data.slug, data.orderedIds);
    await recordProductActivity({
      kind: 'product.reordered',
      actorClerkUserId: owner.clerkUserId,
      ownerClerkUserId: owner.clerkUserId,
      storefrontSlug: data.slug,
      summary: `Reordered ${data.orderedIds.length} products`,
      metadata: { count: data.orderedIds.length },
    });
    await pushProductEventNotification({
      userId: owner.clerkUserId,
      slug: data.slug,
      event: 'reordered',
      count: data.orderedIds.length,
      dedupeKey: `products-reordered-${data.slug}-${Date.now()}`,
      meta: { count: data.orderedIds.length },
    });
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success' };
  } catch (err) {
    console.error('[reorderProducts] reorder failed', err);
    return { status: 'error', message: t.error.generic };
  }
}

const RemoveDemoSchema = z.object({
  slug: SlugSchema,
});

export type RemoveDemoProductsInput = z.input<typeof RemoveDemoSchema>;

/**
 * Bulk-clear demo product rows seeded by `seedTemplateDemoProducts`.
 * Surfaces as a single "Remove all demo products" button on the
 * /account/products page. Records one summary activity row, not one
 * per deletion, so the audit feed stays readable.
 *
 * Idempotent: when no demo rows exist, returns success with `count: 0`.
 * Real (merchant-authored) products are never touched — the SQL only
 * matches `is_demo = true`.
 */
export async function removeDemoProducts(
  input: RemoveDemoProductsInput,
): Promise<ProductActionState & { count?: number }> {
  const parsed = RemoveDemoSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: 'Invalid request.' };
  }
  const data = parsed.data;

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateGate(`product-demo-clear:${ip}`, 10).ok) {
    return { status: 'error', message: 'Try again in a moment.' };
  }

  const owner = await gate(data.slug);
  if (!owner) return { status: 'error', message: 'Forbidden' };

  try {
    const removedIds = await deleteDemoProducts(data.slug);
    if (removedIds.length > 0) {
      await recordProductActivity({
        kind: 'products.demo.removed',
        actorClerkUserId: owner.clerkUserId,
        ownerClerkUserId: owner.clerkUserId,
        storefrontSlug: data.slug,
        summary: `Removed ${removedIds.length} sample products`,
        metadata: { count: removedIds.length, ids: removedIds },
      });
      await pushProductEventNotification({
        userId: owner.clerkUserId,
        slug: data.slug,
        event: 'demoRemoved',
        count: removedIds.length,
        dedupeKey: `products-demo-removed-${data.slug}-${Date.now()}`,
        meta: { ids: removedIds },
      });
    }
    revalidatePath(`/brief/${data.slug}`);
    revalidatePath('/account');
    revalidatePath('/account/products');
    revalidatePath(`/account/${data.slug}/preview`);
    return { status: 'success', count: removedIds.length };
  } catch (err) {
    console.error('[removeDemoProducts] delete failed', err);
    return { status: 'error', message: 'Could not remove sample products. Try again.' };
  }
}
