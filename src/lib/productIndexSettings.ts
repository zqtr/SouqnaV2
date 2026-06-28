export type ProductIndexLayout = 'grid' | 'compact' | 'editorial';
export type ProductIndexSort = 'manual' | 'newest' | 'price_asc' | 'price_desc' | 'name';
export type ProductIndexAvailability = 'all' | 'available' | 'sold_out';

export const PRODUCT_INDEX_LAYOUTS = ['grid', 'compact', 'editorial'] as const satisfies readonly ProductIndexLayout[];
export const PRODUCT_INDEX_SORTS = ['manual', 'newest', 'price_asc', 'price_desc', 'name'] as const satisfies readonly ProductIndexSort[];
export const PRODUCT_INDEX_AVAILABILITY = ['all', 'available', 'sold_out'] as const satisfies readonly ProductIndexAvailability[];

export type ProductIndexSettings = {
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  layout: ProductIndexLayout;
  showSearch: boolean;
  showCategoryFilters: boolean;
  showPriceFilter: boolean;
  showAvailabilityFilter: boolean;
  visibleCategorySlugs: string[];
  hiddenProductIds: string[];
  defaultSort: ProductIndexSort;
  defaultAvailability: ProductIndexAvailability;
};

export const DEFAULT_PRODUCT_INDEX_SETTINGS: ProductIndexSettings = {
  enabled: true,
  title: null,
  subtitle: null,
  layout: 'grid',
  showSearch: true,
  showCategoryFilters: true,
  showPriceFilter: true,
  showAvailabilityFilter: true,
  visibleCategorySlugs: [],
  hiddenProductIds: [],
  defaultSort: 'manual',
  defaultAvailability: 'all',
};

const LAYOUTS = new Set<string>(PRODUCT_INDEX_LAYOUTS);
const SORTS = new Set<string>(PRODUCT_INDEX_SORTS);
const AVAILABILITY = new Set<string>(PRODUCT_INDEX_AVAILABILITY);

export function parseProductIndexSettings(value: unknown): ProductIndexSettings {
  const obj =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    enabled: obj.enabled === false ? false : DEFAULT_PRODUCT_INDEX_SETTINGS.enabled,
    title: normalizeText(obj.title, 120),
    subtitle: normalizeText(obj.subtitle, 260),
    layout:
      typeof obj.layout === 'string' && LAYOUTS.has(obj.layout)
        ? (obj.layout as ProductIndexLayout)
        : DEFAULT_PRODUCT_INDEX_SETTINGS.layout,
    showSearch: obj.showSearch === false ? false : DEFAULT_PRODUCT_INDEX_SETTINGS.showSearch,
    showCategoryFilters:
      obj.showCategoryFilters === false
        ? false
        : DEFAULT_PRODUCT_INDEX_SETTINGS.showCategoryFilters,
    showPriceFilter:
      obj.showPriceFilter === false ? false : DEFAULT_PRODUCT_INDEX_SETTINGS.showPriceFilter,
    showAvailabilityFilter:
      obj.showAvailabilityFilter === false
        ? false
        : DEFAULT_PRODUCT_INDEX_SETTINGS.showAvailabilityFilter,
    visibleCategorySlugs: normalizeSlugList(obj.visibleCategorySlugs, 80),
    hiddenProductIds: normalizeIdList(obj.hiddenProductIds, 600),
    defaultSort:
      typeof obj.defaultSort === 'string' && SORTS.has(obj.defaultSort)
        ? (obj.defaultSort as ProductIndexSort)
        : DEFAULT_PRODUCT_INDEX_SETTINGS.defaultSort,
    defaultAvailability:
      typeof obj.defaultAvailability === 'string' && AVAILABILITY.has(obj.defaultAvailability)
        ? (obj.defaultAvailability as ProductIndexAvailability)
        : DEFAULT_PRODUCT_INDEX_SETTINGS.defaultAvailability,
  };
}

export function normalizeProductIndexSettings(
  value: ProductIndexSettings,
): ProductIndexSettings {
  return parseProductIndexSettings(value);
}

export function fallbackCategorySlug(label: string): string {
  const ascii = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'category';
}

function normalizeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return trimmed || null;
}

function normalizeSlugList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const slug = item.trim().slice(0, 120);
    if (!slug || out.includes(slug)) continue;
    out.push(slug);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeIdList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim().slice(0, 80);
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}
