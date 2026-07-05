import Link from 'next/link';
import { StoreImage } from '../StoreImage';
import type { BlockRenderProps } from './BlockContext';
import type { TaqimBlockProps } from '@/lib/blocks/types';
import { COMPONENT_SHOWCASE_BUNDLE_ID } from '@/lib/blocks/componentShowcase';
import { getInstalledApp } from '@/lib/apps/installed';
import { TaqimBundleCart } from './TaqimBundleCart';
import {
  getTaqimSettings,
  getBundleById,
  pickBundleForProduct,
  computeBundleTotals,
  type TaqimBundle,
  type TaqimSettings,
} from '@/lib/apps/taqim';
import type { Product } from '@/lib/products';
import { isVideoMediaUrl } from '@/lib/media';
import type { CSSProperties } from 'react';

/**
 * Server-rendered Taqim (bundles & complete-the-look) block.
 *
 * The block resolves which bundle to show by, in order:
 *   1. `props.bundleId` — the founder picked one in the inspector.
 *   2. `props.anchorProductId` — anchor on a chosen product.
 *   3. The first enabled bundle in the founder's Taqim settings.
 *
 * Pricing, layout, accent colour, and bilingual copy all come from
 * `app_state` so the founder edits the bundle in Settings without
 * republishing the page. The CTA is wired to the existing inquire
 * flow (anchor link to the floating inquire button) for v1 — full
 * cart wiring is intentionally out of scope.
 */
export async function TaqimBlock({ block, ctx }: BlockRenderProps<TaqimBlockProps>) {
  const slug = ctx.storefront.slug;
  if (block.props.bundleId === COMPONENT_SHOWCASE_BUNDLE_ID) {
    return <TaqimShowcaseCard block={block} ctx={ctx} />;
  }
  if (block.props.bundle?.items?.length) {
    return <ControlledTaqimBundle block={block} ctx={ctx} />;
  }

  const installed = await getInstalledApp(slug, 'taqim').catch(() => null);
  if (!installed || !installed.enabled) {
    return ctx.isPreview ? (
      <TaqimSetupCard
        title="Install Taqim to publish this bundle"
        body="This builder block is ready. Install Taqim from Apps, then choose a product or bundle here."
      />
    ) : null;
  }

  const settings = await getTaqimSettings(slug);
  if (!settings.enabled) {
    return ctx.isPreview ? (
      <TaqimSetupCard
        title="Taqim is disabled"
        body="Enable Taqim in Apps to show bundles publicly."
      />
    ) : null;
  }

  const bundle = resolveBundle(settings, block.props);
  if (!bundle || !bundle.enabled || bundle.items.length === 0) {
    return ctx.isPreview ? (
      <TaqimSetupCard
        title="Choose a bundle"
        body="Create a bundle in Apps → Taqim, or anchor this block to a product that already has a bundle."
      />
    ) : null;
  }

  const productMap = new Map(ctx.products.map((p) => [p.id, p]));
  const items = bundle.items
    .map((it) => productMap.get(it.productId))
    .filter((p): p is Product => Boolean(p));
  if (items.length === 0) return null;

  // Stock policy: if any item is missing or sold out, the founder may
  // want the whole bundle hidden. We treat `priceQar === null` as
  // "not for sale right now" — the closest signal we have without a
  // proper stock column.
  const missingAny = items.length < bundle.items.length;
  if (missingAny && bundle.stockPolicy === 'hideIfAnyOOS') return null;

  const prices = new Map<string, number>();
  for (const p of items) if (p.priceQar !== null) prices.set(p.id, p.priceQar);
  const { subtotal, total, savings } = computeBundleTotals(bundle, prices);

  const isAr = ctx.isRtl;
  const heading =
    block.props.heading?.trim() || (isAr ? bundle.titleAr : bundle.titleEn) || bundle.name;
  const subtitle = isAr ? bundle.subtitleAr : bundle.subtitleEn;
  const cta = isAr ? bundle.ctaAr : bundle.ctaEn;
  const accentCss = settings.appearance.accent.startsWith('--')
    ? `var(${settings.appearance.accent})`
    : settings.appearance.accent;
  const layout = block.props.variant ?? settings.appearance.layout;
  const radiusPx =
    settings.appearance.radius === 'sm' ? 8 : settings.appearance.radius === 'lg' ? 18 : 12;
  const savingsTpl = isAr
    ? settings.appearance.savingsTemplateAr
    : settings.appearance.savingsTemplateEn;
  const savingsLabel = savings > 0 ? savingsTpl.replace('{amount}', savings.toFixed(0)) : null;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accentCss,
          }}
        >
          ◫ {isAr ? 'اشترِ معاً' : 'Buy together'}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 'var(--sf-heading-weight, 400)' as unknown as number,
            fontSize: 'clamp(22px, 3vw, 32px)',
            color: 'var(--sf-ink)',
          }}
        >
          {heading}
        </h2>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'color-mix(in srgb, var(--sf-ink) 65%, transparent)',
              maxWidth: 640,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>

      <BundleItems
        items={items}
        layout={layout}
        radiusPx={radiusPx}
        plusGlyph="+"
        accentCss={accentCss}
      />

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          paddingTop: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 22,
              color: 'var(--sf-ink)',
            }}
          >
            {total.toFixed(2)} QAR
          </span>
          {subtotal > total ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
                textDecoration: 'line-through',
              }}
            >
              {subtotal.toFixed(2)}
            </span>
          ) : null}
          {savingsLabel ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.06em',
                color: 'var(--sf-ground)',
                background: accentCss,
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {savingsLabel}
            </span>
          ) : null}
        </div>
        <Link
          href="#souqna-inquire"
          style={{
            marginInlineStart: 'auto',
            padding: '10px 20px',
            borderRadius: radiusPx,
            background: 'var(--sf-ink)',
            color: 'var(--sf-ground)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          {cta}
        </Link>
      </footer>
    </section>
  );
}

function ControlledTaqimBundle({ block, ctx }: BlockRenderProps<TaqimBlockProps>) {
  const bundle = block.props.bundle;
  if (!bundle?.items?.length) return null;

  const isAr = ctx.isRtl;
  const productMap = new Map(ctx.products.map((product) => [product.id, product]));
  const orderedProducts = bundle.items
    .map((item) => productMap.get(item.productId))
    .filter((product): product is Product => Boolean(product));
  if (orderedProducts.length === 0) {
    return ctx.isPreview ? (
      <TaqimSetupCard
        title="Choose bundle products"
        body="Pick real products from the Builder inspector before publishing this bundle block."
      />
    ) : null;
  }

  const bundleItems = bundle.items
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product || product.priceQar === null || product.status === 'sold_out' || product.stock <= 0) {
        return null;
      }
      return {
        productId: product.id,
        title: product.title,
        priceQar: product.priceQar,
        imageUrl: product.imageUrl,
        required: item.required !== false,
        selected: item.required !== false,
        defaultOptionValue: item.defaultOptionValue ?? null,
        buyerCanChooseOption: item.buyerCanChooseOption,
        sizeOptions: product.sizeOptions,
        sizeOptionPrices: product.sizeOptionPrices,
        badge: isAr ? item.badgeAr || item.badgeEn : item.badgeEn || item.badgeAr,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const subtotal = bundleItems.reduce((sum, item) => sum + item.priceQar, 0);
  const pricing = bundle.pricing;
  const pricingMode = pricing?.mode ?? 'auto_total';
  const displayTotal = computeControlledBundleTotal(subtotal, pricing);
  const savings = Math.max(0, subtotal - displayTotal);
  const displayOnlyDiscount = pricingMode !== 'auto_total';
  const badgeLabel = isAr ? bundle.badge?.labelAr || bundle.badge?.labelEn : bundle.badge?.labelEn || bundle.badge?.labelAr;
  const heading =
    block.props.heading?.trim() ||
    (isAr ? bundle.titleAr || bundle.titleEn : bundle.titleEn || bundle.titleAr) ||
    (isAr ? 'عرض باقة' : 'Bundle offer');
  const ctaLabel =
    (isAr ? bundle.cta?.labelAr || bundle.cta?.labelEn : bundle.cta?.labelEn || bundle.cta?.labelAr) ||
    (isAr ? 'أضف الباقة للسلة' : 'Add bundle to cart');
  const layout = block.props.variant ?? 'cards';
  const radiusPx = 14;

  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        padding: 'clamp(18px, 3vw, 28px)',
        borderRadius: 18,
        border: '1px solid color-mix(in srgb, var(--sf-accent) 24%, transparent)',
        background: 'color-mix(in srgb, var(--sf-accent) 7%, transparent)',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <span
          style={{
            width: 'fit-content',
            borderRadius: 999,
            padding: '5px 11px',
            background: 'color-mix(in srgb, var(--sf-accent) 18%, transparent)',
            color: 'var(--sf-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {badgeLabel || (isAr ? 'باقة متجر' : 'Bundle deal')}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 'var(--sf-heading-weight, 400)' as unknown as number,
            fontSize: 'clamp(24px, 3vw, 36px)',
            color: 'var(--sf-ink)',
          }}
        >
          {heading}
        </h2>
      </header>

      <BundleItems
        items={orderedProducts}
        layout={layout}
        radiusPx={radiusPx}
        plusGlyph="+"
        accentCss="var(--sf-accent)"
      />

      <footer
        style={{
          display: 'grid',
          gap: 12,
          borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
          paddingTop: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-serif, var(--font-sans))',
              fontSize: 24,
              color: 'var(--sf-ink)',
            }}
          >
            {displayTotal.toFixed(2)} QAR
          </span>
          {subtotal > displayTotal ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
                textDecoration: 'line-through',
              }}
            >
              {subtotal.toFixed(2)} QAR
            </span>
          ) : null}
          {pricing?.showSavings !== false && savings > 0 ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--sf-ground)',
                background: 'var(--sf-accent)',
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {isAr ? `وفر ${savings.toFixed(0)} ر.ق` : `Save QAR ${savings.toFixed(0)}`}
            </span>
          ) : null}
        </div>
        {displayOnlyDiscount ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: 'color-mix(in srgb, var(--sf-ink) 64%, transparent)',
            }}
          >
            {isAr
              ? 'توفير الباقة ظاهر فقط حاليا. الدفع سيحسب أسعار المنتجات حتى يتم تفعيل خصم الباقات في الخلفية.'
              : 'Bundle savings are display-only for now. Checkout charges item prices until backend bundle discounts are enabled.'}
          </p>
        ) : null}
        <TaqimBundleCart
          items={bundleItems}
          mode={bundle.cta?.mode ?? 'add_all'}
          label={ctaLabel}
          showPerProductButtons={bundle.cta?.showPerProductButtons}
          isRtl={isAr}
          radiusPx={radiusPx}
        />
      </footer>
    </section>
  );
}

function TaqimShowcaseCard({ block, ctx }: BlockRenderProps<TaqimBlockProps>) {
  const isAr = ctx.isRtl;
  const products = ctx.products.slice(0, 2);
  const items =
    products.length > 0
      ? products
      : ([
          {
            id: 'showcase-a',
            title: isAr ? 'منتج أساسي' : 'Core product',
            description: isAr ? 'العنصر الأول في الباقة' : 'The first item in the bundle',
            priceQar: 180,
            imageUrl: null,
          },
          {
            id: 'showcase-b',
            title: isAr ? 'إضافة مكملة' : 'Matching add-on',
            description: isAr
              ? 'عنصر مكمل يزيد قيمة العرض'
              : 'A companion item that raises order value',
            priceQar: 95,
            imageUrl: null,
          },
        ] as Array<Pick<Product, 'id' | 'title' | 'description' | 'priceQar' | 'imageUrl'>>);
  const total = items.reduce((sum, item) => sum + (item.priceQar ?? 0), 0);
  const bundleTotal = Math.max(0, total - 35);
  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        padding: 'clamp(22px, 3vw, 32px)',
        borderRadius: 18,
        border: '1px solid color-mix(in srgb, var(--sf-accent) 30%, transparent)',
        background: 'color-mix(in srgb, var(--sf-accent) 8%, transparent)',
      }}
    >
      <header style={{ display: 'grid', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--sf-accent)',
          }}
        >
          {isAr ? 'باقة مقترحة' : 'Bundle offer'}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 'var(--sf-heading-weight, 400)' as unknown as number,
            fontSize: 'clamp(26px, 3.4vw, 40px)',
            lineHeight: 1.12,
            color: 'var(--sf-ink)',
          }}
        >
          {block.props.heading ||
            (isAr ? 'اجمع المنتجات في عرض واحد' : 'Pair products into one offer')}
        </h2>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {items.map((item) => (
          <article
            key={item.id}
            style={{
              display: 'grid',
              gap: 8,
              padding: 14,
              borderRadius: 14,
              border: '1px solid color-mix(in srgb, var(--sf-ink) 10%, transparent)',
              background: 'color-mix(in srgb, var(--sf-ground) 86%, var(--sf-ink) 6%)',
            }}
          >
            {item.imageUrl ? (
              <TaqimProductMedia
                url={item.imageUrl}
                title={item.title}
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: 10,
                  display: 'block',
                }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: 10,
                  background: 'color-mix(in srgb, var(--sf-accent) 16%, transparent)',
                }}
              />
            )}
            <strong style={{ color: 'var(--sf-ink)', fontSize: 15 }}>{item.title}</strong>
            {item.description ? (
              <span
                style={{
                  color: 'color-mix(in srgb, var(--sf-ink) 66%, transparent)',
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {item.description}
              </span>
            ) : null}
          </article>
        ))}
      </div>
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
          paddingTop: 14,
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-accent)' }}>
          QAR {bundleTotal.toFixed(0)}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'color-mix(in srgb, var(--sf-ink) 64%, transparent)',
          }}
        >
          {isAr ? 'وفر عند شراء الباقة' : 'Save when bought together'}
        </span>
      </footer>
    </section>
  );
}

function TaqimSetupCard({ title, body }: { title: string; body: string }) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 8,
        padding: 18,
        borderRadius: 16,
        border: '1px dashed color-mix(in srgb, var(--sf-accent) 48%, transparent)',
        background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
        color: 'var(--sf-ink)',
      }}
    >
      <strong style={{ fontFamily: 'var(--font-serif, var(--font-sans))', fontSize: 22 }}>
        ◫ {title}
      </strong>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'color-mix(in srgb, var(--sf-ink) 68%, transparent)',
        }}
      >
        {body}
      </p>
    </section>
  );
}

function resolveBundle(settings: TaqimSettings, props: TaqimBlockProps): TaqimBundle | null {
  if (props.bundleId) {
    const explicit = getBundleById(settings, props.bundleId);
    if (explicit) return explicit;
  }
  if (props.anchorProductId) {
    const anchored = pickBundleForProduct(settings, props.anchorProductId);
    if (anchored) return anchored;
  }
  return settings.bundles.find((b) => b.enabled) ?? null;
}

function computeControlledBundleTotal(
  subtotal: number,
  pricing: NonNullable<TaqimBlockProps['bundle']>['pricing'],
) {
  const mode = pricing?.mode ?? 'auto_total';
  if (mode === 'percent_discount' && typeof pricing?.percentOff === 'number') {
    return Math.max(0, subtotal * (1 - pricing.percentOff / 100));
  }
  if (mode === 'fixed_discount' && typeof pricing?.fixedDiscountQar === 'number') {
    return Math.max(0, subtotal - pricing.fixedDiscountQar);
  }
  if (mode === 'fixed_bundle_price' && typeof pricing?.fixedBundlePriceQar === 'number') {
    return Math.max(0, pricing.fixedBundlePriceQar);
  }
  return subtotal;
}

function BundleItems({
  items,
  layout,
  radiusPx,
  plusGlyph,
  accentCss,
}: {
  items: Product[];
  layout: 'stack' | 'cards' | 'carousel';
  radiusPx: number;
  plusGlyph: string;
  accentCss: string;
}) {
  if (layout === 'stack') {
    return (
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {items.map((p) => (
          <li
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 14px',
              borderRadius: radiusPx,
              background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--sf-ink) 8%, transparent)',
            }}
          >
            {p.imageUrl ? (
              <TaqimProductMedia
                url={p.imageUrl}
                title={p.title}
                style={{ width: 56, height: 56, borderRadius: radiusPx / 2 }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
                  borderRadius: radiusPx / 2,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--sf-ink)' }}>
              {p.title}
            </div>
            {p.priceQar !== null ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
                }}
                data-souqna-price={p.priceQar}
              >
                {p.priceQar.toFixed(2)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  if (layout === 'carousel') {
    return (
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollSnapType: 'x mandatory',
        }}
      >
        {items.map((p, i) => (
          <article
            key={p.id}
            style={{
              flex: '0 0 min(240px, 74vw)',
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
              borderRadius: radiusPx,
              overflow: 'hidden',
              border: '1px solid color-mix(in srgb, var(--sf-ink) 8%, transparent)',
              position: 'relative',
            }}
          >
            {i < items.length - 1 ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 12,
                  insetInlineEnd: 12,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: accentCss,
                  color: 'var(--sf-ground)',
                  fontSize: 16,
                  zIndex: 2,
                }}
              >
                {plusGlyph}
              </span>
            ) : null}
            {p.imageUrl ? (
              <TaqimProductMedia
                url={p.imageUrl}
                title={p.title}
                style={{ width: '100%', aspectRatio: '4 / 5' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 5',
                  background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
                }}
              />
            )}
            <div
              style={{
                padding: '10px 12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 13.5, color: 'var(--sf-ink)' }}>{p.title}</div>
              {p.priceQar !== null ? (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
                  }}
                  data-souqna-price={p.priceQar}
                >
                  {p.priceQar.toFixed(2)} QAR
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
        gap: 14,
        alignItems: 'stretch',
      }}
    >
      {items.map((p, i) => (
        <div key={p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <article
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
              borderRadius: radiusPx,
              overflow: 'hidden',
              border: '1px solid color-mix(in srgb, var(--sf-ink) 8%, transparent)',
            }}
          >
            {p.imageUrl ? (
              <TaqimProductMedia
                url={p.imageUrl}
                title={p.title}
                style={{
                  width: '100%',
                  aspectRatio: '4 / 5',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4 / 5' }} />
            )}
            <div
              style={{
                padding: '10px 12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 13.5, color: 'var(--sf-ink)' }}>{p.title}</div>
              {p.priceQar !== null ? (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
                  }}
                  data-souqna-price={p.priceQar}
                >
                  {p.priceQar.toFixed(2)} QAR
                </div>
              ) : null}
            </div>
          </article>
          {i < items.length - 1 ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '38%',
                insetInlineEnd: -14,
                width: 24,
                height: 24,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--sf-ground)',
                color: accentCss,
                border: `1px solid ${accentCss}`,
                fontFamily: 'var(--font-serif, var(--font-sans))',
                fontSize: 16,
                lineHeight: 1,
                zIndex: 2,
              }}
            >
              {plusGlyph}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TaqimProductMedia({
  url,
  title,
  style,
}: {
  url: string;
  title: string;
  style: CSSProperties;
}) {
  const mediaStyle: CSSProperties = {
    objectFit: 'contain',
    objectPosition: 'center',
    background: 'color-mix(in srgb, var(--sf-ink) 6%, transparent)',
    ...style,
  };

  if (isVideoMediaUrl(url)) {
    return (
      <video
        src={url}
        aria-label={title}
        muted
        loop
        playsInline
        preload="metadata"
        style={mediaStyle}
      />
    );
  }

  return <StoreImage src={url} alt={title} style={mediaStyle} sizes="(max-width: 768px) 100vw, 600px" />;
}
