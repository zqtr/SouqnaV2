'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useBrowserSouqyContext } from './browser-context';

const SECTION_PAD = {
  tight: 'clamp(20px, 3vw, 36px)',
  comfortable: 'clamp(36px, 5vw, 64px)',
  spacious: 'clamp(56px, 8vw, 112px)',
} as const;

type Tone = 'default' | 'sand' | 'ink' | 'gold' | 'transparent';
const TONE_BG: Record<Tone, string> = {
  default: 'transparent',
  sand: 'var(--sf-ground)',
  ink: 'var(--sf-ink)',
  gold: 'var(--sf-accent)',
  transparent: 'transparent',
};

export type SectionProps = {
  size?: keyof typeof SECTION_PAD;
  tone?: Tone;
  align?: 'start' | 'center' | 'end';
  maxWidth?: number;
  id?: string;
  children?: ReactNode;
};

export function Section({
  size = 'comfortable',
  tone = 'default',
  align = 'start',
  maxWidth,
  id,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      style={{
        paddingBlock: SECTION_PAD[size],
        paddingInline: 'clamp(20px, 3vw, 40px)',
        background: TONE_BG[tone],
        color: tone === 'ink' ? 'var(--sf-ground)' : 'var(--sf-ink)',
        textAlign: align === 'start' ? 'left' : align,
      }}
    >
      <div style={{ maxWidth: maxWidth ?? 'min(1080px, 92vw)', marginInline: 'auto' }}>
        {children}
      </div>
    </section>
  );
}

export type StackProps = {
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  direction?: 'column' | 'row';
  wrap?: boolean;
  justify?: 'start' | 'center' | 'end' | 'between';
  children?: ReactNode;
};

export function Stack({
  gap = 16,
  align = 'stretch',
  direction = 'column',
  wrap = false,
  justify = 'start',
  children,
}: StackProps) {
  const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const;
  const justifyMap = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as const;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

export type GridProps = {
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: number;
  collapseAt?: number;
  children?: ReactNode;
};

export function Grid({ columns = 3, gap = 16, collapseAt = 720, children }: GridProps) {
  const className = `souqna-code-grid-${columns}`;
  return (
    <>
      <div className={className} style={{ display: 'grid', gap, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {children}
      </div>
      <style>{`@media (max-width:${collapseAt}px){.${className}{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}

export type QuoteProps = { children?: ReactNode; cite?: string };
export function Quote({ children, cite }: QuoteProps) {
  return (
    <figure style={{ margin: 0, textAlign: 'center', paddingBlock: 'clamp(24px, 4vw, 48px)', borderBlock: '1px solid color-mix(in oklab, var(--sf-ink) 15%, transparent)' }}>
      <blockquote style={{ margin: 0, fontFamily: 'var(--font-serif), serif', fontStyle: 'italic', fontSize: 'clamp(20px, 2.4vw, 32px)', lineHeight: 1.35, color: 'var(--sf-ink)' }}>
        {children}
      </blockquote>
      {cite ? <figcaption style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sf-accent)' }}>{cite}</figcaption> : null}
    </figure>
  );
}

export type CustomProps = {
  as?: 'div' | 'section' | 'main' | 'article' | 'aside' | 'header' | 'footer';
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: ReactNode;
};
export function Custom({ as: Tag = 'div', className, style, id, children }: CustomProps) {
  return <Tag data-souqy-custom="" id={id} className={className} style={style}>{children}</Tag>;
}

export type MarqueeProps = { items: string[]; speed?: 'slow' | 'medium' | 'fast' };
export function Marquee({ items, speed = 'medium' }: MarqueeProps) {
  const duration = speed === 'slow' ? 60 : speed === 'fast' ? 20 : 36;
  const isRtl = useBrowserSouqyContext().isRtl;
  const track = [...items, ...items];
  return (
    <div style={{ overflow: 'hidden', borderBlock: '1px solid color-mix(in oklab, var(--sf-ink) 12%, transparent)', paddingBlock: 12 }}>
      <div style={{ display: 'flex', gap: 32, width: 'max-content', animation: `souqna-code-marquee ${duration}s linear infinite ${isRtl ? 'reverse' : 'normal'}`, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sf-accent)' }}>
        {track.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>
      <style>{'@keyframes souqna-code-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}'}</style>
    </div>
  );
}
