'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Filter, Search, SlidersHorizontal, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type ProductIndexAvailability,
  type ProductIndexSettings,
  type ProductIndexSort,
} from '@/lib/productIndexSettings';
import type {
  ProductIndexCategoryOption,
  ProductIndexListProduct,
} from '@/lib/productIndexCatalog';
import { UnifiedProductCard } from './blocks/UnifiedProductCard';

type Props = {
  storefrontSlug: string;
  businessName: string;
  logoUrl: string | null;
  locale: 'en' | 'ar';
  currency: string;
  settings: ProductIndexSettings;
  products: ProductIndexListProduct[];
  categories: ProductIndexCategoryOption[];
  showCartButtons?: boolean;
};

const SORT_LABELS = {
  en: {
    manual: 'Featured order',
    newest: 'Newest',
    price_asc: 'Price: low to high',
    price_desc: 'Price: high to low',
    name: 'Name',
  },
  ar: {
    manual: 'ترتيب المتجر',
    newest: 'الأحدث',
    price_asc: 'السعر: الأقل أولاً',
    price_desc: 'السعر: الأعلى أولاً',
    name: 'الاسم',
  },
} satisfies Record<'en' | 'ar', Record<ProductIndexSort, string>>;

const AVAILABILITY_LABELS = {
  en: {
    all: 'All products',
    available: 'Available',
    sold_out: 'Sold out',
  },
  ar: {
    all: 'كل المنتجات',
    available: 'متوفر',
    sold_out: 'نفد',
  },
} satisfies Record<'en' | 'ar', Record<ProductIndexAvailability, string>>;

function productPathSegment(product: Pick<ProductIndexListProduct, 'id' | 'handle'>): string {
  return encodeURIComponent(product.handle || product.id);
}

export function AllProductsPage({
  storefrontSlug,
  businessName,
  logoUrl,
  locale,
  currency,
  settings,
  products,
  categories,
  showCartButtons = true,
}: Props) {
  const pathname = usePathname();
  const isRtl = locale === 'ar';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availability, setAvailability] = useState<ProductIndexAvailability>(
    settings.defaultAvailability,
  );
  const [sort, setSort] = useState<ProductIndexSort>(settings.defaultSort);

  const categorySlugSet = useMemo(
    () => new Set(categories.map((item) => item.slug)),
    [categories],
  );

  const visibleCategorySet = useMemo(
    () =>
      new Set(
        settings.visibleCategorySlugs.filter((slug) => categorySlugSet.has(slug)),
      ),
    [categorySlugSet, settings.visibleCategorySlugs],
  );
  const categoryRestrictionEnabled = visibleCategorySet.size > 0;

  const availableCategories = useMemo(() => {
    const filtered = categoryRestrictionEnabled
      ? categories.filter((item) => visibleCategorySet.has(item.slug))
      : categories;
    return filtered.filter((item) =>
      products.some(
        (product) =>
          !settings.hiddenProductIds.includes(product.id) &&
          product.categorySlugs.includes(item.slug),
      ),
    );
  }, [
    categories,
    categoryRestrictionEnabled,
    products,
    settings.hiddenProductIds,
    visibleCategorySet,
  ]);

  useEffect(() => {
    setSort(settings.defaultSort);
  }, [settings.defaultSort]);

  useEffect(() => {
    setAvailability(settings.defaultAvailability);
  }, [settings.defaultAvailability]);

  useEffect(() => {
    if (category !== 'all' && !availableCategories.some((item) => item.slug === category)) {
      setCategory('all');
    }
  }, [availableCategories, category]);

  const filtered = useMemo(() => {
    const hidden = new Set(settings.hiddenProductIds);
    const q = query.trim().toLowerCase();
    const min = Number(minPrice);
    const max = Number(maxPrice);
    const hasMin = minPrice.trim().length > 0 && Number.isFinite(min);
    const hasMax = maxPrice.trim().length > 0 && Number.isFinite(max);

    const next = products.filter((product) => {
      if (hidden.has(product.id)) return false;
      if (
        categoryRestrictionEnabled &&
        !product.categorySlugs.some((slug) => visibleCategorySet.has(slug))
      ) {
        return false;
      }
      if (category !== 'all' && !product.categorySlugs.includes(category)) return false;
      if (availability === 'available' && product.status === 'sold_out') return false;
      if (availability === 'sold_out' && product.status !== 'sold_out') return false;
      const price = displayPrice(product);
      if (hasMin && (price === null || price < min)) return false;
      if (hasMax && (price === null || price > max)) return false;
      if (q) {
        const haystack = [
          product.title,
          product.subtitle ?? '',
          product.description ?? '',
          product.category ?? '',
          product.handle ?? '',
          product.badges.join(' '),
          product.categorySlugs.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return sortProducts(next, sort, locale);
  }, [
    availability,
    category,
    locale,
    maxPrice,
    minPrice,
    products,
    query,
    categoryRestrictionEnabled,
    settings.hiddenProductIds,
    sort,
    visibleCategorySet,
  ]);

  const copy = pageCopy(locale, businessName, settings);
  const baseHref = storefrontBaseHrefFromPath(pathname, storefrontSlug);
  const hiddenCount = settings.hiddenProductIds.length;
  const filterCount =
    Number(Boolean(query.trim())) +
    Number(category !== 'all') +
    Number(Boolean(minPrice.trim() || maxPrice.trim())) +
    Number(availability !== settings.defaultAvailability) +
    Number(sort !== settings.defaultSort);

  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        maxWidth: 1280,
        marginInline: 'auto',
        boxSizing: 'border-box',
        paddingInline: 'clamp(14px, 4%, 52px)',
        paddingBlock: 'clamp(26px, 6%, 88px)',
        ['containerType' as string]: 'inline-size',
        color: 'var(--sf-ink)',
      }}
    >
      <header style={headerStyle()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span style={logoShellStyle()}>
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Store size={22} aria-hidden />
            )}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle()}>{copy.eyebrow}</p>
            <h1 style={titleStyle(isRtl)}>{copy.title}</h1>
          </div>
        </div>
        <p style={subtitleStyle()}>{copy.subtitle}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Badge className="rounded-full border-[color-mix(in_srgb,var(--sf-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--sf-accent)_10%,transparent)] text-[var(--sf-ink)]">
            {copy.count(filtered.length, products.length)}
          </Badge>
          {hiddenCount > 0 ? (
            <Badge className="rounded-full border-[color-mix(in_srgb,var(--sf-ink)_14%,transparent)] bg-transparent text-[color-mix(in_srgb,var(--sf-ink)_66%,transparent)]">
              {copy.hidden(hiddenCount)}
            </Badge>
          ) : null}
        </div>
      </header>

      <section style={filterBarStyle()} aria-label={copy.filtersLabel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
            <SlidersHorizontal size={17} aria-hidden />
            {copy.filters}
          </span>
          {filterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setMinPrice('');
                setMaxPrice('');
                setAvailability(settings.defaultAvailability);
                setSort(settings.defaultSort);
              }}
              className="h-8 rounded-full px-3 text-xs text-[var(--sf-ink)] hover:bg-[color-mix(in_srgb,var(--sf-accent)_10%,transparent)]"
            >
              {copy.clear}
            </Button>
          ) : null}
        </div>

        {settings.showSearch ? (
          <label style={searchWrapStyle()}>
            <Search size={16} aria-hidden style={{ color: 'color-mix(in srgb, var(--sf-ink) 48%, transparent)' }} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 border-0 bg-transparent px-0 text-[var(--sf-ink)] placeholder:text-[color-mix(in_srgb,var(--sf-ink)_42%,transparent)] focus-visible:ring-0"
            />
          </label>
        ) : null}

        {settings.showCategoryFilters && availableCategories.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
              {copy.allCategories}
            </FilterChip>
            {availableCategories.map((item) => (
              <FilterChip
                key={item.slug}
                active={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <div style={secondaryFiltersStyle()}>
          {settings.showPriceFilter ? (
            <>
              <NumberFilter
                label={copy.min}
                value={minPrice}
                currency={currency}
                onChange={setMinPrice}
              />
              <NumberFilter
                label={copy.max}
                value={maxPrice}
                currency={currency}
                onChange={setMaxPrice}
              />
            </>
          ) : null}
          {settings.showAvailabilityFilter ? (
            <SelectFilter
              label={copy.availability}
              value={availability}
              onChange={(value) => setAvailability(value as ProductIndexAvailability)}
              options={Object.entries(AVAILABILITY_LABELS[locale]).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          ) : null}
          <SelectFilter
            label={copy.sort}
            value={sort}
            onChange={(value) => setSort(value as ProductIndexSort)}
            options={Object.entries(SORT_LABELS[locale]).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <section style={emptyStateStyle()}>
          <Filter size={28} aria-hidden />
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif), serif', fontSize: 28 }}>
            {copy.emptyTitle}
          </h2>
          <p style={{ margin: 0, color: 'color-mix(in srgb, var(--sf-ink) 62%, transparent)' }}>
            {copy.emptyBody}
          </p>
        </section>
      ) : (
        <section style={gridStyle(settings.layout)} aria-label={copy.productsLabel}>
          {filtered.map((product, index) => (
            <UnifiedProductCard
              key={product.id}
              product={{
                ...product,
                href: `${baseHref}/p/${productPathSegment(product)}`,
              }}
              isRtl={isRtl}
              variant={settings.layout === 'compact' ? 'compact' : settings.layout === 'editorial' && index === 0 ? 'feature' : 'standard'}
              showDescription={settings.layout !== 'compact'}
              showAddToCart={showCartButtons}
              style={settings.layout === 'editorial' && index === 0 ? featureCardStyle() : undefined}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function pageCopy(locale: 'en' | 'ar', businessName: string, settings: ProductIndexSettings) {
  if (locale === 'ar') {
    return {
      eyebrow: businessName,
      title: settings.title ?? 'كل المنتجات',
      subtitle: settings.subtitle ?? 'تصفح منتجات المتجر، استخدم الفلاتر، وأضف ما يناسبك إلى السلة.',
      filters: 'الفلاتر',
      filtersLabel: 'فلاتر المنتجات',
      productsLabel: 'قائمة المنتجات',
      searchPlaceholder: 'ابحث عن منتج أو فئة',
      allCategories: 'كل الفئات',
      min: 'أقل سعر',
      max: 'أعلى سعر',
      availability: 'التوفر',
      sort: 'الترتيب',
      clear: 'مسح الفلاتر',
      emptyTitle: 'لا توجد منتجات مطابقة',
      emptyBody: 'جرّب تعديل البحث أو الفلاتر لرؤية منتجات أكثر.',
      count: (shown: number, total: number) => `${shown} من ${total} منتج`,
      hidden: (count: number) => `${count} مخفي من المتجر`,
    };
  }
  return {
    eyebrow: businessName,
    title: settings.title ?? 'All products',
    subtitle: settings.subtitle ?? 'Browse the full catalogue, filter quickly, and add products to cart.',
    filters: 'Filters',
    filtersLabel: 'Product filters',
    productsLabel: 'Product list',
    searchPlaceholder: 'Search products or categories',
    allCategories: 'All categories',
    min: 'Min price',
    max: 'Max price',
    availability: 'Availability',
    sort: 'Sort',
    clear: 'Clear filters',
    emptyTitle: 'No matching products',
    emptyBody: 'Try changing the search or filters to reveal more products.',
    count: (shown: number, total: number) => `${shown} of ${total} products`,
    hidden: (count: number) => `${count} hidden from storefront`,
  };
}

function displayPrice(product: ProductIndexListProduct): number | null {
  if (product.pricingMode === 'monthly_payment' && typeof product.monthlyPriceQar === 'number') {
    return product.monthlyPriceQar;
  }
  return typeof product.priceQar === 'number' ? product.priceQar : null;
}

function sortProducts(
  products: ProductIndexListProduct[],
  sort: ProductIndexSort,
  locale: 'en' | 'ar',
) {
  const next = products.slice();
  const compareName = (a: ProductIndexListProduct, b: ProductIndexListProduct) =>
    a.title.localeCompare(b.title, locale === 'ar' ? 'ar-QA' : 'en');
  if (sort === 'manual') return next;
  if (sort === 'newest') {
    return next.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      const safeATime = Number.isFinite(aTime) ? aTime : 0;
      const safeBTime = Number.isFinite(bTime) ? bTime : 0;
      return safeBTime - safeATime || compareName(a, b);
    });
  }
  if (sort === 'name') {
    return next.sort(compareName);
  }
  return next.sort((a, b) => {
    const pa = displayPrice(a);
    const pb = displayPrice(b);
    if (pa === null && pb === null) return compareName(a, b);
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (sort === 'price_asc' ? pa - pb : pb - pa) || compareName(a, b);
  });
}

function storefrontBaseHrefFromPath(pathname: string | null, slug: string) {
  return pathname?.startsWith(`/brief/${slug}`) ? `/brief/${slug}` : '';
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-9 rounded-full border-[color-mix(in_srgb,var(--sf-ink)_12%,transparent)] px-4 text-xs"
      style={{
        background: active ? 'var(--sf-ink)' : 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
        color: active ? 'var(--sf-ground)' : 'var(--sf-ink)',
      }}
    >
      {children}
    </Button>
  );
}

function NumberFilter({
  label,
  value,
  currency,
  onChange,
}: {
  label: string;
  value: string;
  currency: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={fieldWrapStyle()}>
      <span style={filterLabelStyle()}>{label}</span>
      <span style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
          inputMode="decimal"
          className="h-10 border-0 bg-transparent px-0 text-[var(--sf-ink)] focus-visible:ring-0"
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.58 }}>
          {currency}
        </span>
      </span>
    </label>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label style={fieldWrapStyle()}>
      <span style={filterLabelStyle()}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          minHeight: 40,
          border: 0,
          outline: 0,
          background: 'transparent',
          color: 'var(--sf-ink)',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function headerStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 18,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}

function logoShellStyle(): CSSProperties {
  return {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    color: 'var(--sf-ground)',
    background: 'color-mix(in srgb, var(--sf-accent) 78%, #d8ad52)',
    border: '1px solid color-mix(in srgb, var(--sf-accent) 36%, transparent)',
    boxShadow: '0 22px 50px -34px color-mix(in srgb, var(--sf-accent) 86%, transparent)',
  };
}

function eyebrowStyle(): CSSProperties {
  return {
    margin: '0 0 7px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--sf-accent)',
  };
}

function titleStyle(isRtl: boolean): CSSProperties {
  return {
    margin: 0,
    fontFamily: isRtl
      ? 'var(--font-arabic-serif), var(--font-serif), serif'
      : 'var(--font-serif), serif',
    fontSize: 'clamp(36px, 8cqw, 84px)',
    lineHeight: 0.95,
    letterSpacing: 0,
    fontWeight: 700,
    overflowWrap: 'anywhere',
  };
}

function subtitleStyle(): CSSProperties {
  return {
    margin: 0,
    maxWidth: 760,
    color: 'color-mix(in srgb, var(--sf-ink) 66%, transparent)',
    fontSize: 'clamp(15px, 2.2cqw, 21px)',
    lineHeight: 1.6,
  };
}

function filterBarStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 14,
    marginBottom: 28,
    padding: 'clamp(12px, 2.4cqw, 20px)',
    borderRadius: 24,
    background: 'color-mix(in srgb, var(--sf-ground) 86%, var(--sf-accent) 5%)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
    boxShadow: '0 28px 80px -62px color-mix(in srgb, var(--sf-ink) 74%, transparent)',
  };
}

function searchWrapStyle(): CSSProperties {
  return {
    minHeight: 48,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 10,
    alignItems: 'center',
    paddingInline: 14,
    borderRadius: 16,
    background: 'color-mix(in srgb, var(--sf-ground) 94%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}

function secondaryFiltersStyle(): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 10,
  };
}

function fieldWrapStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 3,
    minHeight: 62,
    padding: '9px 12px',
    borderRadius: 14,
    background: 'color-mix(in srgb, var(--sf-ground) 94%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}

function filterLabelStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'color-mix(in srgb, var(--sf-ink) 48%, transparent)',
  };
}

function gridStyle(layout: ProductIndexSettings['layout']): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns:
      layout === 'compact'
        ? 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))'
        : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: layout === 'compact' ? 14 : 'clamp(14px, 2.4cqw, 30px)',
    alignItems: 'stretch',
  };
}

function featureCardStyle(): CSSProperties {
  return {
    gridColumn: '1 / -1',
  };
}

function emptyStateStyle(): CSSProperties {
  return {
    minHeight: 320,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    gap: 12,
    padding: 28,
    borderRadius: 28,
    background: 'color-mix(in srgb, var(--sf-ground) 88%, transparent)',
    border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
  };
}
