'use client';

import { useEffect, useRef } from 'react';
import type { ParallaxStoryHeroProps } from '@/lib/blocks/types';
import type { BlockRenderProps } from './BlockContext';

/**
 * Max+ scroll-driven multi-layer parallax hero ("scrollytelling" opener).
 *
 * Every element is a layer whose translate is mapped to how far the
 * section's center sits from the viewport center: built-in dune/scene
 * silhouettes move slowly (far), optional merchant cutout images drift
 * mid-speed, and the headline is split so each letter carries its own
 * depth — the word assembles as the hero centers and scatters as it
 * leaves. The near silhouette stacks *above* the headline so the letters
 * read as part of the scene.
 *
 * Cheap by construction: no GPU context (unlike shaderHero), only
 * compositor `translate3d` writes behind one rAF-throttled scroll
 * listener, skipped entirely off-screen and under reduced-motion. SSR
 * renders the untransformed scene, so copy is always visible without JS.
 *
 * RTL: Arabic is cursive — per-letter spans would break glyph shaping —
 * so RTL titles scatter per word instead.
 */
const TONES: Record<
  NonNullable<ParallaxStoryHeroProps['tone']>,
  { bg: string; ink: string; muted: string; ctaInk: string; sun: string; far: string; mid: string; near: string; scrim: string }
> = {
  cream: {
    bg: 'linear-gradient(180deg, #F1E9D7 0%, #E8DCC4 52%, #D8C9A8 100%)',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.64)',
    ctaInk: '#F7F7F3',
    sun: '#D4AF37',
    far: '#D8C9A8',
    mid: '#CBB98F',
    near: '#B7A276',
    scrim: 'radial-gradient(circle at 50% 44%, rgba(232,220,196,0) 0 34%, rgba(232,220,196,0.5) 72%, rgba(232,220,196,0.82) 100%)',
  },
  ink: {
    bg: 'linear-gradient(180deg, #141210 0%, #0A0A0A 55%, #1F1B16 100%)',
    ink: '#F7F7F3',
    muted: 'rgba(247,247,243,0.7)',
    ctaInk: '#0A0A0A',
    sun: '#C9A961',
    far: '#1F1B16',
    mid: '#2A2416',
    near: '#3A3320',
    scrim: 'radial-gradient(circle at 50% 44%, rgba(10,10,10,0) 0 36%, rgba(10,10,10,0.4) 70%, rgba(10,10,10,0.75) 100%)',
  },
  gold: {
    bg: 'linear-gradient(180deg, #3A3320 0%, #2A2A2A 50%, #5B4A25 100%)',
    ink: '#F7F7F3',
    muted: 'rgba(247,247,243,0.72)',
    ctaInk: '#0A0A0A',
    sun: '#D4AF37',
    far: '#4A3E22',
    mid: '#5B4A25',
    near: '#2A2416',
    scrim: 'radial-gradient(circle at 50% 44%, rgba(42,42,42,0) 0 36%, rgba(42,42,42,0.42) 70%, rgba(42,42,42,0.78) 100%)',
  },
};

/** Scroll travel (px per viewport of scroll) by intensity. */
const TRAVEL: Record<NonNullable<ParallaxStoryHeroProps['intensity']>, number> = {
  subtle: 60,
  medium: 110,
  strong: 170,
};

/** Deterministic per-letter depth cycle — no randomness (SSR hydration). */
const LETTER_DEPTHS = [1.18, 0.86, 1.42, 0.95, 1.3, 1.06, 1.52, 0.9];

export function ParallaxStoryHeroBlock({ block, ctx }: BlockRenderProps<ParallaxStoryHeroProps>) {
  const p = block.props;
  const tone = TONES[p.tone ?? 'ink'];
  const travel = TRAVEL[p.intensity ?? 'medium'];
  const immersive = p.layout !== 'compact';
  const isRtl = ctx.isRtl;
  const rootRef = useRef<HTMLElement>(null);

  const headingFamily = isRtl
    ? 'var(--font-arabic-serif), var(--font-arabic), serif'
    : 'var(--font-serif), var(--font-sans), serif';
  const bodyFamily = isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-px-depth]'));
    if (layers.length === 0) return;
    const depths = layers.map((el) => Number(el.dataset.pxDepth) || 0);
    const drifts = layers.map((el) => Number(el.dataset.pxDrift) || 0);

    let ticking = false;
    const paint = () => {
      ticking = false;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      if (rect.bottom < -vh * 0.5 || rect.top > vh * 1.5) return;
      // 0 when the hero is centered in the viewport, ±1 a full screen away.
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const range = window.innerWidth < 640 ? travel * 0.6 : travel;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!layer) continue;
        const x = (-progress * (drifts[i] ?? 0) * range).toFixed(1);
        const y = (progress * (depths[i] ?? 0) * range).toFixed(1);
        layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(paint);
      }
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [travel]);

  // Per-letter scatter for LTR; per-word for RTL so Arabic shaping survives.
  let depthCursor = 0;
  const words = p.title.split(/\s+/).filter(Boolean);
  const titleSpans = words.map((word, w) => {
    if (isRtl) {
      const depth = LETTER_DEPTHS[depthCursor++ % LETTER_DEPTHS.length];
      return (
        <span key={w} data-px-depth={depth} style={{ display: 'inline-block', willChange: 'transform' }}>
          {word}
        </span>
      );
    }
    return (
      <span key={w} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        {Array.from(word).map((ch, i) => {
          const depth = LETTER_DEPTHS[depthCursor++ % LETTER_DEPTHS.length];
          return (
            <span key={i} data-px-depth={depth} style={{ display: 'inline-block', willChange: 'transform' }}>
              {ch}
            </span>
          );
        })}
      </span>
    );
  });

  const layerBase: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    willChange: 'transform',
    pointerEvents: 'none',
  };

  return (
    <section
      ref={rootRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: immersive ? 'min(780px, 88svh)' : 'min(600px, 66svh)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(36px, 8vw, 92px) clamp(20px, 5vw, 72px)',
        background: tone.bg,
        color: tone.ink,
        isolation: 'isolate',
      }}
    >
      {/* Far scene: optional merchant photo, else the tone sky + sun disc. */}
      {p.backgroundImage ? (
        <div
          aria-hidden
          data-px-depth={0.08}
          style={{
            ...layerBase,
            inset: '-12% 0',
            zIndex: -6,
            backgroundImage: `url(${p.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <div
          aria-hidden
          data-px-depth={0.22}
          style={{
            ...layerBase,
            zIndex: -6,
            display: 'grid',
            justifyItems: 'end',
            alignItems: 'start',
            paddingTop: '7%',
            paddingInlineEnd: '16%',
          }}
        >
          <div
            style={{
              width: 'clamp(80px, 12vw, 150px)',
              aspectRatio: '1',
              borderRadius: '50%',
              background: tone.sun,
              opacity: 0.85,
              boxShadow: `0 0 90px 30px ${tone.sun}55`,
            }}
          />
        </div>
      )}

      {/* Built-in dune silhouettes: far → mid (behind copy). A merchant
          photo replaces the illustrated scene, so they step aside. */}
      {!p.backgroundImage ? (
        <>
          <div aria-hidden data-px-depth={0.18} style={{ ...layerBase, top: 'auto', height: '46%', bottom: '-9%', zIndex: -5 }}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M0 24 Q16 12 34 20 T66 15 T100 21 V40 H0 Z" fill={tone.far} />
            </svg>
          </div>
          <div aria-hidden data-px-depth={0.35} style={{ ...layerBase, top: 'auto', height: '38%', bottom: '-11%', zIndex: -4 }}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M0 22 Q20 10 42 19 T76 14 T100 20 V40 H0 Z" fill={tone.mid} />
            </svg>
          </div>
        </>
      ) : null}

      {p.midgroundImage ? (
        <div
          aria-hidden
          data-px-depth={0.5}
          data-px-drift={isRtl ? -0.6 : 0.6}
          style={{
            ...layerBase,
            inset: 'auto',
            insetInlineStart: '10%',
            bottom: '18%',
            width: 'clamp(120px, 22vw, 280px)',
            zIndex: -3,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.midgroundImage} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      ) : null}

      {/* Legibility scrim between scene and copy. Photos get an extra
          uniform veil — merchant images can be bright anywhere. */}
      {p.backgroundImage ? (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -2, background: 'rgba(10,10,10,0.3)', pointerEvents: 'none' }} />
      ) : null}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -2, background: tone.scrim, pointerEvents: 'none' }} />

      {/* Copy — the headline letters are layers themselves. */}
      <div
        style={{
          width: 'min(860px, 100%)',
          marginInline: 'auto',
          display: 'grid',
          justifyItems: 'center',
          gap: 'clamp(14px, 2.4vw, 24px)',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {p.eyebrow ? (
          <p
            data-px-depth={0.85}
            data-edit-field={ctx.isPreview ? 'eyebrow' : undefined}
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: tone.muted,
              willChange: 'transform',
            }}
          >
            {p.eyebrow}
          </p>
        ) : null}
        <h1
          data-edit-field={ctx.isPreview ? 'title' : undefined}
          style={{
            margin: 0,
            maxWidth: 800,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: '0.28em',
            fontFamily: headingFamily,
            fontSize: immersive ? 'clamp(3rem, 9vw, 7.5rem)' : 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 500,
            lineHeight: isRtl ? 1.12 : 1,
          }}
        >
          {titleSpans}
        </h1>
        {p.subtitle ? (
          <p
            data-px-depth={1.05}
            data-edit-field={ctx.isPreview ? 'subtitle' : undefined}
            style={{
              margin: 0,
              maxWidth: 620,
              fontFamily: bodyFamily,
              fontSize: 'clamp(1rem, 1.7vw, 1.22rem)',
              lineHeight: 1.7,
              color: tone.muted,
              willChange: 'transform',
            }}
          >
            {p.subtitle}
          </p>
        ) : null}
        {p.cta ? (
          <a
            href={p.cta.href || '#contact'}
            data-px-depth={1.05}
            style={{
              marginTop: 6,
              display: 'inline-flex',
              minHeight: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              paddingInline: 24,
              fontFamily: bodyFamily,
              fontSize: 14,
              fontWeight: 600,
              color: tone.ctaInk,
              background: tone.ink,
              textDecoration: 'none',
              willChange: 'transform',
            }}
          >
            {p.cta.label}
          </a>
        ) : null}
      </div>

      {/* Near scene: fast dune + optional cutout stacked above the headline. */}
      {!p.backgroundImage ? (
        <div aria-hidden data-px-depth={0.7} style={{ ...layerBase, top: 'auto', height: '26%', bottom: '-13%', zIndex: 2 }}>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
            <path d="M0 20 Q18 11 40 18 T72 13 T100 19 V40 H0 Z" fill={tone.near} />
          </svg>
        </div>
      ) : null}
      {p.foregroundImage ? (
        <div
          aria-hidden
          data-px-depth={0.9}
          data-px-drift={isRtl ? 0.4 : -0.4}
          style={{
            ...layerBase,
            inset: 'auto',
            insetInlineEnd: '8%',
            bottom: '-2%',
            width: 'clamp(140px, 26vw, 340px)',
            zIndex: 3,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.foregroundImage} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      ) : null}
    </section>
  );
}
