import { optionPriceDeltaFor } from '@/lib/productOptions';

export type CommerceProductSourceKind = 'all' | 'manual' | 'category' | 'tag' | 'latest';
export type CommerceProductSort = 'manual' | 'newest' | 'price_low' | 'price_high' | 'title_az';

export type CommerceProductSource = {
  source: CommerceProductSourceKind;
  productIds?: string[];
  category?: string | null;
  tag?: string | null;
  limit?: number;
  sort?: CommerceProductSort;
  hideUnavailable?: boolean;
};

export type CommerceProductLike = {
  id: string;
  title: string;
  category?: string | null;
  priceQar?: number | null;
  status?: string | null;
  stock?: number | null;
  createdAt?: string | Date | null;
  [key: string]: unknown;
};

export type CommerceFilterGroupSource =
  | 'category'
  | 'brand'
  | 'tag'
  | 'price'
  | 'availability'
  | 'manual';

export type CommerceFilterOption = {
  id: string;
  labelEn?: string;
  labelAr?: string;
  value?: string;
  productIds?: string[];
  category?: string | null;
  tag?: string | null;
};

export type CommerceFilterGroup = {
  id: string;
  labelEn?: string;
  labelAr?: string;
  source: CommerceFilterGroupSource;
  autoGenerate?: boolean;
  options?: CommerceFilterOption[];
};

export type CommerceTab = {
  id: string;
  labelEn?: string;
  labelAr?: string;
  value?: string;
  productSource?: CommerceProductSource;
};

export type TaqimCartProduct = {
  productId: string;
  title: string;
  priceQar: number;
  imageUrl?: string | null;
  variantLabel?: string | null;
  sizeOptionPrices?: unknown;
};

export type TaqimBundleItemInput = {
  productId: string;
  required?: boolean;
  selected?: boolean;
  defaultOptionValue?: string | null;
};

const DEFAULT_SOURCE: CommerceProductSource = {
  source: 'all',
  productIds: [],
  category: null,
  tag: null,
  limit: 8,
  sort: 'manual',
  hideUnavailable: true,
};

export function normalizeCommerceProductSource(
  value: unknown,
  legacyProductIds: string[] = [],
): CommerceProductSource {
  const input = isRecord(value) ? value : {};
  const source = parseSourceKind(input.source, legacyProductIds.length > 0 ? 'manual' : 'all');
  const productIds = normalizeIdArray(input.productIds ?? legacyProductIds);
  return {
    source,
    productIds,
    category: normalizeNullableString(input.category),
    tag: normalizeNullableString(input.tag),
    limit: normalizeLimit(input.limit, DEFAULT_SOURCE.limit!),
    sort: parseSort(input.sort, source === 'latest' ? 'newest' : DEFAULT_SOURCE.sort!),
    hideUnavailable:
      typeof input.hideUnavailable === 'boolean'
        ? input.hideUnavailable
        : DEFAULT_SOURCE.hideUnavailable,
  };
}

export function resolveCommerceProductSource<T extends CommerceProductLike>(
  products: T[],
  sourceInput: unknown,
  legacyProductIds: string[] = [],
): T[] {
  const source = normalizeCommerceProductSource(sourceInput, legacyProductIds);
  const byId = new Map(products.map((product) => [product.id, product]));
  let selected: T[];

  switch (source.source) {
    case 'manual':
      selected = (source.productIds ?? [])
        .map((id) => byId.get(id))
        .filter((product): product is T => Boolean(product));
      break;
    case 'category':
      selected = products.filter((product) => sameToken(product.category, source.category));
      break;
    case 'tag':
      selected = products.filter((product) => productHasTag(product, source.tag));
      break;
    case 'latest':
      selected = [...products].sort(compareNewest);
      break;
    case 'all':
    default:
      selected = [...products];
      break;
  }

  if (source.hideUnavailable) {
    selected = selected.filter(isAvailableProduct);
  }

  selected = sortCommerceProducts(selected, source.sort ?? 'manual', source.productIds ?? []);
  return selected.slice(0, source.limit ?? DEFAULT_SOURCE.limit);
}

export function sortCommerceProducts<T extends CommerceProductLike>(
  products: T[],
  sort: CommerceProductSort,
  manualIds: string[] = [],
): T[] {
  const manualIndex = new Map(manualIds.map((id, index) => [id, index]));
  const next = [...products];
  switch (sort) {
    case 'newest':
      return next.sort(compareNewest);
    case 'price_low':
      return next.sort((a, b) => priceValue(a) - priceValue(b));
    case 'price_high':
      return next.sort((a, b) => priceValue(b) - priceValue(a));
    case 'title_az':
      return next.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'manual':
    default:
      if (manualIndex.size === 0) return next;
      return next.sort((a, b) => (manualIndex.get(a.id) ?? 9999) - (manualIndex.get(b.id) ?? 9999));
  }
}

export function resolveCommerceTabs<T extends CommerceProductLike>(
  products: T[],
  tabs: CommerceTab[],
  allMode: 'combined_tabs' | 'all_products' | 'manual' = 'combined_tabs',
  allProductIds: string[] = [],
): Array<CommerceTab & { productIds: string[] }> {
  const resolved = tabs.map((tab) => ({
    ...tab,
    productIds: resolveCommerceProductSource(products, tab.productSource).map((product) => product.id),
  }));

  if (allMode === 'all_products') {
    return [{ id: 'all', labelEn: 'All', labelAr: 'الكل', productIds: products.map((p) => p.id) }, ...resolved];
  }
  if (allMode === 'manual') {
    return [{ id: 'all', labelEn: 'All', labelAr: 'الكل', productIds: allProductIds }, ...resolved];
  }

  const combined = Array.from(new Set(resolved.flatMap((tab) => tab.productIds)));
  return [{ id: 'all', labelEn: 'All', labelAr: 'الكل', productIds: combined }, ...resolved];
}

export function resolveFilterOptionProductIds<T extends CommerceProductLike>(
  products: T[],
  group: CommerceFilterGroup,
  option: CommerceFilterOption,
): string[] {
  if (group.source === 'manual') {
    return normalizeIdArray(option.productIds);
  }
  if (group.source === 'category') {
    const category = option.category ?? option.value;
    return products.filter((product) => sameToken(product.category, category)).map((p) => p.id);
  }
  if (group.source === 'tag') {
    const tag = option.tag ?? option.value;
    return products.filter((product) => productHasTag(product, tag)).map((p) => p.id);
  }
  if (group.source === 'brand') {
    const brand = option.value;
    return products.filter((product) => sameToken(String(product.brand ?? ''), brand)).map((p) => p.id);
  }
  if (group.source === 'availability') {
    const wantsAvailable = (option.value ?? '').toLowerCase() !== 'sold_out';
    return products
      .filter((product) => (wantsAvailable ? isAvailableProduct(product) : !isAvailableProduct(product)))
      .map((p) => p.id);
  }
  if (group.source === 'price') {
    return products.filter((product) => matchesPriceOption(product, option.value)).map((p) => p.id);
  }
  return [];
}

export function buildTaqimCartItems(
  products: TaqimCartProduct[],
  items: TaqimBundleItemInput[],
  mode: 'add_all' | 'add_selected' = 'add_all',
): TaqimCartProduct[] {
  const byId = new Map(products.map((product) => [product.productId, product]));
  const cartItems: TaqimCartProduct[] = [];
  for (const item of items) {
    if (mode !== 'add_all' && !item.required && !item.selected) continue;
    const product = byId.get(item.productId);
    if (!product) continue;
    const variantLabel = item.defaultOptionValue?.trim() || product.variantLabel || null;
    const priceDelta = optionPriceDeltaFor(product.sizeOptionPrices, variantLabel);
    cartItems.push({
      ...product,
      priceQar: Math.max(0, Math.round(product.priceQar + priceDelta)),
      variantLabel,
    });
  }
  return cartItems;
}

function compareNewest(a: CommerceProductLike, b: CommerceProductLike) {
  return dateValue(b.createdAt) - dateValue(a.createdAt);
}

function priceValue(product: CommerceProductLike) {
  return typeof product.priceQar === 'number' ? product.priceQar : Number.POSITIVE_INFINITY;
}

function dateValue(value: CommerceProductLike['createdAt']) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function isAvailableProduct(product: CommerceProductLike) {
  if (product.status === 'draft' || product.status === 'sold_out') return false;
  if (typeof product.stock === 'number' && product.stock <= 0) return false;
  return true;
}

function matchesPriceOption(product: CommerceProductLike, raw: string | undefined) {
  if (typeof product.priceQar !== 'number') return false;
  const value = (raw ?? '').toLowerCase();
  if (value === 'under_100') return product.priceQar < 100;
  if (value === '100_250') return product.priceQar >= 100 && product.priceQar <= 250;
  if (value === '250_plus') return product.priceQar > 250;
  const [minRaw, maxRaw] = value.split('-');
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (Number.isFinite(min) && Number.isFinite(max)) return product.priceQar >= min && product.priceQar <= max;
  return false;
}

function productHasTag(product: CommerceProductLike, tag: string | null | undefined) {
  const wanted = normalizeToken(tag);
  if (!wanted) return false;
  const tags = [
    product.tag,
    product.collection,
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.collections) ? product.collections : []),
  ];
  return tags.some((value) => normalizeToken(String(value ?? '')) === wanted);
}

function sameToken(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizeToken(left);
  const b = normalizeToken(right);
  return Boolean(a && b && a === b);
}

function normalizeToken(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeLimit(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(48, Math.floor(value)))
    : fallback;
}

function normalizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)),
  );
}

function parseSourceKind(value: unknown, fallback: CommerceProductSourceKind): CommerceProductSourceKind {
  return value === 'all' ||
    value === 'manual' ||
    value === 'category' ||
    value === 'tag' ||
    value === 'latest'
    ? value
    : fallback;
}

function parseSort(value: unknown, fallback: CommerceProductSort): CommerceProductSort {
  return value === 'manual' ||
    value === 'newest' ||
    value === 'price_low' ||
    value === 'price_high' ||
    value === 'title_az'
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
