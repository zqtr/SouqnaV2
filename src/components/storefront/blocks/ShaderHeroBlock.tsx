'use client';

import SilkWaves from '@/components/react-bits/silk-waves';
import type { ShaderHeroProps } from '@/lib/blocks/types';
import type { BlockRenderProps } from './BlockContext';
import { PremiumFxFrame } from './PremiumFxFrame';

/**
 * Premium shader hero (Max+). A React Bits Pro `SilkWaves` WebGL gradient
 * drifts behind an editorial hero, wrapped in {@link PremiumFxFrame} so it
 * lazy-mounts in view, falls back to a static gradient on mobile /
 * reduced-motion, and never spins up more than one GPU context per page.
 *
 * Colourways are Souqna-owned (cream / ink / gold) — no arbitrary neon —
 * so generated storefronts stay on-brand. Mirrors `PortalHeroBlock`'s
 * tone + RTL model.
 */
const TONES: Record<
  NonNullable<ShaderHeroProps['tone']>,
  { bg: string; ink: string; muted: string; ctaInk: string; silk: string[]; fallback: string }
> = {
  cream: {
    bg: '#E8DCC4',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.66)',
    ctaInk: '#F7F7F3',
    silk: ['#E8DCC4', '#E2D6BC', '#D8C9A8', '#CBB98F', '#C9A961', '#D4AF37', '#F1E9D7', '#FFFFFF'],
    fallback:
      'radial-gradient(circle at 30% 22%, rgba(212,175,55,0.45) 0, transparent 46%), linear-gradient(135deg, #E8DCC4 0%, #CBB98F 100%)',
  },
  ink: {
    bg: '#0A0A0A',
    ink: '#F7F7F3',
    muted: 'rgba(247,247,243,0.7)',
    ctaInk: '#0A0A0A',
    silk: ['#0A0A0A', '#141210', '#1F1B16', '#2A2A2A', '#5B4A25', '#8B6F2A', '#C9A961', '#E8DCC4'],
    fallback:
      'radial-gradient(circle at 68% 30%, rgba(201,169,97,0.4) 0, transparent 44%), linear-gradient(135deg, #0A0A0A 0%, #2A2A2A 100%)',
  },
  gold: {
    bg: '#2A2A2A',
    ink: '#F7F7F3',
    muted: 'rgba(247,247,243,0.72)',
    ctaInk: '#0A0A0A',
    silk: ['#2A2A2A', '#3A3320', '#5B4A25', '#8B6F2A', '#C9A961', '#D4AF37', '#E8DCC4', '#FFFFFF'],
    fallback:
      'radial-gradient(circle at 40% 24%, rgba(212,175,55,0.5) 0, transparent 48%), linear-gradient(135deg, #2A2A2A 0%, #8B6F2A 100%)',
  },
};

export function ShaderHeroBlock({ block, ctx }: BlockRenderProps<ShaderHeroProps>) {
  const p = block.props;
  const tone = TONES[p.tone ?? 'ink'];
  const immersive = p.layout === 'immersive';
  const isRtl = ctx.isRtl;
  const headingFamily = isRtl
    ? 'var(--font-arabic-serif), var(--font-arabic), serif'
    : 'var(--font-serif), var(--font-sans), serif';
  const bodyFamily = isRtl ? 'var(--font-arabic), var(--font-sans)' : 'var(--font-sans)';

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: immersive ? 'min(760px, 82svh)' : 'min(600px, 66svh)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(36px, 8vw, 92px) clamp(20px, 5vw, 72px)',
        background: tone.bg,
        color: tone.ink,
        isolation: 'isolate',
      }}
    >
      <PremiumFxFrame
        style={{ position: 'absolute', inset: 0, zIndex: -2 }}
        fallback={<div aria-hidden style={{ position: 'absolute', inset: 0, background: tone.fallback }} />}
      >
        <div aria-hidden style={{ position: 'absolute', inset: 0 }}>
          <SilkWaves
            colors={tone.silk}
            speed={0.7}
            scale={immersive ? 1.7 : 2.1}
            brightness={p.tone === 'cream' ? 1.05 : 0.9}
            className="h-full w-full"
          />
        </div>
      </PremiumFxFrame>

      {/* Legibility scrim */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          background:
            p.tone === 'cream'
              ? 'radial-gradient(circle at 50% 46%, rgba(232,220,196,0) 0 26%, rgba(232,220,196,0.66) 58%, #E8DCC4 100%)'
              : 'radial-gradient(circle at 50% 46%, rgba(10,10,10,0) 0 30%, rgba(10,10,10,0.55) 60%, rgba(10,10,10,0.9) 100%)',
        }}
      />

      <div
        style={{
          width: 'min(820px, 100%)',
          marginInline: 'auto',
          display: 'grid',
          justifyItems: 'center',
          gap: 'clamp(14px, 2.4vw, 24px)',
          textAlign: 'center',
        }}
      >
        {p.eyebrow ? (
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: tone.muted,
            }}
          >
            {p.eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            margin: 0,
            maxWidth: 760,
            fontFamily: headingFamily,
            fontSize: immersive ? 'clamp(3rem, 8vw, 7rem)' : 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 500,
            lineHeight: isRtl ? 1.08 : 0.96,
          }}
        >
          {p.title}
        </h1>
        {p.subtitle ? (
          <p
            style={{
              margin: 0,
              maxWidth: 620,
              fontFamily: bodyFamily,
              fontSize: 'clamp(1rem, 1.7vw, 1.22rem)',
              lineHeight: 1.7,
              color: tone.muted,
            }}
          >
            {p.subtitle}
          </p>
        ) : null}
        {p.cta ? (
          <a
            href={p.cta.href || '#contact'}
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
            }}
          >
            {p.cta.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
