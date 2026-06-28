'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { ArrowRight, Check, Search, SlidersHorizontal } from 'lucide-react';
import {
  resolveCommerceProductSource,
  resolveCommerceTabs,
  resolveFilterOptionProductIds,
  type CommerceFilterGroup,
  type CommerceFilterOption,
  type CommerceProductLike,
  type CommerceProductSource,
} from '@/lib/blocks/commerce';
import type {
  CommerceCardConfig,
  EcommerceBlockProps,
  EcommerceCategory,
  EcommerceProduct,
  VisualCategoryTile,
} from '@/lib/blocks/types';
import {
  UnifiedProductCard,
  type UnifiedProductCardProduct,
} from './storefront/blocks/UnifiedProductCard';
import { souqnaFxClassName, SouqnaFxStyles } from './souqna-fx-styles';

type Direction = 'ltr' | 'rtl';
type Variant = 'gallery' | 'filters' | 'colorDetail' | 'drop' | 'shelf' | 'categoryShop' | 'tiles';

type Props = EcommerceBlockProps & {
  variant: Variant;
  dir?: Direction;
};

const FALLBACK_PRODUCTS: EcommerceProduct[] = [
  {
    id: 'linen-set',
    name: 'Linen travel set',
    brand: 'Souqna Studio',
    category: 'Travel',
    price: 'QAR 240',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
    description: 'A compact edit for everyday errands, travel days, and giftable bundles.',
    href: '#',
    available: true,
  },
  {
    id: 'ceramic-cup',
    name: 'Ceramic cup pair',
    brand: 'Dohat Clay',
    category: 'Home',
    price: 'QAR 180',
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80',
    description: 'Hand-thrown pair with a soft matte glaze and boxed presentation.',
    href: '#',
    available: true,
  },
  {
    id: 'date-box',
    name: 'Date gift box',
    brand: 'Majlis Pantry',
    category: 'Gifts',
    price: 'QAR 135',
    imageUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900&q=80',
    description: 'A premium date assortment with Arabic coffee notes and reusable packaging.',
    href: '#',
    available: true,
  },
  {
    id: 'fragrance-oil',
    name: 'Amber fragrance oil',
    brand: 'Bayt Oud',
    category: 'Beauty',
    price: 'QAR 290',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80',
    description: 'A warm amber blend designed for a slow, lasting dry down.',
    href: '#',
    available: false,
  },
];

const FALLBACK_CATEGORIES: EcommerceCategory[] = [
  {
    id: 'new',
    label: 'New arrivals',
    tag: 'Fresh edit',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80',
    href: '#',
  },
  {
    id: 'gifts',
    label: 'Gifts',
    tag: 'Ready to wrap',
    imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=900&q=80',
    href: '#',
  },
  {
    id: 'home',
    label: 'Home',
    tag: 'For the table',
    imageUrl: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?w=900&q=80',
    href: '#',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    tag: 'Daily rituals',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80',
    href: '#',
  },
];

function normalizeProducts(products?: EcommerceProduct[]) {
  if (products === undefined) return FALLBACK_PRODUCTS;
  return products.filter((product) => product.name?.trim() || product.imageUrl);
}

function normalizeCategories(categories?: EcommerceCategory[]) {
  if (categories === undefined) return FALLBACK_CATEGORIES;
  return categories.filter((category) => category.label?.trim());
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

function productImages(product: EcommerceProduct) {
  const images = [product.imageUrl, ...(product.images ?? [])].filter((src): src is string =>
    Boolean(src?.trim()),
  );
  return Array.from(new Set(images));
}

function sectionTitle(title?: string, fallback = 'Curated products') {
  return title?.trim() || fallback;
}

function toCardProduct(product: EcommerceProduct): UnifiedProductCardProduct {
  const images = productImages(product);
  return {
    id: product.id ?? product.name,
    title: product.name,
    description: product.description,
    category: product.category ?? product.brand ?? product.tag,
    imageUrl: images[0],
    priceQar: product.priceQar,
    priceText: product.price,
    status: product.status ?? (product.available === false ? 'sold_out' : 'active'),
    href: product.href ?? '#',
    createdAt: product.createdAt,
    isCustomizable: product.isCustomizable,
    customizationLabel: product.customizationLabel,
    allowCustomSize: product.allowCustomSize,
    requiresHeightInput: product.requiresHeightInput,
    heightInputLabel: product.heightInputLabel,
    heightOptions: product.heightOptions,
    sizeOptions: product.sizes
      ?.filter((size) => size.available !== false)
      .map((size) => size.label),
  };
}

function toCommerceLike(product: EcommerceProduct): CommerceProductLike {
  return {
    ...product,
    id: product.id ?? product.name,
    title: product.name,
    priceQar: product.priceQar ?? parsePrice(product.price),
    status: product.status ?? (product.available === false ? 'sold_out' : 'active'),
    stock: product.available === false ? 0 : 1,
  };
}

function resolveClientProducts(
  products: EcommerceProduct[],
  source?: CommerceProductSource,
  legacyIds: string[] = [],
) {
  const byId = new Map(products.map((product) => [product.id ?? product.name, product]));
  return resolveCommerceProductSource(
    products.map(toCommerceLike),
    source,
    legacyIds,
  )
    .map((product) => byId.get(product.id))
    .filter((product): product is EcommerceProduct => Boolean(product));
}

function parsePrice(value?: string) {
  if (!value) return null;
  const amount = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

export function SouqnaEcommerceBlock({
  variant,
  eyebrow = 'Shop',
  title,
  subtitle,
  cta,
  products,
  categories,
  tabs,
  productIds,
  filterable,
  tabbed,
  tilesConfig,
  dir = 'ltr',
}: Props) {
  const normalizedProducts = useMemo(() => normalizeProducts(products), [products]);
  const normalizedCategories = useMemo(() => normalizeCategories(categories), [categories]);
  const product = normalizedProducts[0];
  const isRtl = dir === 'rtl';

  return (
    <section
      dir={dir}
      className={`${souqnaFxClassName} w-full overflow-hidden bg-white px-4 py-8 text-neutral-950 dark:bg-neutral-950 dark:text-white sm:px-6 sm:py-10 lg:px-8`}
    >
      <SouqnaFxStyles />
      <div className="mx-auto w-full max-w-6xl">
        <CommerceHeader
          eyebrow={eyebrow}
          title={sectionTitle(title, headerFallback(variant))}
          subtitle={subtitle}
          cta={cta}
        />
        {variant === 'filters' ? (
          <ProductFilters products={normalizedProducts} filterable={filterable} isRtl={isRtl} />
        ) : variant === 'shelf' ? (
          <EditorialShelf products={normalizedProducts} isRtl={isRtl} />
        ) : variant === 'categoryShop' ? (
          <CategoryShop products={normalizedProducts} tabs={tabs} tabbed={tabbed} isRtl={isRtl} />
        ) : variant === 'tiles' ? (
          <CategoryTiles
            categories={normalizedCategories}
            products={normalizedProducts}
            tabs={tabs}
            tilesConfig={tilesConfig}
            productIds={productIds}
            isRtl={isRtl}
          />
        ) : product ? (
          <SingleProduct product={product} isRtl={isRtl} />
        ) : (
          <CommerceEmptyState isRtl={isRtl} />
        )}
      </div>
    </section>
  );
}

function headerFallback(variant: Variant) {
  switch (variant) {
    case 'gallery':
      return 'Featured product gallery';
    case 'filters':
      return 'Filtered shop edit';
    case 'colorDetail':
      return 'Product color story';
    case 'drop':
      return 'Limited drop';
    case 'shelf':
      return 'Editorial product shelf';
    case 'categoryShop':
      return 'Category shop';
    case 'tiles':
      return 'Shop by category';
  }
}

function CommerceHeader({
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: EcommerceBlockProps['cta'];
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-neutral-950 dark:text-white sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {cta?.label ? (
        <a
          href={cta.href || '#'}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-950 hover:text-white dark:border-neutral-700 dark:text-white dark:hover:bg-white dark:hover:text-neutral-950"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      ) : null}
    </div>
  );
}

function SingleProduct({ product, isRtl }: { product: EcommerceProduct; isRtl: boolean }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <UnifiedProductCard isRtl={isRtl} variant="feature" product={toCardProduct(product)} />
    </div>
  );
}

function ProductFilters({
  products,
  filterable,
  isRtl,
}: {
  products: EcommerceProduct[];
  filterable?: EcommerceBlockProps['filterable'];
  isRtl: boolean;
}) {
  const sourcedProducts = useMemo(
    () => resolveClientProducts(products, filterable?.productSource),
    [products, filterable?.productSource],
  );
  const groups = useMemo(
    () => buildFilterGroups(sourcedProducts, filterable?.filters?.groups, isRtl),
    [sourcedProducts, filterable?.filters?.groups, isRtl],
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  const showFilters = filterable?.filters?.enabled !== false && groups.length > 0;
  const visible = useMemo(
    () => filterProductsByGroups(sourcedProducts, groups, selected),
    [sourcedProducts, groups, selected],
  );

  return (
    <div
      className={
        showFilters && filterable?.filters?.layout !== 'topbar'
          ? 'grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]'
          : 'grid gap-5'
      }
    >
      {showFilters ? (
        <aside className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            {isRtl ? 'الفلاتر' : 'Filters'}
          </div>
          <div
            className={
              filterable?.filters?.layout === 'topbar'
                ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
                : undefined
            }
          >
            {groups.map((group) => (
              <FilterGroup
                key={group.id}
                group={group}
                value={selected[group.id] ?? 'all'}
                isRtl={isRtl}
                onChange={(value) =>
                  setSelected((current) => ({
                    ...current,
                    [group.id]: value,
                  }))
                }
              />
            ))}
          </div>
        </aside>
      ) : null}
      <ProductGrid
        products={visible}
        columns="three"
        isRtl={isRtl}
        card={filterable?.card}
      />
    </div>
  );
}

function EditorialShelf({ products, isRtl }: { products: EcommerceProduct[]; isRtl: boolean }) {
  return <ProductGrid products={products.slice(0, 5)} columns="three" isRtl={isRtl} />;
}

function CategoryShop({
  products,
  tabs,
  tabbed,
  isRtl,
}: {
  products: EcommerceProduct[];
  tabs?: string[];
  tabbed?: EcommerceBlockProps['tabbed'];
  isRtl: boolean;
}) {
  const resolvedTabs = useMemo(
    () => buildProductTabs(products, tabbed, tabs, isRtl),
    [products, tabbed, tabs, isRtl],
  );
  const [active, setActive] = useState(resolvedTabs[0]?.id ?? 'all');
  const current = resolvedTabs.find((tab) => tab.id === active) ?? resolvedTabs[0];
  const byId = new Map(products.map((product) => [product.id ?? product.name, product]));
  const visible = (current?.productIds ?? [])
    .map((id) => byId.get(id))
    .filter((product): product is EcommerceProduct => Boolean(product));

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {resolvedTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              (current?.id ?? active) === tab.id
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ProductGrid
        products={visible}
        columns="three"
        isRtl={isRtl}
        card={tabbed?.card}
        emptyLabel={isRtl ? 'لا توجد منتجات في هذا التبويب' : 'No products in this tab yet'}
      />
    </div>
  );
}

function CategoryTiles({
  categories,
  products,
  tabs,
  tilesConfig,
  productIds,
  isRtl,
}: {
  categories: EcommerceCategory[];
  products: EcommerceProduct[];
  tabs?: string[];
  tilesConfig?: EcommerceBlockProps['tilesConfig'];
  productIds?: string[];
  isRtl: boolean;
}) {
  const tiles = useMemo(
    () => buildVisualTiles(categories, products, tilesConfig, productIds),
    [categories, products, tilesConfig, productIds],
  );
  const tileTabs = useMemo(
    () => buildTileTabs(tiles, tilesConfig, tabs, isRtl),
    [tiles, tilesConfig, tabs, isRtl],
  );
  const [activeTab, setActiveTab] = useState(tileTabs[0]?.id ?? 'all');
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const currentTab = tileTabs.find((tab) => tab.id === activeTab) ?? tileTabs[0];
  const visibleTileIds = new Set(currentTab?.tileIds ?? tiles.map((tile) => tile.id));
  const visibleTiles = tiles.filter((tile) => visibleTileIds.has(tile.id));
  const selectedTile = tiles.find((tile) => tile.id === activeTile) ?? visibleTiles[0];
  const tileProducts = selectedTile ? productsForTile(products, selectedTile) : [];
  const behavior = tilesConfig?.behavior;
  const clickAction = behavior?.clickAction ?? 'navigate';

  return (
    <div>
      {behavior?.showTabs !== false && tileTabs.length > 1 ? (
        <div className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-neutral-200 pb-2 dark:border-neutral-800">
          {tileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 px-1 py-2 text-sm font-medium ${
                (currentTab?.id ?? activeTab) === tab.id
                  ? 'text-neutral-950 dark:text-white'
                  : 'text-neutral-500'
              }`}
            >
              {tab.label}
              {(currentTab?.id ?? activeTab) === tab.id ? (
                <span className="absolute inset-x-0 -bottom-2 h-0.5 bg-neutral-950 dark:bg-white" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleTiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            active={tile.id === selectedTile?.id && clickAction !== 'navigate'}
            overlayStyle={behavior?.overlayStyle ?? 'dark_gradient'}
            clickAction={clickAction}
            isRtl={isRtl}
            onSelect={() => {
              if (clickAction === 'navigate') return;
              setActiveTile(tile.id);
              if (clickAction === 'scroll_to_products') {
                window.requestAnimationFrame(() =>
                  document.getElementById('souqna-tile-products')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  }),
                );
              }
            }}
          />
        ))}
      </div>
      {clickAction !== 'navigate' ? (
        <div id="souqna-tile-products" className="mt-6 scroll-mt-20">
          <ProductGrid
            products={tileProducts}
            columns="four"
            isRtl={isRtl}
            emptyLabel={isRtl ? 'لا توجد منتجات لهذه المجموعة' : 'No products mapped to this collection'}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProductGrid({
  products,
  columns,
  isRtl,
  card,
  emptyLabel,
}: {
  products: EcommerceProduct[];
  columns: 'three' | 'four';
  isRtl: boolean;
  card?: CommerceCardConfig;
  emptyLabel?: string;
}) {
  if (products.length === 0) {
    return <CommerceEmptyState isRtl={isRtl} label={emptyLabel} />;
  }

  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 ${columns === 'four' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
    >
      {products.map((product) => {
        const cardProduct = toCardProduct(product);
        if (card?.showCategory === false && card?.showBrand === false) {
          cardProduct.category = undefined;
        }
        return (
          <UnifiedProductCard
            key={product.id ?? product.name}
            product={cardProduct}
            isRtl={isRtl}
            variant={columns === 'four' ? 'compact' : 'standard'}
            showDescription={card?.showDescription !== false}
            showAddToCart={card?.ctaMode !== 'product_page'}
          />
        );
      })}
    </div>
  );
}

function FilterGroup({
  group,
  value,
  isRtl,
  onChange,
}: {
  group: ResolvedFilterGroup;
  value: string;
  isRtl: boolean;
  onChange: (value: string) => void;
}) {
  const allLabel = isRtl ? 'الكل' : 'All';
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {isRtl ? group.labelAr || group.labelEn : group.labelEn || group.labelAr}
      </p>
      <div className="grid gap-1.5">
        {[{ id: 'all', label: allLabel }, ...group.options].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              value === option.id
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            }`}
          >
            {option.label}
            {value === option.id ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Search className="h-3.5 w-3.5 opacity-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type ResolvedFilterOption = CommerceFilterOption & {
  label: string;
  productIds: string[];
};

type ResolvedFilterGroup = Omit<CommerceFilterGroup, 'options'> & {
  options: ResolvedFilterOption[];
};

type ResolvedProductTab = {
  id: string;
  label: string;
  productIds: string[];
};

function buildFilterGroups(
  products: EcommerceProduct[],
  configured: CommerceFilterGroup[] | undefined,
  isRtl: boolean,
): ResolvedFilterGroup[] {
  const groups =
    configured?.length
      ? configured
      : [
          {
            id: 'category',
            labelEn: 'Category',
            labelAr: 'التصنيف',
            source: 'category' as const,
            autoGenerate: true,
          },
          {
            id: 'availability',
            labelEn: 'Availability',
            labelAr: 'التوفر',
            source: 'availability' as const,
            autoGenerate: true,
          },
        ];

  return groups
    .map((group) => {
      const rawOptions =
        group.autoGenerate !== false ? generateOptionsForGroup(products, group) : (group.options ?? []);
      const options = rawOptions
        .map((option) => {
          const productIds = resolveFilterOptionProductIds(
            products.map(toCommerceLike),
            group,
            option,
          );
          return {
            ...option,
            label:
              (isRtl ? option.labelAr || option.labelEn : option.labelEn || option.labelAr) ||
              option.value ||
              option.category ||
              option.tag ||
              option.id,
            productIds,
          };
        })
        .filter((option) => option.productIds.length > 0 || group.source === 'manual');
      return { ...group, options };
    })
    .filter((group) => group.options.length > 0);
}

function generateOptionsForGroup(
  products: EcommerceProduct[],
  group: CommerceFilterGroup,
): CommerceFilterOption[] {
  if (group.source === 'category') {
    return uniqueStrings(products.map((product) => product.category)).map((category) => ({
      id: slugify(category),
      labelEn: category,
      labelAr: category,
      value: category,
      category,
    }));
  }
  if (group.source === 'brand') {
    return uniqueStrings(products.map((product) => product.brand)).map((brand) => ({
      id: slugify(brand),
      labelEn: brand,
      labelAr: brand,
      value: brand,
    }));
  }
  if (group.source === 'tag') {
    return uniqueStrings(products.map((product) => product.tag)).map((tag) => ({
      id: slugify(tag),
      labelEn: tag,
      labelAr: tag,
      value: tag,
      tag,
    }));
  }
  if (group.source === 'availability') {
    return [
      { id: 'available', labelEn: 'Available', labelAr: 'متوفر', value: 'available' },
      { id: 'sold_out', labelEn: 'Sold out', labelAr: 'نفد', value: 'sold_out' },
    ];
  }
  if (group.source === 'price') {
    return [
      { id: 'under_100', labelEn: 'Under 100 QAR', labelAr: 'أقل من 100 ر.ق', value: 'under_100' },
      { id: '100_250', labelEn: '100 - 250 QAR', labelAr: '100 - 250 ر.ق', value: '100_250' },
      { id: '250_plus', labelEn: '250+ QAR', labelAr: 'أكثر من 250 ر.ق', value: '250_plus' },
    ];
  }
  return group.options ?? [];
}

function filterProductsByGroups(
  products: EcommerceProduct[],
  groups: ResolvedFilterGroup[],
  selected: Record<string, string>,
) {
  if (groups.length === 0) return products;
  return products.filter((product) => {
    const id = product.id ?? product.name;
    return groups.every((group) => {
      const selectedOptionId = selected[group.id];
      if (!selectedOptionId || selectedOptionId === 'all') return true;
      const option = group.options.find((item) => item.id === selectedOptionId);
      return option ? option.productIds.includes(id) : true;
    });
  });
}

function buildProductTabs(
  products: EcommerceProduct[],
  tabbed: EcommerceBlockProps['tabbed'],
  legacyTabs: string[] | undefined,
  isRtl: boolean,
): ResolvedProductTab[] {
  if (tabbed?.tabs?.length) {
    const resolved = resolveCommerceTabs(
      products.map(toCommerceLike),
      tabbed.tabs,
      tabbed.allTab?.mode ?? 'combined_tabs',
      tabbed.allTab?.productIds ?? [],
    );
    const allIds = products.map((product) => product.id ?? product.name);
    return resolved
      .filter((tab) => tab.id !== 'all' || tabbed.allTab?.enabled !== false)
      .map((tab) => {
        const productIds =
          tab.productIds.length === 0 && tabbed.emptyTabBehavior === 'fallback_all'
            ? allIds
            : tab.productIds;
        return {
          id: tab.id,
          label: (isRtl ? tab.labelAr || tab.labelEn : tab.labelEn || tab.labelAr) || tab.value || tab.id,
          productIds,
        };
      })
      .filter((tab) => tabbed.emptyTabBehavior !== 'hide' || tab.productIds.length > 0);
  }

  const labels = legacyTabs?.filter(Boolean).length
    ? legacyTabs!.filter(Boolean)
    : ['All', ...uniqueStrings(products.map((product) => product.category))];
  return labels.map((label, index) => ({
    id: index === 0 && label.toLowerCase() === 'all' ? 'all' : slugify(label),
    label: isRtl && label.toLowerCase() === 'all' ? 'الكل' : label,
    productIds:
      index === 0 && label.toLowerCase() === 'all'
        ? products.map((product) => product.id ?? product.name)
        : products
            .filter((product) => normalizeToken(product.category) === normalizeToken(label))
            .map((product) => product.id ?? product.name),
  }));
}

function buildVisualTiles(
  categories: EcommerceCategory[],
  products: EcommerceProduct[],
  tilesConfig: EcommerceBlockProps['tilesConfig'],
  productIds?: string[],
): VisualCategoryTile[] {
  if (tilesConfig?.tiles?.length) return tilesConfig.tiles;
  if (categories.length > 0) {
    return categories.slice(0, 8).map((category) => ({
      id: category.id ?? slugify(category.label),
      labelEn: category.label,
      labelAr: category.label,
      eyebrowEn: category.tag,
      eyebrowAr: category.tag,
      imageUrl: category.imageUrl,
      destination: {
        type: 'category',
        category: category.label,
        url: category.href ?? null,
      },
    }));
  }

  const manualProducts = productIds?.length
    ? products.filter((product) => product.id && productIds.includes(product.id))
    : products.slice(0, 4);
  return manualProducts.map((product) => ({
    id: product.id ?? slugify(product.name),
    labelEn: product.category || product.name,
    labelAr: product.category || product.name,
    eyebrowEn: product.name,
    eyebrowAr: product.name,
    imageUrl: product.imageUrl,
    destination: {
      type: 'manual_products',
      productIds: [product.id ?? product.name],
    },
  }));
}

function buildTileTabs(
  tiles: VisualCategoryTile[],
  tilesConfig: EcommerceBlockProps['tilesConfig'],
  legacyTabs: string[] | undefined,
  isRtl: boolean,
) {
  const allIds = tiles.map((tile) => tile.id);
  const configured = tilesConfig?.tabs ?? [];
  const allTabMode = tilesConfig?.behavior?.allTab ?? 'show_all';
  const allTab =
    allTabMode === 'hidden'
      ? []
      : [{ id: 'all', label: isRtl ? 'الكل' : 'All', tileIds: allIds }];
  if (configured.length > 0) {
    return [
      ...allTab,
      ...configured.map((tab) => ({
        id: tab.id,
        label: (isRtl ? tab.labelAr || tab.labelEn : tab.labelEn || tab.labelAr) || tab.id,
        tileIds: tab.tileIds?.length ? tab.tileIds : allIds,
      })),
    ];
  }
  if (legacyTabs?.filter(Boolean).length) {
    return legacyTabs.filter(Boolean).map((label, index) => ({
      id: index === 0 ? 'all' : slugify(label),
      label: isRtl && index === 0 ? 'الكل' : label,
      tileIds: allIds,
    }));
  }
  return allTab.length ? allTab : [{ id: 'all', label: isRtl ? 'الكل' : 'All', tileIds: allIds }];
}

function productsForTile(products: EcommerceProduct[], tile: VisualCategoryTile) {
  const destination = tile.destination;
  if (!destination) return products;
  if (destination.type === 'manual_products') {
    const ids = new Set(destination.productIds ?? []);
    return products.filter((product) => ids.has(product.id ?? product.name));
  }
  if (destination.type === 'category') {
    return products.filter(
      (product) => normalizeToken(product.category) === normalizeToken(destination.category),
    );
  }
  if (destination.type === 'tag') {
    return products.filter((product) => normalizeToken(product.tag) === normalizeToken(destination.tag));
  }
  return products;
}

function TileCard({
  tile,
  active,
  overlayStyle,
  clickAction,
  isRtl,
  onSelect,
}: {
  tile: VisualCategoryTile;
  active: boolean;
  overlayStyle: NonNullable<NonNullable<EcommerceBlockProps['tilesConfig']>['behavior']>['overlayStyle'];
  clickAction: NonNullable<NonNullable<EcommerceBlockProps['tilesConfig']>['behavior']>['clickAction'];
  isRtl: boolean;
  onSelect: () => void;
}) {
  const label = (isRtl ? tile.labelAr || tile.labelEn : tile.labelEn || tile.labelAr) || 'Collection';
  const eyebrow = isRtl ? tile.eyebrowAr || tile.eyebrowEn : tile.eyebrowEn || tile.eyebrowAr;
  const badge = isRtl ? tile.badge?.labelAr || tile.badge?.labelEn : tile.badge?.labelEn || tile.badge?.labelAr;
  const content = (
    <>
      {tile.imageUrl ? (
        <img
          src={tile.imageUrl}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : null}
      <div className={tileOverlayClass(overlayStyle)} />
      {badge ? (
        <span className="absolute end-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-950">
          {badge}
        </span>
      ) : null}
      <div
        className={`absolute inset-x-0 bottom-0 p-4 ${overlayStyle === 'light_overlay' ? 'text-neutral-950' : 'text-white'}`}
      >
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.16em] opacity-75">{eyebrow}</p>
        ) : null}
        <h3 className="mt-1 text-xl font-semibold">{label}</h3>
      </div>
    </>
  );
  const className = `group relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 text-start transition dark:bg-neutral-900 ${
    active ? 'ring-2 ring-neutral-950 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-neutral-950' : ''
  }`;

  if (clickAction === 'navigate') {
    return (
      <a href={tileHref(tile)} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={className}>
      {content}
    </button>
  );
}

function CommerceEmptyState({ isRtl, label }: { isRtl: boolean; label?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      {label ?? (isRtl ? 'لا توجد منتجات متاحة حاليا.' : 'No products available yet.')}
    </div>
  );
}

function tileHref(tile: VisualCategoryTile) {
  const destination = tile.destination;
  if (!destination) return '#';
  if (destination.type === 'external') return destination.url || '#';
  if (destination.type === 'page') return destination.pageSlug ? `/${destination.pageSlug}` : '#';
  if (destination.type === 'category') {
    return destination.url || `?category=${encodeURIComponent(destination.category ?? '')}`;
  }
  if (destination.type === 'tag') return `?tag=${encodeURIComponent(destination.tag ?? '')}`;
  return '#souqna-tile-products';
}

function tileOverlayClass(
  overlayStyle: NonNullable<NonNullable<EcommerceBlockProps['tilesConfig']>['behavior']>['overlayStyle'],
) {
  if (overlayStyle === 'light_overlay') return 'absolute inset-0 bg-white/50';
  if (overlayStyle === 'minimal') return 'absolute inset-0 bg-black/10';
  if (overlayStyle === 'framed') {
    return 'absolute inset-3 rounded-xl border border-white/60 bg-black/20';
  }
  return 'absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent';
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function normalizeToken(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}
