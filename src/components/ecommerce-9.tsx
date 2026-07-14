'use client';

/* eslint-disable @next/next/no-img-element */

import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { useCart } from './storefront/cart/CartContext';
import { normalizePricedOptions, optionPriceDeltaFor } from '@/lib/productOptions';
import type { EcommerceProduct, Ecommerce9Props } from '@/lib/blocks/types';
import { normalizeProducts } from './ecommerce-souqna';
import { souqnaFxClassName, SouqnaFxStyles } from './souqna-fx-styles';

type Props = Ecommerce9Props & {
  dir?: 'ltr' | 'rtl';
};

const EASE = [0.22, 1, 0.36, 1] as const;
const NEW_BADGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/* Styling note: inside the `.sqna-fx` scope every neutral/white utility is
 * remapped onto the merchant palette (see souqna-fx.module.css) and `dark:`
 * variants are neutralized, so this block intentionally uses only the
 * scope-mapped utilities and no `dark:` classes. */
const QUICK_ADD_CONTROL_CLASS =
  'flex h-9 cursor-pointer items-center justify-center rounded-xl bg-neutral-100 text-xs font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-950 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sqna-ink)]';

export default function Ecommerce9({
  eyebrow = 'Shop',
  title,
  subtitle,
  cta,
  products,
  dir = 'ltr',
}: Props) {
  const isRtl = dir === 'rtl';
  const pillLayoutId = useId();
  const prefersReducedMotion = useReducedMotion();
  const normalized = useMemo(() => normalizeProducts(products), [products]);
  const filters = useMemo(
    () => [
      { id: 'all', label: isRtl ? 'الكل' : 'All' },
      ...uniqueCategories(normalized).map((category) => ({ id: category, label: category })),
    ],
    [normalized, isRtl],
  );
  const [activeFilter, setActiveFilter] = useState('all');
  const shown = useMemo(() => {
    if (activeFilter === 'all') return normalized;
    return normalized.filter((product) => product.category === activeFilter);
  }, [normalized, activeFilter]);

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } },
  };
  const grid: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };

  return (
    <section
      dir={dir}
      className={`${souqnaFxClassName} w-full overflow-hidden bg-white px-4 py-8 text-neutral-950 sm:px-6 sm:py-10 lg:px-8`}
    >
      <SouqnaFxStyles />
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <motion.div variants={fadeUp} className="max-w-2xl">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-neutral-950 text-balance sm:text-3xl md:text-4xl">
              {title?.trim() || (isRtl ? 'تسوق المجموعة' : 'Shop the edit')}
            </h2>
          </motion.div>
          <motion.div variants={fadeUp} className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <p className="text-sm text-neutral-500">
              <span className="tabular-nums">{shown.length}</span>{' '}
              {isRtl ? 'قطعة' : shown.length === 1 ? 'piece' : 'pieces'}
              {subtitle?.trim() ? ` · ${subtitle}` : ''}
            </p>
            {cta?.label ? (
              <a
                href={cta.href || '#'}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-950 hover:text-white"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </a>
            ) : null}
          </motion.div>
        </div>

        {filters.length > 1 ? (
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={activeFilter === filter.id}
                className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sqna-ink)] ${
                  activeFilter === filter.id
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {activeFilter === filter.id && (
                  <motion.span
                    layoutId={pillLayoutId}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: EASE }}
                    className="absolute inset-0 rounded-full bg-neutral-950"
                  />
                )}
                <span className="relative">{filter.label}</span>
              </button>
            ))}
          </motion.div>
        ) : null}

        {normalized.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">
            {isRtl ? 'لا توجد منتجات متاحة حاليا.' : 'No products available yet.'}
          </div>
        ) : (
          <motion.div
            variants={grid}
            className="mt-10 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {shown.map((product) => (
                <QuickAddCard
                  key={productKey(product)}
                  product={product}
                  isRtl={isRtl}
                  fadeUp={fadeUp}
                  prefersReducedMotion={prefersReducedMotion ?? false}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

function QuickAddCard({
  product,
  isRtl,
  fadeUp,
  prefersReducedMotion,
}: {
  product: EcommerceProduct;
  isRtl: boolean;
  fadeUp: Variants;
  prefersReducedMotion: boolean;
}) {
  const cart = useCart();
  const [active, setActive] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const key = productKey(product);
  const href = product.href || '#';
  const available = product.available !== false && product.status !== 'sold_out';
  const basePriceQar = product.priceQar ?? parsePrice(product.price);
  const pricedSizes = normalizePricedOptions(
    product.sizeOptionPrices ?? product.sizes?.map((size) => size.label),
  );
  const sizes =
    product.sizes?.filter((size) => size.available !== false).map((size) => size.label) ?? [];
  // One-tap add can't capture variant/height/custom-size inputs — send those
  // products (and any without a numeric price) to the product page instead.
  const needsProductPage =
    Boolean(product.variantOptions?.length) ||
    product.requiresHeightInput === true ||
    product.allowCustomSize === true ||
    basePriceQar === null;
  const showOverlay = cart.enabled && available;
  const badge = badgeFor(product, available, isRtl);

  const addWithSize = (size: string | null) => {
    if (basePriceQar === null) return;
    const delta = size ? optionPriceDeltaFor(pricedSizes, size) : 0;
    cart.add(
      {
        productId: key,
        title: product.name,
        priceQar: Math.max(0, Math.round(basePriceQar + delta)),
        imageUrl: product.imageUrl ?? null,
        variantLabel: size,
      },
      1,
    );
    cart.open();
    setAddedSize(size ?? '__default__');
  };

  return (
    <motion.article
      layout
      variants={fadeUp}
      exit={{
        opacity: 0,
        y: prefersReducedMotion ? 0 : -8,
        transition: { duration: 0.25, ease: EASE },
      }}
      transition={{ layout: { duration: prefersReducedMotion ? 0 : 0.45, ease: EASE } }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setActive(false);
      }}
      className="group"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
        <a href={href} tabIndex={-1} aria-hidden className="absolute inset-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : null}
        </a>
        {badge ? (
          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium tracking-wide text-neutral-700 backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
        {showOverlay ? (
          <motion.div
            initial={false}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: EASE }}
            style={{ pointerEvents: active ? 'auto' : 'none' }}
            className="absolute inset-x-3 bottom-3"
          >
            <div className="rounded-2xl border border-neutral-200 bg-white/90 p-1.5 backdrop-blur-sm">
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                {isRtl ? 'إضافة سريعة' : 'Quick add'}
              </p>
              {needsProductPage ? (
                <a href={href} className={QUICK_ADD_CONTROL_CLASS}>
                  {isRtl ? 'عرض الخيارات' : 'View options'}
                </a>
              ) : sizes.length > 0 ? (
                <div className={`grid gap-1.5 ${sizes.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => addWithSize(size)}
                      aria-label={
                        isRtl
                          ? `أضف ${product.name} مقاس ${size} إلى السلة`
                          : `Add ${product.name}, size ${size}, to cart`
                      }
                      className={QUICK_ADD_CONTROL_CLASS}
                    >
                      {addedSize === size ? <Check className="h-4 w-4" /> : size}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addWithSize(null)}
                  aria-label={isRtl ? `أضف ${product.name} إلى السلة` : `Add ${product.name} to cart`}
                  className={`${QUICK_ADD_CONTROL_CLASS} w-full`}
                >
                  {addedSize !== null ? <Check className="h-4 w-4" /> : isRtl ? 'أضف' : 'Add'}
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium text-neutral-900">
            <a href={href}>{product.name}</a>
          </h3>
          {product.category ? (
            <p className="mt-0.5 text-sm text-neutral-500">{product.category}</p>
          ) : null}
        </div>
        {product.price ? (
          <p className="shrink-0 text-sm font-medium tabular-nums text-neutral-900">
            {product.price}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

function badgeFor(product: EcommerceProduct, available: boolean, isRtl: boolean) {
  if (!available) return isRtl ? 'نفد' : 'Sold out';
  if (product.createdAt) {
    const created = Date.parse(product.createdAt);
    if (Number.isFinite(created) && Date.now() - created < NEW_BADGE_WINDOW_MS) {
      return isRtl ? 'جديد' : 'New';
    }
  }
  return null;
}

function uniqueCategories(products: EcommerceProduct[]) {
  return Array.from(
    new Set(
      products
        .map((product) => product.category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  );
}

function productKey(product: EcommerceProduct) {
  return product.id ?? product.name;
}

function parsePrice(value?: string) {
  if (!value) return null;
  const amount = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) ? amount : null;
}
