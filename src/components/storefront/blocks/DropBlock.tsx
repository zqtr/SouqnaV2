import type { BlockRenderProps } from './BlockContext';
import type { DropProps } from '@/lib/blocks/types';
import { COMPONENT_SHOWCASE_DROP_ID } from '@/lib/blocks/componentShowcase';
import { getAppState, getInstalledApp } from '@/lib/apps/installed';
import { resolveDrop, dropPhase } from '@/lib/apps/drop-manager';
import type { Product } from '@/lib/products';
import { ProductMedia } from '../ProductMedia';
import { DropCountdown } from './DropCountdown';
import { DropWaitlistButton } from './DropWaitlistButton';

/**
 * Server-rendered limited-edition / drop block.
 *
 * The block carries only a `dropId`; everything else (products, dates,
 * cap, hero copy) is read live from `app_state` so founders can edit
 * a drop in the dashboard without re-publishing the page.
 *
 * Rendering branches on the resolved phase:
 *
 *   - `teaser`     → countdown to `startsAt`, no products yet
 *   - `live`       → product grid + sold-counter + Inquire CTA
 *   - `sold_out`   → "Notify me" form (waitlist) when enabled, else a
 *                    quiet sold-out card
 *   - `archived`   → block hidden entirely
 */
export async function DropBlock({ block, ctx }: BlockRenderProps<DropProps>) {
  const slug = ctx.storefront.slug;
  const dropId = block.props.dropId;

  if (dropId === COMPONENT_SHOWCASE_DROP_ID && (ctx.isPreview || slug === 'components')) {
    return <DropShowcaseCard block={block} ctx={ctx} />;
  }
  if (dropId === COMPONENT_SHOWCASE_DROP_ID) return null;

  // Cheap guard: block renders nothing if the founder uninstalled or
  // disabled the Drop Manager plugin without removing the block from
  // their published page.
  const installed = await getInstalledApp(slug, 'drop-manager').catch(() => null);
  if (!installed || !installed.enabled) {
    return ctx.isPreview ? <DropShowcaseCard block={block} ctx={ctx} /> : null;
  }

  const stateRow = await getAppState(slug, 'drop-manager', `drop:${dropId}`).catch(() => null);
  if (!stateRow) {
    return ctx.isPreview ? <DropShowcaseCard block={block} ctx={ctx} /> : null;
  }

  const drop = resolveDrop(stateRow.value);
  if (!drop) {
    return ctx.isPreview ? <DropShowcaseCard block={block} ctx={ctx} /> : null;
  }
  const phase = dropPhase(drop, new Date());
  if (phase === 'archived') return null;

  const heroLocale = ctx.storefront.locale === 'ar' ? 'ar' : 'en';
  const heading = block.props.heading?.trim() || drop.heroCopy[heroLocale] || drop.name;
  const subheading = block.props.subheading?.trim();

  const products = ctx.products.filter((p) => drop.productIds.includes(p.id));

  return (
    <section
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--sf-accent)',
          }}
        >
          {phaseLabel(phase, ctx.isRtl)}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 'var(--sf-heading-weight, 400)' as unknown as number,
            fontSize: 'clamp(28px, 4vw, 44px)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: 'var(--sf-ink)',
          }}
        >
          {heading}
        </h2>
        {subheading ? (
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
              maxWidth: 640,
            }}
          >
            {subheading}
          </p>
        ) : null}
      </header>

      {phase === 'teaser' ? (
        <DropCountdown targetIso={drop.startsAt} locale={ctx.storefront.locale} />
      ) : null}

      {phase === 'live' && products.length > 0 ? <DropProductGrid products={products} /> : null}

      {phase === 'sold_out' ? (
        drop.waitlistEnabled ? (
          ctx.isPreview ? (
            <p
              aria-disabled="true"
              style={{
                margin: 0,
                alignSelf: 'flex-start',
                borderRadius: 999,
                padding: '12px 18px',
                background: 'color-mix(in srgb, var(--sf-ink) 10%, transparent)',
                color: 'color-mix(in srgb, var(--sf-ink) 64%, transparent)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}
            >
              {ctx.isRtl ? 'قائمة الانتظار معطلة في المعاينة' : 'Waitlist disabled in preview'}
            </p>
          ) : (
            <DropWaitlistButton
              storefrontSlug={slug}
              dropId={dropId}
              label={ctx.isRtl ? 'أعلمني عند التوفر' : 'Notify me when it returns'}
            />
          )
        ) : (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.06em',
              color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
              padding: '14px 18px',
              border: '1px dashed color-mix(in srgb, var(--sf-ink) 25%, transparent)',
              borderRadius: 12,
              alignSelf: 'flex-start',
            }}
          >
            {ctx.isRtl ? 'نفدت الكمية · شكراً لكم' : 'Sold out · thank you'}
          </p>
        )
      ) : null}
    </section>
  );
}

function DropShowcaseCard({ block, ctx }: BlockRenderProps<DropProps>) {
  const targetIso = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString();
  const isAr = ctx.isRtl;
  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        padding: 'clamp(22px, 3vw, 32px)',
        borderRadius: 18,
        border: '1px solid color-mix(in srgb, var(--sf-accent) 32%, transparent)',
        background: 'color-mix(in srgb, var(--sf-accent) 10%, transparent)',
      }}
    >
      <header style={{ display: 'grid', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--sf-accent)',
          }}
        >
          {isAr ? 'إصدار قريب' : 'Timed drop'}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif, var(--font-sans))',
            fontWeight: 'var(--sf-heading-weight, 400)' as unknown as number,
            fontSize: 'clamp(28px, 4vw, 44px)',
            lineHeight: 1.1,
            color: 'var(--sf-ink)',
          }}
        >
          {block.props.heading || (isAr ? 'إطلاق مؤقت' : 'Limited launch')}
        </h2>
        {block.props.subheading ? (
          <p
            style={{
              margin: 0,
              maxWidth: 640,
              color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
              lineHeight: 1.55,
            }}
          >
            {block.props.subheading}
          </p>
        ) : null}
      </header>
      <DropCountdown targetIso={targetIso} locale={ctx.storefront.locale} />
    </section>
  );
}

function phaseLabel(phase: 'teaser' | 'live' | 'sold_out', rtl: boolean): string {
  if (rtl) {
    if (phase === 'teaser') return '◈ قريباً';
    if (phase === 'live') return '◈ متاح الآن';
    return '◈ نفدت الكمية';
  }
  if (phase === 'teaser') return '◈ Coming soon';
  if (phase === 'live') return '◈ Available now';
  return '◈ Sold out';
}

function DropProductGrid({ products }: { products: Product[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 18,
      }}
    >
      {products.map((p) => (
        <article
          key={p.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'color-mix(in srgb, var(--sf-ink) 4%, transparent)',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid color-mix(in srgb, var(--sf-ink) 8%, transparent)',
          }}
        >
          {p.imageUrl ? (
            <ProductMedia
              url={p.imageUrl}
              title={p.title}
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '4 / 5' }} />
          )}
          <div
            style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sf-ink)' }}>{p.title}</div>
            {p.priceQar !== null ? (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
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
