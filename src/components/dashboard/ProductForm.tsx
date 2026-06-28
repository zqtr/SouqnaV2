'use client';
/* eslint-disable @next/next/no-img-element */

import { useId, useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { Plus, X } from 'lucide-react';
import type { Copy } from '@/content/copy';
import type { Locale } from '@/i18n/locales';
import type { Product, ProductStatus } from '@/lib/products';
import { planUnlocksMonthlyPayments, type Plan } from '@/lib/plans';
import {
  DEFAULT_PRODUCT_HEIGHT_OPTIONS,
  DEFAULT_PRODUCT_VARIANT_OPTIONS,
  type PricedProductOption,
  normalizeHeightInputLabel,
  normalizeHeightOptions,
  normalizePricedOptions,
} from '@/lib/productOptions';
import type { Category } from '@/lib/categories';
import { createProduct, updateProduct, type ProductActionState } from '@/app/actions/products';
import { createCategory } from '@/app/actions/categories';
import {
  STOREFRONT_MEDIA_ACCEPT,
  STOREFRONT_MEDIA_FORMATS_LABEL,
  mediaKindFromUrl,
} from '@/lib/media';

type Mode = 'create' | 'edit';

const PRODUCT_SAVE_TIMEOUT_MS = 25_000;

type ProductOptionDraft = {
  label: string;
  priceDeltaQar: string;
};

type Props = {
  mode: Mode;
  storefrontSlug: string;
  locale: Locale;
  copy: Copy;
  /** edit mode: the product being edited */
  initial?: Product;
  /**
   * Categories defined for this storefront. Drives the picker chips in
   * place of the legacy free-text category field. Empty list is fine —
   * the picker shows a primary "+ New category" affordance.
   */
  categories?: Category[];
  /**
   * Pre-selected category ids when editing an existing product.
   */
  initialCategoryIds?: string[];
  currentPlan?: Plan;
  /**
   * Hide the form's own header + footer cancel link. Used when the form
   * is rendered inside a modal that supplies its own chrome.
   */
  noChrome?: boolean;
  /**
   * Called after a successful save. Skips the default redirect when
   * provided, so a modal host can close itself + refresh the route.
   */
  onSaved?: (product: Product) => void;
  /**
   * Optional cancel handler. When set, the bottom-left "Back" link is
   * rendered as a button that calls this instead of a navigation link.
   */
  onCancel?: () => void;
};

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  priceQar: string;
  compareAtPriceQar: string;
  costPerItemQar: string;
  taxable: boolean;
  discountEligible: boolean;
  pricingMode: 'one_time' | 'monthly_payment';
  monthlyPriceQar: string;
  imageUrl: string;
  mediaAltText: string;
  productType: string;
  vendor: string;
  tagsText: string;
  templateKey: string;
  badgesText: string;
  handle: string;
  seoTitle: string;
  seoDescription: string;
  eventAt: string;
  publishedAt: string;
  saleStartsAt: string;
  saleEndsAt: string;
  status: ProductStatus;
  stock: string;
  sku: string;
  barcode: string;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  lowStockThreshold: string;
  restockAt: string;
  supplierCostQar: string;
  purchaseOrderRef: string;
  stockStatusLabel: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  physicalProduct: boolean;
  weightGrams: string;
  packageLengthCm: string;
  packageWidthCm: string;
  packageHeightCm: string;
  requiresShipping: boolean;
  freeShippingEligible: boolean;
  countryOfOrigin: string;
  hsCode: string;
  customsDescription: string;
  digitalDelivery: boolean;
  metafieldsText: string;
  isCustomizable: boolean;
  customizationLabel: string;
  hasSizes: boolean;
  sizeOptions: ProductOptionDraft[];
  allowCustomSize: boolean;
  hasVariants: boolean;
  variantOptions: ProductOptionDraft[];
  requiresHeightInput: boolean;
  heightInputLabel: string;
  heightOptions: string[];
};

function draftOptionsFrom(value: unknown): ProductOptionDraft[] {
  return normalizePricedOptions(value).map((option) => ({
    label: option.label,
    priceDeltaQar: option.priceDeltaQar === 0 ? '' : String(option.priceDeltaQar),
  }));
}

function draftOptionsFromLabels(labels: string[]): ProductOptionDraft[] {
  return labels.map((label) => ({ label, priceDeltaQar: '' }));
}

function draftOptionsForForm(options: PricedProductOption[]): ProductOptionDraft[] {
  return options.map((option) => ({
    label: option.label,
    priceDeltaQar: option.priceDeltaQar === 0 ? '' : String(option.priceDeltaQar),
  }));
}

function dateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 16) : '';
}

function listToText(value: string[] | null | undefined): string {
  return (value ?? []).join(', ');
}

function textToList(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(',')) {
    const label = raw.replace(/\s+/g, ' ').trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function nullableNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function metafieldsToText(value: Record<string, string> | null | undefined): string {
  return Object.entries(value ?? {})
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');
}

function textToMetafields(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.includes(':') ? trimmed.indexOf(':') : trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).replace(/\s+/g, ' ').trim().slice(0, 60);
    const val = trimmed
      .slice(idx + 1)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    if (key && val) out[key] = val;
  }
  return out;
}

function defaultsFrom(initial: Product | undefined): FormState {
  if (!initial) {
    return {
      title: '',
      subtitle: '',
      description: '',
      priceQar: '',
      compareAtPriceQar: '',
      costPerItemQar: '',
      taxable: true,
      discountEligible: true,
      pricingMode: 'one_time',
      monthlyPriceQar: '',
      imageUrl: '',
      mediaAltText: '',
      productType: '',
      vendor: '',
      tagsText: '',
      templateKey: '',
      badgesText: '',
      handle: '',
      seoTitle: '',
      seoDescription: '',
      eventAt: '',
      publishedAt: '',
      saleStartsAt: '',
      saleEndsAt: '',
      status: 'active',
      stock: '0',
      sku: '',
      barcode: '',
      trackInventory: false,
      continueSellingWhenOutOfStock: false,
      lowStockThreshold: '',
      restockAt: '',
      supplierCostQar: '',
      purchaseOrderRef: '',
      stockStatusLabel: '',
      minOrderQuantity: '1',
      maxOrderQuantity: '',
      physicalProduct: true,
      weightGrams: '',
      packageLengthCm: '',
      packageWidthCm: '',
      packageHeightCm: '',
      requiresShipping: true,
      freeShippingEligible: false,
      countryOfOrigin: '',
      hsCode: '',
      customsDescription: '',
      digitalDelivery: false,
      metafieldsText: '',
      isCustomizable: false,
      customizationLabel: '',
      hasSizes: false,
      sizeOptions: [],
      allowCustomSize: false,
      hasVariants: false,
      variantOptions: [],
      requiresHeightInput: false,
      heightInputLabel: '',
      heightOptions: [],
    };
  }
  const sizeOptions = draftOptionsFrom(initial.sizeOptionPrices ?? initial.sizeOptions);
  const variantOptions = draftOptionsFrom(initial.variantOptionPrices ?? initial.variantOptions);
  const heightOptions = normalizeHeightOptions(initial.heightOptions);
  return {
    title: initial.title,
    subtitle: initial.subtitle ?? '',
    description: initial.description ?? '',
    priceQar: initial.priceQar !== null ? String(initial.priceQar) : '',
    compareAtPriceQar:
      initial.compareAtPriceQar !== null ? String(initial.compareAtPriceQar) : '',
    costPerItemQar: initial.costPerItemQar !== null ? String(initial.costPerItemQar) : '',
    taxable: initial.taxable,
    discountEligible: initial.discountEligible,
    pricingMode: initial.pricingMode,
    monthlyPriceQar: initial.monthlyPriceQar !== null ? String(initial.monthlyPriceQar) : '',
    imageUrl: initial.imageUrl ?? '',
    mediaAltText: initial.mediaAltText ?? '',
    productType: initial.productType ?? '',
    vendor: initial.vendor ?? '',
    tagsText: listToText(initial.tags),
    templateKey: initial.templateKey ?? '',
    badgesText: listToText(initial.badges),
    handle: initial.handle ?? '',
    seoTitle: initial.seoTitle ?? '',
    seoDescription: initial.seoDescription ?? '',
    eventAt: dateInputValue(initial.eventAt),
    publishedAt: dateInputValue(initial.publishedAt),
    saleStartsAt: dateInputValue(initial.saleStartsAt),
    saleEndsAt: dateInputValue(initial.saleEndsAt),
    status: initial.status,
    stock: String(initial.stock),
    sku: initial.sku ?? '',
    barcode: initial.barcode ?? '',
    trackInventory: initial.trackInventory,
    continueSellingWhenOutOfStock: initial.continueSellingWhenOutOfStock,
    lowStockThreshold:
      initial.lowStockThreshold !== null ? String(initial.lowStockThreshold) : '',
    restockAt: dateInputValue(initial.restockAt),
    supplierCostQar: initial.supplierCostQar !== null ? String(initial.supplierCostQar) : '',
    purchaseOrderRef: initial.purchaseOrderRef ?? '',
    stockStatusLabel: initial.stockStatusLabel ?? '',
    minOrderQuantity: String(initial.minOrderQuantity),
    maxOrderQuantity:
      initial.maxOrderQuantity !== null ? String(initial.maxOrderQuantity) : '',
    physicalProduct: initial.physicalProduct,
    weightGrams: initial.weightGrams !== null ? String(initial.weightGrams) : '',
    packageLengthCm:
      initial.packageDimensions.lengthCm !== null ? String(initial.packageDimensions.lengthCm) : '',
    packageWidthCm:
      initial.packageDimensions.widthCm !== null ? String(initial.packageDimensions.widthCm) : '',
    packageHeightCm:
      initial.packageDimensions.heightCm !== null ? String(initial.packageDimensions.heightCm) : '',
    requiresShipping: initial.requiresShipping,
    freeShippingEligible: initial.freeShippingEligible,
    countryOfOrigin: initial.countryOfOrigin ?? '',
    hsCode: initial.hsCode ?? '',
    customsDescription: initial.customsDescription ?? '',
    digitalDelivery: initial.digitalDelivery,
    metafieldsText: metafieldsToText(initial.metafields),
    isCustomizable: initial.isCustomizable,
    customizationLabel: initial.customizationLabel ?? '',
    hasSizes: sizeOptions.length > 0,
    sizeOptions,
    allowCustomSize: initial.allowCustomSize,
    hasVariants: variantOptions.length > 0,
    variantOptions,
    requiresHeightInput: initial.requiresHeightInput,
    heightInputLabel: initial.heightInputLabel ?? '',
    heightOptions,
  };
}

export function ProductForm({
  mode,
  storefrontSlug,
  locale,
  copy,
  initial,
  categories = [],
  initialCategoryIds = [],
  currentPlan = 'free',
  noChrome = false,
  onSaved,
  onCancel,
}: Props) {
  const t = copy.products.form;
  const isRtl = locale === 'ar' || /[\u0600-\u06ff]/.test(t.labels.status);
  const fontFamily = isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)';
  const idBase = useId();

  const [form, setForm] = useState<FormState>(defaultsFrom(initial));
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() =>
    initialCategoryIds.filter((id) => categories.some((c) => c.id === id)),
  );
  const [state, setState] = useState<ProductActionState>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  const dashboardHref = `/account/products?store=${encodeURIComponent(storefrontSlug)}`;
  const canUseMonthlyPayments = planUnlocksMonthlyPayments(currentPlan);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (state.status === 'error') setState({ status: 'idle' });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const priceParsed = form.priceQar.trim() === '' ? null : Number(form.priceQar);
    const priceQar = priceParsed === null || Number.isNaN(priceParsed) ? null : priceParsed;
    const compareAtPriceQar = nullableNumber(form.compareAtPriceQar);
    const costPerItemQar = nullableNumber(form.costPerItemQar);
    const monthlyParsed = form.monthlyPriceQar.trim() === '' ? null : Number(form.monthlyPriceQar);
    const monthlyPriceQar =
      monthlyParsed === null || Number.isNaN(monthlyParsed) ? null : monthlyParsed;
    const pricingMode =
      canUseMonthlyPayments && form.pricingMode === 'monthly_payment'
        ? 'monthly_payment'
        : 'one_time';
    const sizeOptions = form.hasSizes ? normalizePricedOptions(form.sizeOptions) : [];
    const variantOptions = form.hasVariants ? normalizePricedOptions(form.variantOptions) : [];
    const heightOptions = form.requiresHeightInput
      ? normalizeHeightOptions(form.heightOptions)
      : [];
    if (form.hasSizes && sizeOptions.length === 0) {
      setState({
        status: 'error',
        message: isRtl
          ? 'أضف مقاساً واحداً على الأقل أو أوقف خيار المقاسات.'
          : 'Add at least one size or turn Sizes off.',
        field: 'sizeOptions',
      });
      return;
    }
    if (form.hasVariants && variantOptions.length === 0) {
      setState({
        status: 'error',
        message: isRtl
          ? 'أضف خياراً واحداً على الأقل أو أوقف خيار المتغيرات.'
          : 'Add at least one variant or turn Variants off.',
        field: 'variantOptions',
      });
      return;
    }
    if (form.requiresHeightInput && heightOptions.length === 0) {
      setState({
        status: 'error',
        message: isRtl
          ? 'أضف طولاً واحداً على الأقل أو أوقف خيار الطول.'
          : 'Add at least one height option or turn Height off.',
        field: 'heightOptions',
      });
      return;
    }

    const sharedPayload = {
      slug: storefrontSlug,
      locale,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      priceQar,
      compareAtPriceQar,
      costPerItemQar,
      taxable: form.taxable,
      discountEligible: form.discountEligible,
      pricingMode,
      monthlyPriceQar,
      imageUrl: form.imageUrl.trim(),
      mediaAltText: form.mediaAltText.trim(),
      // Legacy column kept blank — server rewrites it from the picker
      // selection so older storefront surfaces keep matching.
      category: '',
      categoryIds: selectedCategoryIds,
      productType: form.productType.trim(),
      vendor: form.vendor.trim(),
      tags: textToList(form.tagsText),
      templateKey: form.templateKey.trim(),
      badges: textToList(form.badgesText),
      handle: form.handle.trim(),
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      eventAt: form.eventAt.trim(),
      publishedAt: form.publishedAt.trim(),
      saleStartsAt: form.saleStartsAt.trim(),
      saleEndsAt: form.saleEndsAt.trim(),
      status: form.status,
      stock: Math.max(0, Math.floor(nullableNumber(form.stock) ?? 0)),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      trackInventory: form.trackInventory,
      continueSellingWhenOutOfStock: form.continueSellingWhenOutOfStock,
      lowStockThreshold: nullableNumber(form.lowStockThreshold),
      restockAt: form.restockAt.trim(),
      supplierCostQar: nullableNumber(form.supplierCostQar),
      purchaseOrderRef: form.purchaseOrderRef.trim(),
      stockStatusLabel: form.stockStatusLabel.trim(),
      minOrderQuantity: Math.max(1, Math.floor(nullableNumber(form.minOrderQuantity) ?? 1)),
      maxOrderQuantity:
        nullableNumber(form.maxOrderQuantity) !== null
          ? Math.floor(nullableNumber(form.maxOrderQuantity) ?? 0)
          : null,
      physicalProduct: form.physicalProduct,
      weightGrams:
        nullableNumber(form.weightGrams) !== null
          ? Math.floor(nullableNumber(form.weightGrams) ?? 0)
          : null,
      packageDimensions: {
        lengthCm: nullableNumber(form.packageLengthCm),
        widthCm: nullableNumber(form.packageWidthCm),
        heightCm: nullableNumber(form.packageHeightCm),
      },
      requiresShipping: form.requiresShipping,
      freeShippingEligible: form.freeShippingEligible,
      countryOfOrigin: form.countryOfOrigin.trim(),
      hsCode: form.hsCode.trim(),
      customsDescription: form.customsDescription.trim(),
      digitalDelivery: form.digitalDelivery,
      metafields: textToMetafields(form.metafieldsText),
      isCustomizable: form.isCustomizable,
      customizationLabel:
        form.isCustomizable && form.customizationLabel.trim()
          ? form.customizationLabel.trim()
          : locale === 'ar'
            ? 'قابل للتخصيص'
            : 'Customizable',
      sizeOptions,
      allowCustomSize: form.hasSizes && form.allowCustomSize,
      variantOptions,
      requiresHeightInput: form.requiresHeightInput,
      heightInputLabel:
        form.requiresHeightInput && form.heightInputLabel.trim()
          ? (normalizeHeightInputLabel(form.heightInputLabel) ?? '')
          : locale === 'ar'
            ? 'الطول'
            : 'Height',
      heightOptions,
    } as const;

    setSaving(true);
    if (form.hasSizes) {
      setForm((prev) => ({ ...prev, sizeOptions: draftOptionsForForm(sizeOptions) }));
    }
    if (form.hasVariants) {
      setForm((prev) => ({ ...prev, variantOptions: draftOptionsForForm(variantOptions) }));
    }
    if (form.requiresHeightInput) {
      setForm((prev) => ({ ...prev, heightOptions }));
    }
    void (async () => {
      const result = await withSaveTimeout(
        mode === 'create'
          ? createProduct(sharedPayload)
          : updateProduct({ ...sharedPayload, id: initial!.id }),
      );
      setState(result);
      if (result.status === 'success') {
        setSaving(false);
        if (onSaved && result.product) {
          onSaved(result.product);
        } else {
          window.location.assign(dashboardHref);
        }
        return;
      }
      setSaving(false);
    })().catch((err) => {
      console.error('[ProductForm] save failed', err);
      setState({ status: 'error', message: t.error.generic });
      setSaving(false);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-[4px]"
      style={{
        background: noChrome ? 'transparent' : 'var(--surface-elevated)',
        border: noChrome ? 'none' : '1px solid var(--surface-rule)',
        padding: noChrome ? 0 : 'clamp(20px, 3vw, 36px)',
        color: 'var(--ink-strong)',
        fontFamily,
      }}
    >
      {noChrome ? null : (
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--admin-accent)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {t.eyebrow}
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily,
              fontWeight: isRtl ? 400 : 300,
              fontSize: 'clamp(22px, 2.8vw, 32px)',
              lineHeight: 1.15,
              letterSpacing: isRtl ? 0 : '-0.02em',
              color: 'var(--ink-strong)',
            }}
          >
            {mode === 'create' ? t.newTitle : t.editTitle}
          </h2>
          <p
            style={{
              color: 'var(--ink-muted)',
              fontSize: 14,
              lineHeight: 1.6,
              margin: '8px 0 0',
            }}
          >
            {t.sub}
          </p>
        </header>
      )}

      <div className="flex flex-col gap-5">
        <ImageField
          label={t.labels.image}
          helper={t.helpers.image}
          value={form.imageUrl}
          onChange={(v) => update('imageUrl', v)}
          slug={storefrontSlug}
        />

        <Field
          id={`${idBase}-title`}
          label={t.labels.title}
          value={form.title}
          onChange={(v) => update('title', v)}
          isRtl={isRtl}
          placeholder={t.placeholders.title}
          maxLength={160}
          required
        />

        <Field
          id={`${idBase}-subtitle`}
          label={isRtl ? 'وصف قصير' : 'Short description'}
          value={form.subtitle}
          onChange={(v) => update('subtitle', v)}
          isRtl={isRtl}
          placeholder={isRtl ? 'جملة قصيرة تظهر تحت اسم المنتج' : 'A short line under the title'}
          maxLength={240}
        />

        <TextArea
          id={`${idBase}-desc`}
          label={t.labels.description}
          value={form.description}
          onChange={(v) => update('description', v)}
          isRtl={isRtl}
          placeholder={t.placeholders.description}
          maxLength={4000}
        />

        <CollapsibleField
          label={isRtl ? 'واجهة المتجر و SEO' : 'Storefront & SEO'}
          summary={
            form.handle || form.seoTitle || form.tagsText
              ? isRtl
                ? 'تم ضبط بيانات الظهور'
                : 'Visibility details set'
              : isRtl
                ? 'الرابط، البحث، الشارات'
                : 'Handle, search, badges'
          }
          defaultOpen={Boolean(form.handle || form.seoTitle || form.tagsText)}
          isRtl={isRtl}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              id={`${idBase}-handle`}
              label={isRtl ? 'رابط المنتج' : 'Product URL handle'}
              value={form.handle}
              onChange={(v) => update('handle', v)}
              isRtl={false}
              placeholder="oud-amber-launch"
              maxLength={120}
              helper={
                isRtl
                  ? 'اتركه فارغاً ليتم إنشاؤه من اسم المنتج.'
                  : 'Leave blank to generate from the product title.'
              }
            />
            <Field
              id={`${idBase}-media-alt`}
              label={isRtl ? 'وصف الوسائط' : 'Media alt text'}
              value={form.mediaAltText}
              onChange={(v) => update('mediaAltText', v)}
              isRtl={isRtl}
              maxLength={180}
            />
            <Field
              id={`${idBase}-product-type`}
              label={isRtl ? 'نوع المنتج' : 'Product type'}
              value={form.productType}
              onChange={(v) => update('productType', v)}
              isRtl={isRtl}
              placeholder={isRtl ? 'عطر، باقة، خدمة' : 'Perfume, bundle, service'}
              maxLength={80}
            />
            <Field
              id={`${idBase}-vendor`}
              label={isRtl ? 'العلامة / المورد' : 'Brand / vendor'}
              value={form.vendor}
              onChange={(v) => update('vendor', v)}
              isRtl={isRtl}
              maxLength={120}
            />
            <Field
              id={`${idBase}-tags`}
              label={isRtl ? 'وسوم' : 'Tags'}
              value={form.tagsText}
              onChange={(v) => update('tagsText', v)}
              isRtl={isRtl}
              placeholder={isRtl ? 'رمضان، هدية، فاخر' : 'Ramadan, gift, premium'}
              helper={isRtl ? 'افصل بينها بفواصل.' : 'Separate with commas.'}
            />
            <Field
              id={`${idBase}-badges`}
              label={isRtl ? 'شارات المنتج' : 'Product badges'}
              value={form.badgesText}
              onChange={(v) => update('badgesText', v)}
              isRtl={isRtl}
              placeholder={isRtl ? 'جديد، الأكثر مبيعاً' : 'New, bestseller'}
              helper={isRtl ? 'افصل بينها بفواصل.' : 'Separate with commas.'}
            />
            <Field
              id={`${idBase}-template`}
              label={isRtl ? 'قالب المنتج' : 'Product template'}
              value={form.templateKey}
              onChange={(v) => update('templateKey', v)}
              isRtl={false}
              placeholder="premium-detail"
              maxLength={80}
            />
            <Field
              id={`${idBase}-published-at`}
              label={isRtl ? 'تاريخ النشر' : 'Publish date'}
              value={form.publishedAt}
              onChange={(v) => update('publishedAt', v)}
              isRtl={false}
              type="datetime-local"
            />
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              id={`${idBase}-seo-title`}
              label={isRtl ? 'عنوان SEO' : 'SEO title'}
              value={form.seoTitle}
              onChange={(v) => update('seoTitle', v)}
              isRtl={isRtl}
              maxLength={160}
            />
            <TextArea
              id={`${idBase}-seo-description`}
              label={isRtl ? 'وصف SEO' : 'SEO description'}
              value={form.seoDescription}
              onChange={(v) => update('seoDescription', v)}
              isRtl={isRtl}
              maxLength={220}
            />
          </div>
        </CollapsibleField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            id={`${idBase}-price`}
            label={t.labels.price}
            value={form.priceQar}
            onChange={(v) => update('priceQar', v)}
            isRtl={false}
            type="number"
            placeholder={t.placeholders.price}
            helper={t.helpers.priceOptional}
          />
          {canUseMonthlyPayments ? (
            <PricingModeField
              idBase={`${idBase}-pricing`}
              mode={form.pricingMode}
              onModeChange={(v) => update('pricingMode', v)}
              monthlyPrice={form.monthlyPriceQar}
              onMonthlyPriceChange={(v) => update('monthlyPriceQar', v)}
              isRtl={isRtl}
            />
          ) : null}
          <CategoryPicker
            label={t.labels.category}
            helper={t.helpers.category}
            categories={categoryList}
            value={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            storefrontSlug={storefrontSlug}
            isRtl={isRtl}
            onCategoryCreated={(cat) => {
              setCategoryList((prev) => [...prev, cat]);
              setSelectedCategoryIds((prev) => (prev.includes(cat.id) ? prev : [...prev, cat.id]));
            }}
          />
        </div>

        <CollapsibleField
          label={isRtl ? 'التسعير والحدود' : 'Pricing controls'}
          summary={
            form.compareAtPriceQar || form.costPerItemQar || form.maxOrderQuantity
              ? isRtl
                ? 'تم ضبط أسعار إضافية'
                : 'Extra pricing set'
              : isRtl
                ? 'السعر قبل الخصم، التكلفة، الكمية'
                : 'Compare-at, cost, quantity'
          }
          defaultOpen={Boolean(form.compareAtPriceQar || form.costPerItemQar)}
          isRtl={isRtl}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              id={`${idBase}-compare-price`}
              label={isRtl ? 'السعر قبل الخصم' : 'Compare-at price'}
              value={form.compareAtPriceQar}
              onChange={(v) => update('compareAtPriceQar', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-cost-price`}
              label={isRtl ? 'تكلفة المنتج' : 'Cost per item'}
              value={form.costPerItemQar}
              onChange={(v) => update('costPerItemQar', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-sale-start`}
              label={isRtl ? 'بداية التخفيض' : 'Sale starts'}
              value={form.saleStartsAt}
              onChange={(v) => update('saleStartsAt', v)}
              isRtl={false}
              type="datetime-local"
            />
            <Field
              id={`${idBase}-sale-end`}
              label={isRtl ? 'نهاية التخفيض' : 'Sale ends'}
              value={form.saleEndsAt}
              onChange={(v) => update('saleEndsAt', v)}
              isRtl={false}
              type="datetime-local"
            />
            <Field
              id={`${idBase}-min-qty`}
              label={isRtl ? 'أقل كمية للطلب' : 'Minimum order quantity'}
              value={form.minOrderQuantity}
              onChange={(v) => update('minOrderQuantity', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-max-qty`}
              label={isRtl ? 'أعلى كمية للطلب' : 'Maximum order quantity'}
              value={form.maxOrderQuantity}
              onChange={(v) => update('maxOrderQuantity', v)}
              isRtl={false}
              type="number"
            />
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow
              label={isRtl ? 'خاضع للضريبة' : 'Taxable product'}
              helper={isRtl ? 'يُحسب ضمن إعدادات الضرائب.' : 'Included in tax settings.'}
              checked={form.taxable}
              onChange={(v) => update('taxable', v)}
              isRtl={isRtl}
            />
            <ToggleRow
              label={isRtl ? 'مؤهل للخصومات' : 'Discount eligible'}
              helper={isRtl ? 'يسمح بتطبيق أكواد الخصم.' : 'Allow discount codes on this item.'}
              checked={form.discountEligible}
              onChange={(v) => update('discountEligible', v)}
              isRtl={isRtl}
            />
          </div>
        </CollapsibleField>

        <CollapsibleField
          label={isRtl ? 'المخزون' : 'Inventory'}
          summary={
            form.sku || form.trackInventory
              ? isRtl
                ? 'تم ضبط SKU أو تتبع المخزون'
                : 'SKU or tracking enabled'
              : isRtl
                ? 'SKU، الباركود، نفاد المخزون'
                : 'SKU, barcode, stock'
          }
          defaultOpen={Boolean(form.sku || form.trackInventory)}
          isRtl={isRtl}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field
              id={`${idBase}-stock`}
              label={isRtl ? 'الكمية' : 'Stock'}
              value={form.stock}
              onChange={(v) => update('stock', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-sku`}
              label="SKU"
              value={form.sku}
              onChange={(v) => update('sku', v)}
              isRtl={false}
              maxLength={80}
            />
            <Field
              id={`${idBase}-barcode`}
              label={isRtl ? 'الباركود' : 'Barcode / GTIN'}
              value={form.barcode}
              onChange={(v) => update('barcode', v)}
              isRtl={false}
              maxLength={80}
            />
            <Field
              id={`${idBase}-low-stock`}
              label={isRtl ? 'حد المخزون المنخفض' : 'Low-stock threshold'}
              value={form.lowStockThreshold}
              onChange={(v) => update('lowStockThreshold', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-restock`}
              label={isRtl ? 'تاريخ إعادة التوفر' : 'Restock date'}
              value={form.restockAt}
              onChange={(v) => update('restockAt', v)}
              isRtl={false}
              type="datetime-local"
            />
            <Field
              id={`${idBase}-stock-label`}
              label={isRtl ? 'وسم حالة المخزون' : 'Stock status label'}
              value={form.stockStatusLabel}
              onChange={(v) => update('stockStatusLabel', v)}
              isRtl={isRtl}
              maxLength={80}
            />
            <Field
              id={`${idBase}-supplier-cost`}
              label={isRtl ? 'تكلفة المورد' : 'Supplier cost'}
              value={form.supplierCostQar}
              onChange={(v) => update('supplierCostQar', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-po-ref`}
              label={isRtl ? 'مرجع أمر الشراء' : 'Purchase order ref'}
              value={form.purchaseOrderRef}
              onChange={(v) => update('purchaseOrderRef', v)}
              isRtl={false}
              maxLength={80}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow
              label={isRtl ? 'تتبع الكمية' : 'Track quantity'}
              helper={isRtl ? 'يمنع البيع عند النفاد إذا لم تسمح بالاستمرار.' : 'Controls sold-out behavior.'}
              checked={form.trackInventory}
              onChange={(v) => update('trackInventory', v)}
              isRtl={isRtl}
            />
            <ToggleRow
              label={isRtl ? 'استمر بالبيع عند النفاد' : 'Continue selling when out of stock'}
              helper={isRtl ? 'مفيد للطلبات المسبقة.' : 'Useful for preorders.'}
              checked={form.continueSellingWhenOutOfStock}
              onChange={(v) => update('continueSellingWhenOutOfStock', v)}
              isRtl={isRtl}
            />
          </div>
        </CollapsibleField>

        <CollapsibleField
          label={isRtl ? 'الشحن والبيانات' : 'Shipping & custom data'}
          summary={
            form.weightGrams || form.metafieldsText
              ? isRtl
                ? 'تم ضبط بيانات إضافية'
                : 'Extra product data set'
              : isRtl
                ? 'الوزن، الأبعاد، الحقول المخصصة'
                : 'Weight, dimensions, metafields'
          }
          defaultOpen={Boolean(form.weightGrams || form.metafieldsText)}
          isRtl={isRtl}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow
              label={isRtl ? 'منتج فعلي' : 'Physical product'}
              helper={isRtl ? 'يحتاج شحناً أو توصيلاً.' : 'Requires delivery or pickup.'}
              checked={form.physicalProduct}
              onChange={(v) => update('physicalProduct', v)}
              isRtl={isRtl}
            />
            <ToggleRow
              label={isRtl ? 'يتطلب الشحن' : 'Requires shipping'}
              helper={isRtl ? 'يظهر ضمن حساب الشحن.' : 'Included in shipping calculations.'}
              checked={form.requiresShipping}
              onChange={(v) => update('requiresShipping', v)}
              isRtl={isRtl}
            />
            <ToggleRow
              label={isRtl ? 'مؤهل للشحن المجاني' : 'Free shipping eligible'}
              helper={isRtl ? 'يستخدم مع إعدادات الشحن.' : 'Works with shipping rules.'}
              checked={form.freeShippingEligible}
              onChange={(v) => update('freeShippingEligible', v)}
              isRtl={isRtl}
            />
            <ToggleRow
              label={isRtl ? 'منتج رقمي' : 'Digital product'}
              helper={isRtl ? 'للملفات أو التنزيلات.' : 'For downloads or files.'}
              checked={form.digitalDelivery}
              onChange={(v) => update('digitalDelivery', v)}
              isRtl={isRtl}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-5">
            <Field
              id={`${idBase}-weight`}
              label={isRtl ? 'الوزن بالجرام' : 'Weight (g)'}
              value={form.weightGrams}
              onChange={(v) => update('weightGrams', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-dim-l`}
              label={isRtl ? 'الطول سم' : 'Length cm'}
              value={form.packageLengthCm}
              onChange={(v) => update('packageLengthCm', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-dim-w`}
              label={isRtl ? 'العرض سم' : 'Width cm'}
              value={form.packageWidthCm}
              onChange={(v) => update('packageWidthCm', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-dim-h`}
              label={isRtl ? 'الارتفاع سم' : 'Height cm'}
              value={form.packageHeightCm}
              onChange={(v) => update('packageHeightCm', v)}
              isRtl={false}
              type="number"
            />
            <Field
              id={`${idBase}-origin`}
              label={isRtl ? 'بلد المنشأ' : 'Country of origin'}
              value={form.countryOfOrigin}
              onChange={(v) => update('countryOfOrigin', v)}
              isRtl={isRtl}
              maxLength={80}
            />
            <Field
              id={`${idBase}-hs-code`}
              label="HS code"
              value={form.hsCode}
              onChange={(v) => update('hsCode', v)}
              isRtl={false}
              maxLength={40}
            />
            <Field
              id={`${idBase}-customs`}
              label={isRtl ? 'وصف الجمارك' : 'Customs description'}
              value={form.customsDescription}
              onChange={(v) => update('customsDescription', v)}
              isRtl={isRtl}
              maxLength={160}
            />
          </div>
          <div className="mt-5">
            <TextArea
              id={`${idBase}-metafields`}
              label={isRtl ? 'حقول مخصصة' : 'Product metafields'}
              value={form.metafieldsText}
              onChange={(v) => update('metafieldsText', v)}
              isRtl={isRtl}
              placeholder={isRtl ? 'المكونات: عود، عنبر' : 'Ingredients: oud, amber'}
              maxLength={2000}
            />
          </div>
        </CollapsibleField>

        <CollapsibleField
          label={t.labels.eventAt}
          summary={
            form.eventAt
              ? new Date(form.eventAt).toLocaleString(isRtl ? 'ar-QA' : undefined)
              : isRtl
                ? 'أضف تاريخاً'
                : 'Add a date'
          }
          defaultOpen={Boolean(form.eventAt)}
          onClear={form.eventAt ? () => update('eventAt', '') : undefined}
          clearLabel={isRtl ? 'مسح' : 'Clear'}
          isRtl={isRtl}
        >
          <input
            id={`${idBase}-when`}
            type="datetime-local"
            value={form.eventAt}
            onChange={(e) => update('eventAt', e.target.value)}
            placeholder={t.placeholders.eventAt}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--surface-rule-strong)',
              color: 'var(--ink-strong)',
              padding: '10px 0',
              marginTop: 6,
              fontFamily: 'var(--font-sans)',
              fontSize: 16,
              outline: 'none',
            }}
          />
          <p
            className="m-0 mt-2"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.03em',
            }}
          >
            {t.helpers.eventAt}
          </p>
        </CollapsibleField>

        <CustomizableField
          idBase={`${idBase}-customizable`}
          checked={form.isCustomizable}
          label={form.customizationLabel}
          defaultLabel={locale === 'ar' ? 'قابل للتخصيص' : 'Customizable'}
          labels={{
            checkbox: t.labels.customizable,
            customLabel: t.labels.customizationLabel,
          }}
          helpers={{
            checkbox: t.helpers.customizable,
            customLabel: t.helpers.customizationLabel,
          }}
          onCheckedChange={(v) => update('isCustomizable', v)}
          onLabelChange={(v) => update('customizationLabel', v)}
          isRtl={isRtl}
        />

        <div
          style={{
            display: 'grid',
            gap: 4,
            paddingTop: 4,
            color: 'var(--ink-muted)',
            direction: isRtl ? 'rtl' : 'ltr',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {isRtl ? 'اختيارات مخصصة' : 'Custom selections'}
          </span>
          <span
            style={{
              fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-faint)',
            }}
          >
            {isRtl
              ? 'فعّل المقاسات أو المتغيرات فقط عندما يحتاج المنتج لاختيار من العميل.'
              : 'Turn on sizes or variants only when the product needs a buyer choice.'}
          </span>
        </div>

        <SizeOptionsField
          idBase={`${idBase}-sizes`}
          enabled={form.hasSizes}
          values={form.sizeOptions}
          onEnabledChange={(enabled) =>
            setForm((prev) => ({
              ...prev,
              hasSizes: enabled,
              sizeOptions:
                enabled && normalizePricedOptions(prev.sizeOptions).length === 0
                  ? draftOptionsFromLabels(['S', 'M', 'L', 'XL'])
                  : prev.sizeOptions,
              allowCustomSize: enabled ? prev.allowCustomSize : false,
            }))
          }
          onValuesChange={(values) => update('sizeOptions', values)}
          allowCustomSize={form.allowCustomSize}
          onAllowCustomSizeChange={(enabled) => update('allowCustomSize', enabled)}
          isRtl={isRtl}
        />

        <VariantOptionsField
          idBase={`${idBase}-variants`}
          enabled={form.hasVariants}
          values={form.variantOptions}
          onEnabledChange={(enabled) =>
            setForm((prev) => ({
              ...prev,
              hasVariants: enabled,
              variantOptions:
                enabled && normalizePricedOptions(prev.variantOptions).length === 0
                  ? draftOptionsFromLabels(DEFAULT_PRODUCT_VARIANT_OPTIONS)
                  : prev.variantOptions,
            }))
          }
          onValuesChange={(values) => update('variantOptions', values)}
          isRtl={isRtl}
        />

        <HeightOptionsField
          idBase={`${idBase}-height-input`}
          enabled={form.requiresHeightInput}
          label={form.heightInputLabel}
          values={form.heightOptions}
          defaultLabel={locale === 'ar' ? 'الطول' : 'Height'}
          onEnabledChange={(enabled) =>
            setForm((prev) => ({
              ...prev,
              requiresHeightInput: enabled,
              heightInputLabel:
                enabled && !prev.heightInputLabel.trim()
                  ? locale === 'ar'
                    ? 'الطول'
                    : 'Height'
                  : prev.heightInputLabel,
              heightOptions:
                enabled && normalizeHeightOptions(prev.heightOptions).length === 0
                  ? DEFAULT_PRODUCT_HEIGHT_OPTIONS
                  : prev.heightOptions,
            }))
          }
          onLabelChange={(value) => update('heightInputLabel', value)}
          onValuesChange={(values) => update('heightOptions', values)}
          isRtl={isRtl}
        />

        <StatusField
          label={t.labels.status}
          value={form.status}
          onChange={(v) => update('status', v)}
          options={[
            { id: 'active', label: t.status.active },
            { id: 'draft', label: t.status.draft },
            { id: 'sold_out', label: t.status.sold_out },
          ]}
          isRtl={isRtl}
        />
      </div>

      {state.status === 'error' && (
        <p
          role="alert"
          className="mt-5"
          style={{
            color: '#f1b1a1',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.03em',
          }}
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-between mt-9 flex-wrap gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontFamily,
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isRtl ? `→ ${t.cancel}` : `← ${t.cancel}`}
          </button>
        ) : (
          <a
            href={dashboardHref}
            style={{
              color: 'var(--ink-muted)',
              fontFamily,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {isRtl ? `→ ${t.cancel}` : `← ${t.cancel}`}
          </a>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? 'rgba(216,180,106,0.58)' : '#d8b46a',
            color: '#16110a',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '14px 22px',
            borderRadius: 999,
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {saving
            ? `${mode === 'create' ? t.submit.create : t.submit.save}…`
            : mode === 'create'
              ? t.submit.create
              : t.submit.save}{' '}
          <span aria-hidden>◈</span>
        </button>
      </div>
    </form>
  );
}

function withSaveTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Product save timed out'));
    }, PRODUCT_SAVE_TIMEOUT_MS);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function FormLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--ink-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </label>
  );
}

function PricingModeField({
  idBase,
  mode,
  onModeChange,
  monthlyPrice,
  onMonthlyPriceChange,
  isRtl,
}: {
  idBase: string;
  mode: 'one_time' | 'monthly_payment';
  onModeChange: (v: 'one_time' | 'monthly_payment') => void;
  monthlyPrice: string;
  onMonthlyPriceChange: (v: string) => void;
  isRtl: boolean;
}) {
  return (
    <div>
      <FormLabel htmlFor={`${idBase}-mode`}>{isRtl ? 'طريقة التسعير' : 'Pricing mode'}</FormLabel>
      <select
        id={`${idBase}-mode`}
        value={mode}
        onChange={(e) => onModeChange(e.target.value as 'one_time' | 'monthly_payment')}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--surface-rule-strong)',
          color: 'var(--ink-strong)',
          padding: '10px 0',
          marginTop: 8,
          fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
          fontSize: 18,
          outline: 'none',
        }}
      >
        <option value="one_time">{isRtl ? 'دفعة واحدة' : 'One-time'}</option>
        <option value="monthly_payment">{isRtl ? 'دفعات شهرية' : 'Monthly payments'}</option>
      </select>
      {mode === 'monthly_payment' ? (
        <input
          id={`${idBase}-monthly`}
          type="number"
          min={0}
          step={1}
          value={monthlyPrice}
          onChange={(e) => onMonthlyPriceChange(e.target.value)}
          placeholder={isRtl ? 'السعر الشهري' : 'Monthly price'}
          dir="ltr"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--surface-rule-strong)',
            color: 'var(--ink-strong)',
            padding: '10px 0',
            marginTop: 10,
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            outline: 'none',
          }}
        />
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  isRtl,
  placeholder,
  helper,
  type = 'text',
  maxLength,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  isRtl: boolean;
  placeholder?: string;
  helper?: string;
  type?: 'text' | 'number' | 'datetime-local';
  maxLength?: number;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${
            focused ? 'var(--admin-accent)' : 'var(--surface-rule-strong)'
          }`,
          color: 'var(--ink-strong)',
          padding: '10px 0',
          marginTop: 8,
          fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
          fontSize: 18,
          letterSpacing: '-0.005em',
          outline: 'none',
          transition: 'border-color 200ms',
        }}
      />
      {helper ? (
        <p
          className="mt-2 m-0"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-faint)',
            letterSpacing: '0.03em',
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  isRtl,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  isRtl: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${focused ? 'var(--admin-accent)' : 'var(--surface-rule-strong)'}`,
          color: 'var(--ink-strong)',
          padding: '12px 14px',
          marginTop: 8,
          fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
          fontSize: 15,
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          outline: 'none',
          transition: 'border-color 200ms',
          borderRadius: 4,
          resize: 'vertical',
        }}
      />
    </div>
  );
}

function CustomizableField({
  idBase,
  checked,
  label,
  defaultLabel,
  labels,
  helpers,
  onCheckedChange,
  onLabelChange,
  isRtl,
}: {
  idBase: string;
  checked: boolean;
  label: string;
  defaultLabel: string;
  labels: { checkbox: string; customLabel: string };
  helpers: { checkbox: string; customLabel: string };
  onCheckedChange: (v: boolean) => void;
  onLabelChange: (v: string) => void;
  isRtl: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--surface-rule)',
        borderRadius: 8,
        background: 'var(--surface-bg)',
        padding: 14,
        display: 'grid',
        gap: checked ? 14 : 0,
      }}
    >
      <label
        htmlFor={`${idBase}-check`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          color: 'var(--ink-strong)',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <input
          id={`${idBase}-check`}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          style={{
            marginTop: 3,
            accentColor: 'var(--admin-accent)',
            width: 16,
            height: 16,
            flex: '0 0 auto',
          }}
        />
        <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {labels.checkbox}
          </span>
          <span
            style={{
              fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-faint)',
            }}
          >
            {helpers.checkbox}
          </span>
        </span>
      </label>
      {checked ? (
        <Field
          id={`${idBase}-label`}
          label={labels.customLabel}
          value={label}
          onChange={onLabelChange}
          isRtl={isRtl}
          placeholder={defaultLabel}
          helper={helpers.customLabel}
          maxLength={48}
        />
      ) : null}
    </div>
  );
}

function SizeOptionsField({
  idBase,
  enabled,
  values,
  allowCustomSize,
  onEnabledChange,
  onValuesChange,
  onAllowCustomSizeChange,
  isRtl,
}: {
  idBase: string;
  enabled: boolean;
  values: ProductOptionDraft[];
  allowCustomSize: boolean;
  onEnabledChange: (v: boolean) => void;
  onValuesChange: (v: ProductOptionDraft[]) => void;
  onAllowCustomSizeChange: (v: boolean) => void;
  isRtl: boolean;
}) {
  const labels = isRtl
    ? {
        checkbox: 'المقاسات',
        helper: 'فعّلها للملابس أو الأحذية أو أي منتج يحتاج اختيار مقاس.',
        customCheckbox: 'مقاس مخصص',
        customHelper: 'اسمح للعميل بكتابة مقاس غير موجود في القائمة.',
        input: 'المقاس',
        price: 'تغيير السعر',
        priceHelper: 'اختياري — اتركه فارغاً بدون تغيير.',
        add: 'أضف مقاس',
        remove: 'حذف المقاس',
      }
    : {
        checkbox: 'Sizes',
        helper: 'Enable for apparel, shoes, or any product that needs a size choice.',
        customCheckbox: 'Custom size',
        customHelper: 'Let shoppers type a missing size before adding to cart.',
        input: 'Size',
        price: 'Price change',
        priceHelper: 'Optional — blank means no change.',
        add: 'Add size',
        remove: 'Remove size',
      };
  const safeValues = values.length > 0 ? values : [{ label: '', priceDeltaQar: '' }];

  function updateLabelAt(index: number, value: string) {
    onValuesChange(safeValues.map((item, i) => (i === index ? { ...item, label: value } : item)));
  }

  function updatePriceAt(index: number, value: string) {
    onValuesChange(
      safeValues.map((item, i) => (i === index ? { ...item, priceDeltaQar: value } : item)),
    );
  }

  function removeAt(index: number) {
    const next = safeValues.filter((_, i) => i !== index);
    onValuesChange(next.length > 0 ? next : [{ label: '', priceDeltaQar: '' }]);
  }

  return (
    <div
      style={{
        border: '1px solid var(--surface-rule)',
        borderRadius: 8,
        background: 'var(--surface-bg)',
        padding: 14,
        display: 'grid',
        gap: enabled ? 14 : 0,
      }}
    >
      <label
        htmlFor={`${idBase}-check`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          color: 'var(--ink-strong)',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <input
          id={`${idBase}-check`}
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          style={{
            marginTop: 3,
            accentColor: 'var(--admin-accent)',
            width: 16,
            height: 16,
            flex: '0 0 auto',
          }}
        />
        <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {labels.checkbox}
          </span>
          <span
            style={{
              fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-faint)',
            }}
          >
            {labels.helper}
          </span>
        </span>
      </label>

      {enabled ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 10,
            }}
          >
            {safeValues.map((value, index) => (
              <div
                key={`${idBase}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(92px, 0.8fr) 36px',
                  alignItems: 'end',
                  gap: 8,
                }}
              >
                <Field
                  id={`${idBase}-${index}`}
                  label={`${labels.input} ${index + 1}`}
                  value={value.label}
                  onChange={(next) => updateLabelAt(index, next)}
                  isRtl={isRtl}
                  placeholder={['S', 'M', 'L', 'XL'][index] ?? 'S-1'}
                  maxLength={40}
                />
                <Field
                  id={`${idBase}-${index}-price`}
                  label={labels.price}
                  value={value.priceDeltaQar}
                  onChange={(next) => updatePriceAt(index, next)}
                  isRtl={false}
                  type="number"
                  placeholder="+0"
                  helper={index === 0 ? labels.priceHelper : undefined}
                />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={labels.remove}
                  title={labels.remove}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '1px solid var(--surface-rule-strong)',
                    background: 'transparent',
                    color: 'var(--ink-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  }}
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onValuesChange([...safeValues, { label: '', priceDeltaQar: '' }]);
            }}
            style={{
              justifySelf: isRtl ? 'end' : 'start',
              border: '1px dashed var(--admin-accent)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--admin-accent)',
              minHeight: 38,
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Plus size={14} aria-hidden />
            {labels.add}
          </button>
          <label
            htmlFor={`${idBase}-custom-check`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              color: 'var(--ink-strong)',
              direction: isRtl ? 'rtl' : 'ltr',
              border: '1px dashed var(--surface-rule)',
              borderRadius: 8,
              padding: 12,
            }}
          >
            <input
              id={`${idBase}-custom-check`}
              type="checkbox"
              checked={allowCustomSize}
              onChange={(e) => onAllowCustomSizeChange(e.target.checked)}
              style={{
                marginTop: 3,
                accentColor: 'var(--admin-accent)',
                width: 16,
                height: 16,
                flex: '0 0 auto',
              }}
            />
            <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                }}
              >
                {labels.customCheckbox}
              </span>
              <span
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--ink-faint)',
                }}
              >
                {labels.customHelper}
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function VariantOptionsField({
  idBase,
  enabled,
  values,
  onEnabledChange,
  onValuesChange,
  isRtl,
}: {
  idBase: string;
  enabled: boolean;
  values: ProductOptionDraft[];
  onEnabledChange: (v: boolean) => void;
  onValuesChange: (v: ProductOptionDraft[]) => void;
  isRtl: boolean;
}) {
  const labels = isRtl
    ? {
        checkbox: 'المتغيرات',
        helper: 'فعّلها للألوان أو الروائح أو النكهات أو أي اختيار آخر خاص بالمنتج.',
        input: 'المتغير',
        price: 'تغيير السعر',
        priceHelper: 'اختياري — اتركه فارغاً بدون تغيير.',
        add: 'أضف متغير',
        remove: 'حذف المتغير',
      }
    : {
        checkbox: 'Variants',
        helper: 'Enable for colors, scents, flavors, editions, or any extra product choice.',
        input: 'Variant',
        price: 'Price change',
        priceHelper: 'Optional — blank means no change.',
        add: 'Add variant',
        remove: 'Remove variant',
      };
  const safeValues = values.length > 0 ? values : [{ label: '', priceDeltaQar: '' }];

  function updateLabelAt(index: number, value: string) {
    onValuesChange(safeValues.map((item, i) => (i === index ? { ...item, label: value } : item)));
  }

  function updatePriceAt(index: number, value: string) {
    onValuesChange(
      safeValues.map((item, i) => (i === index ? { ...item, priceDeltaQar: value } : item)),
    );
  }

  function removeAt(index: number) {
    const next = safeValues.filter((_, i) => i !== index);
    onValuesChange(next.length > 0 ? next : [{ label: '', priceDeltaQar: '' }]);
  }

  return (
    <div
      style={{
        border: '1px solid var(--surface-rule)',
        borderRadius: 8,
        background: 'var(--surface-bg)',
        padding: 14,
        display: 'grid',
        gap: enabled ? 14 : 0,
      }}
    >
      <label
        htmlFor={`${idBase}-check`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          color: 'var(--ink-strong)',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <input
          id={`${idBase}-check`}
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          style={{
            marginTop: 3,
            accentColor: 'var(--admin-accent)',
            width: 16,
            height: 16,
            flex: '0 0 auto',
          }}
        />
        <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {labels.checkbox}
          </span>
          <span
            style={{
              fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-faint)',
            }}
          >
            {labels.helper}
          </span>
        </span>
      </label>

      {enabled ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 10,
            }}
          >
            {safeValues.map((value, index) => (
              <div
                key={`${idBase}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(92px, 0.8fr) 36px',
                  alignItems: 'end',
                  gap: 8,
                }}
              >
                <Field
                  id={`${idBase}-${index}`}
                  label={`${labels.input} ${index + 1}`}
                  value={value.label}
                  onChange={(next) => updateLabelAt(index, next)}
                  isRtl={isRtl}
                  placeholder={DEFAULT_PRODUCT_VARIANT_OPTIONS[index] ?? 'Limited edition'}
                  maxLength={40}
                />
                <Field
                  id={`${idBase}-${index}-price`}
                  label={labels.price}
                  value={value.priceDeltaQar}
                  onChange={(next) => updatePriceAt(index, next)}
                  isRtl={false}
                  type="number"
                  placeholder="+0"
                  helper={index === 0 ? labels.priceHelper : undefined}
                />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={labels.remove}
                  title={labels.remove}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '1px solid var(--surface-rule-strong)',
                    background: 'transparent',
                    color: 'var(--ink-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  }}
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onValuesChange([...safeValues, { label: '', priceDeltaQar: '' }])}
            style={{
              justifySelf: isRtl ? 'end' : 'start',
              border: '1px dashed var(--admin-accent)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--admin-accent)',
              minHeight: 38,
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Plus size={14} aria-hidden />
            {labels.add}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeightOptionsField({
  idBase,
  enabled,
  label,
  values,
  defaultLabel,
  onEnabledChange,
  onLabelChange,
  onValuesChange,
  isRtl,
}: {
  idBase: string;
  enabled: boolean;
  label: string;
  values: string[];
  defaultLabel: string;
  onEnabledChange: (v: boolean) => void;
  onLabelChange: (v: string) => void;
  onValuesChange: (v: string[]) => void;
  isRtl: boolean;
}) {
  const labels = isRtl
    ? {
        checkbox: 'الطول',
        helper: 'فعّله للعبايات أو أي منتج يحتاج اختيار طول.',
        customLabel: 'عنوان الحقل',
        customHelper: 'سيظهر هذا الاسم للعميل قبل الإضافة إلى السلة.',
        input: 'الطول',
        add: 'أضف طول',
        remove: 'حذف الطول',
      }
    : {
        checkbox: 'Height',
        helper: 'Enable for abayas or any product that needs a height choice.',
        customLabel: 'Field label',
        customHelper: 'This label appears to shoppers before adding the product to cart.',
        input: 'Height',
        add: 'Add height',
        remove: 'Remove height',
      };
  const safeValues = values.length > 0 ? values : [''];

  function updateAt(index: number, value: string) {
    onValuesChange(safeValues.map((item, i) => (i === index ? value : item)));
  }

  function removeAt(index: number) {
    const next = safeValues.filter((_, i) => i !== index);
    onValuesChange(next.length > 0 ? next : ['']);
  }

  return (
    <div
      style={{
        border: '1px solid var(--surface-rule)',
        borderRadius: 8,
        background: 'var(--surface-bg)',
        padding: 14,
        display: 'grid',
        gap: enabled ? 14 : 0,
      }}
    >
      <label
        htmlFor={`${idBase}-check`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          color: 'var(--ink-strong)',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <input
          id={`${idBase}-check`}
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          style={{
            marginTop: 3,
            accentColor: 'var(--admin-accent)',
            width: 16,
            height: 16,
            flex: '0 0 auto',
          }}
        />
        <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {labels.checkbox}
          </span>
          <span
            style={{
              fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--ink-faint)',
            }}
          >
            {labels.helper}
          </span>
        </span>
      </label>

      {enabled ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <Field
            id={`${idBase}-label`}
            label={labels.customLabel}
            value={label}
            onChange={onLabelChange}
            isRtl={isRtl}
            placeholder={defaultLabel}
            helper={labels.customHelper}
            maxLength={40}
          />
          <div style={{ display: 'grid', gap: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
                gap: 10,
              }}
            >
              {safeValues.map((value, index) => (
                <div
                  key={`${idBase}-${index}`}
                  style={{ display: 'flex', alignItems: 'end', gap: 8 }}
                >
                  <Field
                    id={`${idBase}-option-${index}`}
                    label={`${labels.input} ${index + 1}`}
                    value={value}
                    onChange={(next) => updateAt(index, next)}
                    isRtl={isRtl}
                    placeholder={DEFAULT_PRODUCT_HEIGHT_OPTIONS[index] ?? '180'}
                    maxLength={40}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label={labels.remove}
                    title={labels.remove}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: '1px solid var(--surface-rule-strong)',
                      background: 'transparent',
                      color: 'var(--ink-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flex: '0 0 auto',
                    }}
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onValuesChange([...safeValues, '']);
              }}
              style={{
                justifySelf: isRtl ? 'end' : 'start',
                border: '1px dashed var(--admin-accent)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--admin-accent)',
                minHeight: 38,
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <Plus size={14} aria-hidden />
              {labels.add}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Disclosure section for an optional field. Stays collapsed until the
 * founder opens it, so the form's primary path stays uncluttered. Used
 * for "Date & time" — the only product field most catalogues never
 * touch (calendar archetype + event listings only).
 */
function CollapsibleField({
  label,
  summary,
  defaultOpen,
  onClear,
  clearLabel = 'Clear',
  isRtl = false,
  children,
}: {
  label: string;
  summary: string;
  defaultOpen?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  isRtl?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(Boolean(defaultOpen));
  return (
    <div
      style={{
        border: '1px solid var(--surface-rule)',
        borderRadius: 8,
        background: 'var(--surface-bg)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-strong)',
          textAlign: isRtl ? 'right' : 'left',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--ink-faint)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {summary}
          </span>
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {onClear ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid var(--surface-rule-strong)',
              }}
            >
              {clearLabel}
            </span>
          ) : null}
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 160ms',
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ▾
          </span>
        </span>
      </button>
      {open ? (
        <div
          style={{
            padding: '4px 14px 14px',
            borderTop: '1px dashed var(--surface-rule)',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Multi-select chip picker for categories. Replaces the legacy free-text
 * `category` input — categories are now first-class records (table
 * `categories` from migration 011), so the founder picks from the
 * existing list and can spawn a brand-new one inline without leaving the
 * product modal.
 *
 * Quick-create flow: typing in the search box surfaces a "+ Create
 * 'name'" affordance when the query doesn't match any existing
 * category. Hitting it calls `createCategory` directly and adopts the
 * returned row into the picker via `onCategoryCreated`.
 */
function CategoryPicker({
  label,
  helper,
  categories,
  value,
  onChange,
  storefrontSlug,
  isRtl,
  onCategoryCreated,
}: {
  label: string;
  helper?: string;
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
  storefrontSlug: string;
  isRtl: boolean;
  onCategoryCreated: (cat: Category) => void;
}) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [sorted, query]);

  const trimmedQuery = query.trim();
  const exactMatch = sorted.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreate = trimmedQuery.length > 0 && !exactMatch;
  const labels = isRtl
    ? {
        empty: 'لا توجد تصنيفات بعد — اكتب اسماً لإنشاء واحد',
        search: 'ابحث أو أنشئ تصنيفاً',
        noMatches: 'لا توجد نتائج.',
        creating: 'جارٍ الإنشاء…',
        create: 'إنشاء تصنيف',
        remove: 'حذف',
        error: 'تعذر إنشاء التصنيف.',
      }
    : {
        empty: 'No categories yet — type a name to create one',
        search: 'Search or create a category',
        noMatches: 'No matches.',
        creating: 'Creating…',
        create: 'Create category',
        remove: 'Remove',
        error: 'Could not create category.',
      };

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  async function handleCreate() {
    if (!trimmedQuery || creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createCategory({
        storefrontSlug,
        name: trimmedQuery,
      });
      if (result.status === 'success' && result.category) {
        onCategoryCreated(result.category);
        setQuery('');
      } else if (result.status === 'error') {
        setError(result.message);
      }
    } catch (err) {
      console.error('[category-picker] create failed', err);
      setError(labels.error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          marginTop: 8,
          border: '1px solid var(--surface-rule-strong)',
          borderRadius: 8,
          padding: 10,
          background: 'var(--surface-bg)',
        }}
      >
        {value.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 10,
            }}
          >
            {value.map((id) => {
              const c = categories.find((x) => x.id === id);
              if (!c) return null;
              return (
                <span
                  key={id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 4px 4px 12px',
                    borderRadius: 999,
                    background: 'var(--admin-accent)',
                    color: 'var(--ink-on-gold)',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={`${labels.remove} ${c.name}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      border: 'none',
                      background: 'rgba(0,0,0,0.18)',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: 12,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={sorted.length === 0 ? labels.empty : labels.search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (showCreate) handleCreate();
            }
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-strong)',
            padding: '6px 4px',
            fontSize: 14,
            outline: 'none',
            fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
            textAlign: isRtl ? 'right' : 'left',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {filtered.map((c) => {
            const active = value.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${
                    active ? 'var(--admin-accent)' : 'var(--surface-rule-strong)'
                  }`,
                  background: active
                    ? 'color-mix(in srgb, var(--admin-accent) 15%, transparent)'
                    : 'var(--surface-elevated)',
                  color: active ? 'var(--admin-accent)' : 'var(--ink-strong)',
                  borderRadius: 999,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                {c.name}
              </button>
            );
          })}
          {filtered.length === 0 && !showCreate ? (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ink-faint)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                padding: '6px 0',
              }}
            >
              {labels.noMatches}
            </span>
          ) : null}
        </div>

        {showCreate ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px dashed var(--admin-accent)',
              background: 'transparent',
              color: 'var(--admin-accent)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              cursor: creating ? 'default' : 'pointer',
              textAlign: isRtl ? 'right' : 'left',
            }}
          >
            {creating ? labels.creating : `+ ${labels.create} "${trimmedQuery}"`}
          </button>
        ) : null}

        {error ? (
          <p
            role="alert"
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#f1b1a1',
            }}
          >
            {error}
          </p>
        ) : null}
      </div>
      {helper ? (
        <p
          className="mt-2 m-0"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-faint)',
            letterSpacing: '0.03em',
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  helper,
  checked,
  onChange,
  isRtl,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isRtl: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${checked ? 'var(--admin-accent)' : 'var(--surface-rule-strong)'}`,
        background: checked
          ? 'color-mix(in srgb, var(--admin-accent) 12%, transparent)'
          : 'var(--surface-bg)',
        color: 'var(--ink-strong)',
        cursor: 'pointer',
        textAlign: isRtl ? 'right' : 'left',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 650,
          }}
        >
          {label}
        </span>
        {helper ? (
          <span
            style={{
              display: 'block',
              marginTop: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.04em',
              color: 'var(--ink-faint)',
            }}
          >
            {helper}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        style={{
          width: 42,
          height: 24,
          flex: '0 0 auto',
          borderRadius: 999,
          padding: 3,
          background: checked ? 'var(--admin-accent)' : 'var(--surface-rule-strong)',
          display: 'flex',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          transition: 'background 160ms',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: checked ? 'var(--ink-on-gold)' : 'var(--surface-elevated)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.22)',
          }}
        />
      </span>
    </button>
  );
}

function StatusField({
  label,
  value,
  onChange,
  options,
  isRtl,
}: {
  label: string;
  value: ProductStatus;
  onChange: (v: ProductStatus) => void;
  options: { id: ProductStatus; label: string }[];
  isRtl: boolean;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2 mt-2 flex-wrap">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              style={{
                padding: '10px 16px',
                background: active
                  ? 'color-mix(in srgb, var(--admin-accent) 18%, transparent)'
                  : 'transparent',
                border: `1px solid ${
                  active ? 'var(--admin-accent)' : 'var(--surface-rule-strong)'
                }`,
                color: active ? 'var(--admin-accent)' : 'var(--ink-strong)',
                fontFamily: isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 999,
                transition: 'all 180ms',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImageField({
  label,
  helper,
  value,
  onChange,
  slug,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  slug: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 52_428_800) {
      setError(helper);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const safe = sanitizeUploadName(file.name);
      const result = await upload(`products/${slug}/${safe}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-blob',
        clientPayload: JSON.stringify({
          storefrontSlug: slug,
          size: file.size,
          contentType: file.type || null,
        }),
      });
      onChange(result.url);
    } catch (err) {
      console.error('[upload-product] client error', err);
      setError(helper);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className="mt-2 flex items-center gap-4"
        style={{
          border: '1px dashed var(--surface-rule-strong)',
          borderRadius: 4,
          padding: 16,
          background: 'transparent',
        }}
      >
        {value && mediaKindFromUrl(value) === 'video' ? (
          <video
            src={value}
            width={64}
            height={64}
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              width: 64,
              height: 64,
              borderRadius: 4,
              objectFit: 'contain',
              border: '1px solid color-mix(in srgb, var(--admin-accent) 35%, transparent)',
              background: 'var(--surface-sunken)',
            }}
            onMouseEnter={(event) => {
              void event.currentTarget.play().catch(() => undefined);
            }}
            onMouseLeave={(event) => {
              event.currentTarget.pause();
            }}
          />
        ) : value ? (
          <img
            src={value}
            alt=""
            width={64}
            height={64}
            style={{
              width: 64,
              height: 64,
              borderRadius: 4,
              objectFit: 'cover',
              border: '1px solid color-mix(in srgb, var(--admin-accent) 35%, transparent)',
              background: 'var(--surface-sunken)',
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 64,
              height: 64,
              borderRadius: 4,
              border: '1px dashed var(--surface-rule-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-faint)',
              fontFamily: 'var(--font-serif), serif',
              fontStyle: 'italic',
              fontSize: 22,
            }}
          >
            ◯
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--admin-accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              cursor: uploading ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            {uploading ? '…' : value ? 'Replace' : 'Drop or click to upload'}
          </button>
          {value ? (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Remove
              </button>
            </>
          ) : null}
          <p
            className="m-0 mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-faint)',
              letterSpacing: '0.03em',
            }}
          >
            {helper}
            {' · '}
            {STOREFRONT_MEDIA_FORMATS_LABEL}
          </p>
          {error ? (
            <p
              role="alert"
              className="m-0 mt-1"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: '#f1b1a1',
                letterSpacing: '0.03em',
              }}
            >
              {error}
            </p>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={STOREFRONT_MEDIA_ACCEPT}
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

function sanitizeUploadName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80) || 'asset'
  );
}
