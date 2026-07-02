'use client';

import Portal from '@/components/portal';
import type { PortalHeroProps } from '@/lib/blocks/types';
import type { BlockRenderProps } from './BlockContext';

const TONES: Record<
  NonNullable<PortalHeroProps['tone']>,
  {
    bg: string;
    ink: string;
    muted: string;
    primary: string;
    secondary: string;
    center: string;
    portalBg: string;
  }
> = {
  cream: {
    bg: '#E8DCC4',
    ink: '#0A0A0A',
    muted: 'rgba(10, 10, 10, 0.66)',
    primary: '#2A2A2A',
    secondary: '#D1C7B2',
    center: '#FFFFFF',
    portalBg: 'rgba(232, 220, 196, 0.18)',
  },
  ink: {
    bg: '#0A0A0A',
    ink: '#F7F7F3',
    muted: 'rgba(247, 247, 243, 0.68)',
    primary: '#E8DCC4',
    secondary: '#D1C7B2',
    center: '#FFFFFF',
    portalBg: 'rgba(247, 247, 243, 0.08)',
  },
  gold: {
    bg: '#2A2A2A',
    ink: '#F7F7F3',
    muted: 'rgba(247, 247, 243, 0.7)',
    primary: '#E8DCC4',
    secondary: '#FFFFFF',
    center: '#D1C7B2',
    portalBg: 'rgba(209, 199, 178, 0.12)',
  },
};

export function PortalHeroBlock({ block, ctx }: BlockRenderProps<PortalHeroProps>) {
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
        minHeight: immersive ? 'min(760px, 82svh)' : 'min(620px, 68svh)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(36px, 8vw, 92px) clamp(20px, 5vw, 72px)',
        background: tone.bg,
        color: tone.ink,
        isolation: 'isolate',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: immersive ? 0.9 : 0.72,
          zIndex: -2,
        }}
      >
        <Portal
          primaryColor={tone.primary}
          secondaryColor={tone.secondary}
          centerColor={tone.center}
          ballBgColor={tone.portalBg}
          brightness={p.brightness ?? (immersive ? 0.9 : 0.78)}
          brightnessThreshold={0.36}
          density={immersive ? 0.9 : 0.68}
          depthIntensity={immersive ? 0.18 : 0.14}
          speed={0.54}
          scale={immersive ? 0.88 : 1.18}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          background:
            p.tone === 'cream'
              ? 'radial-gradient(circle at 50% 46%, rgba(232,220,196,0) 0 28%, rgba(232,220,196,0.72) 56%, #E8DCC4 100%)'
              : 'radial-gradient(circle at 50% 46%, rgba(10,10,10,0) 0 30%, rgba(10,10,10,0.64) 58%, rgba(10,10,10,0.96) 100%)',
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
            letterSpacing: 0,
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
              border: `1px solid ${tone.ink}`,
              paddingInline: 22,
              fontFamily: bodyFamily,
              fontSize: 14,
              fontWeight: 600,
              color: p.tone === 'cream' ? '#F7F7F3' : '#0A0A0A',
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
