'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/products';
import type { ProductSpotlight3dProps } from '@/lib/blocks/types';
import type { BlockRenderProps } from './BlockContext';
import { emptyEyebrow, formatPrice, pickProducts, productPathSegment } from './helpers';

const TILT_DEG: Record<NonNullable<ProductSpotlight3dProps['intensity']>, number> = {
  subtle: 6,
  medium: 10,
  strong: 15,
};

/**
 * Product Spotlight 3D (Pro+). A premium product row whose cards react to
 * the pointer with a real 3D tilt + lift, pulling live products from the
 * store catalogue via {@link pickProducts} (so it stays in sync with the
 * merchant's real inventory). Reduced-motion users get a flat, static
 * card. Palette-aware via `--sf-*` vars; RTL-aware.
 */
export function ProductSpotlight3dBlock({ block, ctx }: BlockRenderProps<ProductSpotlight3dProps>) {
  const p = block.props;
  const { isRtl } = ctx;
  const products = pickProducts(ctx.products, {
    category: p.category,
    categorySlug: p.categorySlug,
    categoriesBySlug: ctx.categoriesBySlug,
    limit: p.limit ?? 3,
  });
  const maxTilt = TILT_DEG[p.intensity ?? 'medium'];

  if (products.length === 0) {
    if (!ctx.isPreview) return null;
    return <p style={emptyEyebrow()}>{isRtl ? 'أضف منتجات لعرضها هنا' : 'Add products to spotlight them here'}</p>;
  }

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 'clamp(20px, 3vw, 34px)' }}>
      {(p.eyebrow || p.title || p.subtitle) && (
        <header style={{ display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
          {p.eyebrow ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
              }}
            >
              {p.eyebrow}
            </span>
          ) : null}
          {p.title ? (
            <h2
              style={{
                margin: 0,
                fontFamily: isRtl ? 'var(--font-arabic-serif)' : 'var(--font-serif, var(--font-sans))',
                fontWeight: 500,
                fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)',
                lineHeight: 1.1,
              }}
            >
              {p.title}
            </h2>
          ) : null}
          {p.subtitle ? (
            <p
              style={{
                margin: 0,
                maxWidth: 560,
                fontSize: 'clamp(0.95rem, 1.4vw, 1.05rem)',
                lineHeight: 1.6,
                color: 'color-mix(in srgb, var(--sf-ink) 70%, transparent)',
              }}
            >
              {p.subtitle}
            </p>
          ) : null}
        </header>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 240px), 1fr))`,
          gap: 'clamp(14px, 2vw, 24px)',
          perspective: '1100px',
        }}
      >
        {products.map((product) => (
          <TiltCard
            key={product.id}
            product={product}
            href={`${ctx.storefrontBaseHref}/p/${productPathSegment(product)}`}
            isRtl={isRtl}
            maxTilt={maxTilt}
          />
        ))}
      </div>
    </section>
  );
}

function TiltCard({
  product,
  href,
  isRtl,
  maxTilt,
}: {
  product: Product;
  href: string;
  isRtl: boolean;
  maxTilt: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const [t, setT] = useState<{ rx: number; ry: number; active: boolean }>({
    rx: 0,
    ry: 0,
    active: false,
  });

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * maxTilt, ry: px * maxTilt, active: true });
  };
  const onLeave = () => setT({ rx: 0, ry: 0, active: false });

  const transform = reduce
    ? undefined
    : `perspective(1100px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateY(${t.active ? -6 : 0}px)`;

  return (
    <a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'color-mix(in srgb, var(--sf-ground) 82%, var(--sf-ink) 4%)',
          border: '1px solid color-mix(in srgb, var(--sf-ink) 14%, transparent)',
          transform,
          transformStyle: 'preserve-3d',
          transition: t.active
            ? 'box-shadow 220ms ease'
            : 'transform 420ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 220ms ease',
          boxShadow: t.active
            ? '0 30px 60px -30px color-mix(in srgb, var(--sf-ink) 55%, transparent)'
            : '0 12px 30px -24px color-mix(in srgb, var(--sf-ink) 45%, transparent)',
          willChange: 'transform',
        } as CSSProperties
      }
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 5',
          background: product.imageUrl
            ? `center / cover no-repeat url("${product.imageUrl}")`
            : 'color-mix(in srgb, var(--sf-accent) 24%, var(--sf-ground))',
          transform: reduce ? undefined : 'translateZ(24px)',
        }}
      />
      <div style={{ padding: '14px 16px 18px', display: 'grid', gap: 6 }}>
        <strong
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.title}
        </strong>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'color-mix(in srgb, var(--sf-ink) 78%, var(--sf-accent))',
          }}
        >
          {formatPrice(product.priceQar, isRtl)}
        </span>
      </div>
    </a>
  );
}
