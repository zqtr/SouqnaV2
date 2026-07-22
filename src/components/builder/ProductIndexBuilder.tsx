'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Boxes, Eye, EyeOff, Filter, LayoutGrid, PackageSearch, Save, Search } from 'lucide-react';
import { updateProductIndexSettings } from '@/app/actions/productIndex';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AllProductsPage } from '@/components/storefront/AllProductsPage';
import type {
  ProductIndexCategoryOption,
  ProductIndexListProduct,
} from '@/lib/productIndexCatalog';
import {
  PRODUCT_INDEX_AVAILABILITY,
  PRODUCT_INDEX_LAYOUTS,
  PRODUCT_INDEX_SORTS,
  type ProductIndexAvailability,
  type ProductIndexLayout,
  type ProductIndexSettings,
  type ProductIndexSort,
} from '@/lib/productIndexSettings';

type BuilderLocale = 'en' | 'ar';
type Device = 'desktop' | 'tablet' | 'mobile';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type PreviewProps = {
  businessName: string;
  logoUrl: string | null;
  locale: BuilderLocale;
  currency: string;
  settings: ProductIndexSettings;
  products: ProductIndexListProduct[];
  categories: ProductIndexCategoryOption[];
  device: Device;
};

type InspectorProps = {
  slug: string;
  businessName: string;
  locale: BuilderLocale;
  settings: ProductIndexSettings;
  products: ProductIndexListProduct[];
  categories: ProductIndexCategoryOption[];
  onChange: (settings: ProductIndexSettings) => void;
};

const SAVE_DELAY_MS = 520;

function copy(locale: BuilderLocale) {
  if (locale === 'ar') {
    return {
      pageTitle: 'صفحة كل المنتجات',
      pageBody: 'صفحة نظام تعرض كتالوج المتجر الكامل مع فلاتر يتحكم بها التاجر.',
      ready: 'جاهز',
      saving: 'جار الحفظ',
      saved: 'تم الحفظ',
      error: 'تعذر الحفظ',
      header: 'نص الصفحة',
      title: 'العنوان',
      subtitle: 'الوصف',
      titlePlaceholder: 'كل المنتجات',
      subtitlePlaceholder: 'تصفح منتجات المتجر واختر ما يناسبك.',
      layout: 'التصميم',
      filters: 'الفلاتر',
      categories: 'الفئات الظاهرة',
      products: 'إظهار / إخفاء المنتجات',
      productSearch: 'ابحث عن منتج',
      showAllCategories: 'إظهار كل الفئات الحالية',
      hidden: 'مخفي',
      visible: 'ظاهر',
      noProducts: 'لا توجد منتجات بعد.',
      noCategories: 'لا توجد فئات بعد. أضف فئات من صفحة المنتجات.',
      defaultSort: 'الترتيب الافتراضي',
      defaultAvailability: 'التوفر الافتراضي',
      layoutOptions: {
        grid: 'شبكة',
        compact: 'مضغوط',
        editorial: 'تحريري',
      } satisfies Record<ProductIndexLayout, string>,
      sortOptions: {
        manual: 'ترتيب المتجر',
        newest: 'الأحدث',
        price_asc: 'الأقل سعراً',
        price_desc: 'الأعلى سعراً',
        name: 'الاسم',
      } satisfies Record<ProductIndexSort, string>,
      availabilityOptions: {
        all: 'كل المنتجات',
        available: 'المتوفر فقط',
        sold_out: 'النافد فقط',
      } satisfies Record<ProductIndexAvailability, string>,
      filterOptions: {
        showSearch: 'بحث المنتجات',
        showCategoryFilters: 'فلاتر الفئات',
        showPriceFilter: 'فلتر السعر',
        showAvailabilityFilter: 'فلتر التوفر',
      },
    };
  }
  return {
    pageTitle: 'All Products page',
    pageBody: 'A system page for the full storefront catalogue with merchant-controlled filters.',
    ready: 'Ready',
    saving: 'Saving',
    saved: 'Saved',
    error: 'Save failed',
    header: 'Page text',
    title: 'Title',
    subtitle: 'Subtitle',
    titlePlaceholder: 'All products',
    subtitlePlaceholder: 'Browse the storefront catalogue and pick what fits.',
    layout: 'Layout',
    filters: 'Filters',
    categories: 'Visible categories',
    products: 'Show / hide products',
    productSearch: 'Search products',
    showAllCategories: 'Show all current categories',
    hidden: 'Hidden',
    visible: 'Visible',
    noProducts: 'No products yet.',
    noCategories: 'No categories yet. Add categories from Products.',
    defaultSort: 'Default sort',
    defaultAvailability: 'Default availability',
    layoutOptions: {
      grid: 'Grid',
      compact: 'Compact',
      editorial: 'Editorial',
    } satisfies Record<ProductIndexLayout, string>,
    sortOptions: {
      manual: 'Store order',
      newest: 'Newest',
      price_asc: 'Lowest price',
      price_desc: 'Highest price',
      name: 'Name',
    } satisfies Record<ProductIndexSort, string>,
    availabilityOptions: {
      all: 'All products',
      available: 'Available only',
      sold_out: 'Sold out only',
    } satisfies Record<ProductIndexAvailability, string>,
    filterOptions: {
      showSearch: 'Product search',
      showCategoryFilters: 'Category filters',
      showPriceFilter: 'Price filter',
      showAvailabilityFilter: 'Availability filter',
    },
  };
}

export function ProductIndexBuilderPreview({
  businessName,
  logoUrl,
  locale,
  currency,
  settings,
  products,
  categories,
  device,
}: PreviewProps) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: 'calc(100dvh - 160px)',
        overflow: 'auto',
        border: '1px solid var(--bld-iframe-border)',
        borderRadius: 16,
        background: 'var(--sf-ground)',
        boxShadow: '0 22px 70px var(--bld-panel-shadow)',
        ['--sf-ground' as string]: '#f3e6d2',
        ['--sf-ink' as string]: '#241f18',
        ['--sf-accent' as string]: '#8b3a3a',
        color: 'var(--sf-ink)',
      }}
    >
      <div
        style={{
          minWidth: device === 'desktop' ? 0 : '100%',
          transformOrigin: 'top center',
        }}
      >
        <AllProductsPage
          storefrontBaseHref="/account/builder"
          businessName={businessName}
          logoUrl={logoUrl}
          locale={locale}
          currency={currency}
          settings={settings}
          products={products}
          categories={categories}
          showCartButtons={false}
        />
      </div>
    </div>
  );
}

export function ProductIndexBuilderInspector({
  slug,
  businessName,
  locale,
  settings,
  products,
  categories,
  onChange,
}: InspectorProps) {
  const t = copy(locale);
  const uncategorizedLabel = locale === 'ar' ? 'غير مصنف' : 'Uncategorized';
  const settingsRef = useRef(settings);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  function queueSave(next: ProductIndexSettings) {
    settingsRef.current = next;
    onChange(next);
    setSaveState('saving');
    setSaveMessage(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void updateProductIndexSettings({ slug, settings: next }).then((result) => {
        if (result.status === 'success') {
          settingsRef.current = result.settings;
          onChange(result.settings);
          setSaveState('saved');
          return;
        }
        setSaveState('error');
        setSaveMessage(result.status === 'error' && locale !== 'ar' ? result.message : t.error);
      });
    }, SAVE_DELAY_MS);
  }

  function patch(next: Partial<ProductIndexSettings>) {
    queueSave({ ...settingsRef.current, ...next });
  }

  const dashboardCategorySlugs = categories.map((category) => category.slug);
  const selectedDashboardCategorySlugs = settings.visibleCategorySlugs.filter((slug) =>
    dashboardCategorySlugs.includes(slug),
  );

  function toggleCategory(slugValue: string) {
    const current = settingsRef.current.visibleCategorySlugs.filter((slug) =>
      dashboardCategorySlugs.includes(slug),
    );
    const nextBase = current.length === 0 ? dashboardCategorySlugs : current;
    const next = nextBase.includes(slugValue)
      ? nextBase.filter((slug) => slug !== slugValue)
      : [...nextBase, slugValue];
    patch({ visibleCategorySlugs: next.length === dashboardCategorySlugs.length ? [] : next });
  }

  function toggleProduct(id: string) {
    const current = settingsRef.current.hiddenProductIds;
    patch({
      hiddenProductIds: current.includes(id)
        ? current.filter((productId) => productId !== id)
        : [...current, id],
    });
  }

  const filteredProducts = products.filter((product) => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return true;
    return [product.title, product.category ?? '', product.status]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const statusLabel =
    saveState === 'saving'
      ? t.saving
      : saveState === 'saved'
        ? t.saved
        : saveState === 'error'
          ? t.error
          : t.ready;
  const visibilityCopy =
    locale === 'ar'
      ? {
          title: 'ظهور الصفحة',
          enabled: 'الصفحة مفعلة في المتجر',
          disabled: 'الصفحة متوقفة عن الزوار',
        }
      : {
          title: 'Page visibility',
          enabled: 'Page is on in the storefront',
          disabled: 'Page is off for visitors',
        };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={panelStyle()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={iconShellStyle()}>
            <PackageSearch size={15} aria-hidden />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={sectionTitleStyle()}>{t.pageTitle}</h2>
            <p style={sectionBodyStyle()}>{t.pageBody}</p>
          </div>
          <Badge
            variant={saveState === 'error' ? 'destructive' : 'outline'}
            className="shrink-0 border-[var(--bld-input-border)] bg-transparent text-[10px]"
            style={{ color: 'var(--bld-text-muted)' }}
          >
            {statusLabel}
          </Badge>
        </div>
        {saveMessage ? <p style={errorStyle()}>{saveMessage}</p> : null}
      </section>

      <PanelSection title={visibilityCopy.title} icon={Eye}>
        <ToggleRow
          label={settings.enabled ? visibilityCopy.enabled : visibilityCopy.disabled}
          active={settings.enabled}
          onClick={() => patch({ enabled: !settings.enabled })}
        />
      </PanelSection>

      <PanelSection title={t.header} icon={Save}>
        <FieldLabel label={t.title}>
          <Input
            value={settings.title ?? ''}
            onChange={(event) => patch({ title: event.target.value || null })}
            maxLength={120}
            placeholder={`${t.titlePlaceholder} · ${businessName}`}
            className="h-9 border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
          />
        </FieldLabel>
        <FieldLabel label={t.subtitle}>
          <Textarea
            value={settings.subtitle ?? ''}
            onChange={(event) => patch({ subtitle: event.target.value || null })}
            maxLength={260}
            rows={3}
            placeholder={t.subtitlePlaceholder}
            className="min-h-20 resize-none border-[var(--bld-input-border)] bg-[var(--bld-input-bg)] text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)]"
          />
        </FieldLabel>
      </PanelSection>

      <PanelSection title={t.layout} icon={LayoutGrid}>
        <SegmentedPicker
          ariaLabel={t.layout}
          options={PRODUCT_INDEX_LAYOUTS}
          value={settings.layout}
          labels={t.layoutOptions}
          onChange={(layout) => patch({ layout })}
        />
      </PanelSection>

      <PanelSection title={t.filters} icon={Filter}>
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(t.filterOptions).map(([key, label]) => {
            const typedKey = key as keyof typeof t.filterOptions;
            const value = settings[typedKey];
            return (
              <ToggleRow
                key={key}
                label={label}
                active={Boolean(value)}
                onClick={() => patch({ [typedKey]: !value } as Partial<ProductIndexSettings>)}
              />
            );
          })}
        </div>
        <FieldLabel label={t.defaultSort}>
          <SegmentedPicker
            ariaLabel={t.defaultSort}
            options={PRODUCT_INDEX_SORTS}
            value={settings.defaultSort}
            labels={t.sortOptions}
            onChange={(defaultSort) => patch({ defaultSort })}
          />
        </FieldLabel>
        <FieldLabel label={t.defaultAvailability}>
          <SegmentedPicker
            ariaLabel={t.defaultAvailability}
            options={PRODUCT_INDEX_AVAILABILITY}
            value={settings.defaultAvailability}
            labels={t.availabilityOptions}
            onChange={(defaultAvailability) => patch({ defaultAvailability })}
          />
        </FieldLabel>
      </PanelSection>

      <PanelSection title={t.categories} icon={Boxes}>
        {categories.length === 0 ? (
          <p style={sectionBodyStyle()}>{t.noCategories}</p>
        ) : (
          <>
            <ToggleRow
              label={t.showAllCategories}
              active={selectedDashboardCategorySlugs.length === 0}
              onClick={() => patch({ visibleCategorySlugs: [] })}
            />
            <div style={{ display: 'grid', gap: 8 }}>
              {categories.map((category) => {
                const active =
                  selectedDashboardCategorySlugs.length === 0 ||
                  selectedDashboardCategorySlugs.includes(category.slug);
                return (
                  <ToggleRow
                    key={category.slug}
                    label={`${category.name} · ${category.productCount}`}
                    active={active}
                    onClick={() => toggleCategory(category.slug)}
                  />
                );
              })}
            </div>
          </>
        )}
      </PanelSection>

      <PanelSection title={t.products} icon={Eye}>
        <label style={searchWrapStyle()}>
          <Search size={14} aria-hidden />
          <Input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder={t.productSearch}
            className="h-9 border-0 bg-transparent px-0 text-[var(--bld-input-text)] placeholder:text-[var(--bld-text-faint)] focus-visible:ring-0"
          />
        </label>
        {products.length === 0 ? <p style={sectionBodyStyle()}>{t.noProducts}</p> : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredProducts.slice(0, 80).map((product) => {
            const hidden = settings.hiddenProductIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                aria-pressed={!hidden}
                aria-label={`${product.title} - ${hidden ? t.hidden : t.visible}`}
                style={productRowStyle(hidden)}
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" style={productThumbStyle()} />
                ) : (
                  <span style={productThumbStyle()} />
                )}
                <span style={{ minWidth: 0, flex: 1, textAlign: 'start' }}>
                  <strong style={productTitleStyle()}>{product.title}</strong>
                  <span style={productMetaStyle()}>
                    {product.category ?? uncategorizedLabel} · {product.status}
                  </span>
                </span>
                <span style={productBadgeStyle(hidden)}>
                  {hidden ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
                  {hidden ? t.hidden : t.visible}
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>
    </div>
  );
}

function PanelSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Save;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={iconShellStyle()}>
          <Icon size={14} aria-hidden />
        </span>
        <h3 style={sectionTitleStyle()}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={fieldLabelStyle()}>{label}</span>
      {children}
    </label>
  );
}

function SegmentedPicker<T extends string>({
  ariaLabel,
  options,
  value,
  labels,
  onChange,
}: {
  ariaLabel: string;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
        gap: 7,
      }}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <Button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            variant="outline"
            size="sm"
            onClick={() => onChange(option)}
            className="h-auto rounded-md border-[var(--bld-input-border)] px-3 py-2 text-xs"
            style={{
              background: active ? 'var(--bld-accent-soft)' : 'var(--bld-input-bg)',
              color: active ? 'var(--bld-text)' : 'var(--bld-text-muted)',
              borderColor: active ? 'var(--bld-accent-line)' : 'var(--bld-input-border)',
              boxShadow: active ? 'inset 0 0 0 1px var(--bld-accent-line)' : undefined,
            }}
          >
            {labels[option]}
          </Button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={toggleRowStyle(active)}>
      <span>{label}</span>
      <span style={toggleSwitchStyle(active)} aria-hidden>
        <span style={toggleDotStyle(active)} />
      </span>
    </button>
  );
}

function panelStyle(): CSSProperties {
  return {
    display: 'grid',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    border: '1px solid var(--bld-divider)',
    background: 'color-mix(in srgb, var(--bld-input-bg) 82%, transparent)',
  };
}

function iconShellStyle(): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--bld-accent)',
    background: 'var(--bld-accent-soft)',
    border: '1px solid var(--bld-accent-line)',
    flex: '0 0 auto',
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontFamily: 'var(--font-serif)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--bld-text)',
  };
}

function sectionBodyStyle(): CSSProperties {
  return {
    margin: '4px 0 0',
    fontSize: 12,
    lineHeight: 1.45,
    color: 'var(--bld-text-muted)',
  };
}

function errorStyle(): CSSProperties {
  return {
    margin: 0,
    color: '#E68A8A',
    fontSize: 12,
    lineHeight: 1.4,
  };
}

function fieldLabelStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    textTransform: 'uppercase',
    color: 'var(--bld-text-muted)',
  };
}

function searchWrapStyle(): CSSProperties {
  return {
    minHeight: 40,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 8,
    alignItems: 'center',
    paddingInline: 10,
    borderRadius: 8,
    background: 'var(--bld-input-bg)',
    border: '1px solid var(--bld-input-border)',
    color: 'var(--bld-text-muted)',
  };
}

function toggleRowStyle(active: boolean): CSSProperties {
  return {
    width: '100%',
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    border: `1px solid ${active ? 'var(--bld-accent-line)' : 'var(--bld-input-border)'}`,
    borderRadius: 8,
    background: active ? 'var(--bld-accent-soft)' : 'var(--bld-input-bg)',
    color: active ? 'var(--bld-text)' : 'var(--bld-text-muted)',
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'start',
    fontSize: 12,
    fontWeight: 700,
  };
}

function toggleSwitchStyle(active: boolean): CSSProperties {
  return {
    width: 34,
    height: 20,
    borderRadius: 999,
    padding: 2,
    background: active ? 'var(--bld-accent)' : 'var(--bld-divider)',
    display: 'inline-flex',
    justifyContent: active ? 'flex-end' : 'flex-start',
    flex: '0 0 auto',
  };
}

function toggleDotStyle(active: boolean): CSSProperties {
  return {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: active ? 'var(--bld-surface)' : 'var(--bld-text-muted)',
  };
}

function productRowStyle(hidden: boolean): CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    border: `1px solid ${hidden ? 'var(--bld-divider)' : 'var(--bld-accent-line)'}`,
    background: hidden ? 'var(--bld-input-bg)' : 'var(--bld-accent-soft)',
    color: 'var(--bld-text)',
    padding: 8,
    cursor: 'pointer',
  };
}

function productThumbStyle(): CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: 8,
    objectFit: 'cover',
    display: 'inline-block',
    background: 'var(--bld-divider)',
    flex: '0 0 auto',
  };
}

function productTitleStyle(): CSSProperties {
  return {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12,
  };
}

function productMetaStyle(): CSSProperties {
  return {
    display: 'block',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--bld-text-muted)',
    fontSize: 11,
  };
}

function productBadgeStyle(hidden: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '5px 8px',
    color: hidden ? 'var(--bld-text-muted)' : 'var(--bld-accent)',
    background: hidden ? 'var(--bld-tile-bg)' : 'var(--bld-surface)',
    fontSize: 10,
    fontWeight: 800,
    flex: '0 0 auto',
  };
}
