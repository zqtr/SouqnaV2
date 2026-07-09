'use client';

import { createElement, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import StaggeredText from '@/components/souqna-motion/staggered-text';
import { DiaTextReveal } from '@/components/souqna-motion/dia-text-reveal';
import { getTextFx } from '@/lib/blocks/textFx';
import type { TextEffect } from '@/lib/blocks/types';
import './text-fx.css';

type Props = {
  effect?: TextEffect;
  as: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /**
   * When set (builder preview only), stamps `data-edit-field` on the
   * rendered element so the canvas inline-editor can turn it into a
   * contenteditable and write the value back to the block prop of this
   * name. Applied on the plain and generic-motion paths — which is what
   * Simple mode renders, since it hides the exotic text effects.
   */
  editField?: string;
};

// Shared stylesheet for the gradient-clipped text effects (`shine-sweep`,
// `gradient-flow`). Colour lives here (not inline) so the `@supports`
// fallback can settle unsupported browsers on a solid, legible --sf-ink
// instead of transparent text. Both loop and are palette-locked.
const SHINE_STYLES = `
.souqna-shine, .souqna-gflow { color: var(--sf-ink, #1f1b16); }
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .souqna-shine {
    background-image: linear-gradient(100deg,
      var(--sf-ink, #1f1b16) 0 40%,
      color-mix(in srgb, var(--sf-accent, #c9a961) 88%, #fff) 50%,
      var(--sf-ink, #1f1b16) 60% 100%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: souqna-shine-sweep 3.4s ease-in-out infinite;
  }
  .souqna-gflow {
    background-image: linear-gradient(90deg,
      var(--sf-accent, #c9a961),
      var(--sf-ink, #1f1b16),
      var(--sf-accent, #c9a961));
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: souqna-gflow 6s linear infinite;
  }
}
@keyframes souqna-shine-sweep { 0% { background-position: 180% 0; } 100% { background-position: -80% 0; } }
@keyframes souqna-gflow { 0% { background-position: 0 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) {
  .souqna-shine, .souqna-gflow { animation: none; background: none; color: var(--sf-ink, #1f1b16); }
}
`;

export function TextEffectRenderer({ effect, as, children, style, className, editField }: Props) {
  const reduced = useReducedMotion();
  const text = typeof children === 'string' ? children : '';
  const editAttr = editField ? { 'data-edit-field': editField } : undefined;
  if (!effect || effect === 'none' || reduced || !text) {
    return createElement(as, { style, className, ...editAttr }, children);
  }

  const fx = getTextFx(effect);
  if (fx) {
    // Colorion FX — pure-CSS classes from ./text-fx.css. `.souqna-tfx`
    // maps the upstream colour tokens onto the merchant palette; the
    // markup recipe decides how the copy is laid out (see textFx.ts).
    // `--fx-chars` feeds width/stagger maths (typewriter reveal span).
    const fxClass = [className, 'souqna-tfx', `fx-${fx.slug}`].filter(Boolean).join(' ');
    const fxStyle = { ...style, '--fx-chars': text.length } as CSSProperties;
    if (fx.markup === 'letters') {
      // Per-glyph stagger. Arabic (and other joining scripts) is split
      // per word instead — glyphs in separate elements lose their
      // contextual shaping and render as disconnected letter forms.
      const byWord = /[؀-ۿݐ-ݿ]/.test(text);
      const units = byWord ? text.split(/(\s+)/).filter(Boolean) : [...text];
      return createElement(
        as,
        { style: fxStyle, className: fxClass, role: 'img', 'aria-label': text },
        units.map((unit, i) =>
          createElement(
            'b',
            { key: i, 'aria-hidden': true, style: { '--i': i } as CSSProperties },
            /^\s+$/.test(unit) ? '\u00A0' : unit,
          ),
        ),
      );
    }
    if (fx.markup === 'data-text') {
      return createElement(as, { style: fxStyle, className: fxClass, 'data-text': text, ...editAttr }, children);
    }
    return createElement(as, { style: fxStyle, className: fxClass, ...editAttr }, children);
  }

  if (effect === 'staggered-text') {
    return (
      <div style={style} className={className}>
        <StaggeredText text={text} as={as === 'div' ? 'p' : as} segmentBy="words" delay={45} duration={0.54} blur />
      </div>
    );
  }

  if (effect === 'blur-highlight') {
    return (
      <>
        <style>{`
          @keyframes souqna-blur-highlight {
            0% { filter: blur(8px); opacity: .4; background-size: 0% 42%; }
            100% { filter: blur(0); opacity: 1; background-size: 100% 42%; }
          }
        `}</style>
        {createElement(
          as,
          {
            style: {
              ...style,
              display: 'inline',
              backgroundImage: 'linear-gradient(color-mix(in srgb, var(--sf-accent) 34%, transparent), color-mix(in srgb, var(--sf-accent) 34%, transparent))',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: '0 86%',
              animation: 'souqna-blur-highlight 850ms ease both',
            },
            className,
          },
          children,
        )}
      </>
    );
  }

  if (effect === 'dia-reveal') {
    // A colour band sweeps across the copy and settles on --sf-ink. The
    // heading element carries the caller's font styles; the inner span
    // handles the gradient reveal and is SSR-safe (solid text until the
    // client mounts).
    return createElement(
      as,
      { style, className },
      <DiaTextReveal text={text} duration={1.4} />,
    );
  }

  if (effect === 'shine-sweep' || effect === 'gradient-flow') {
    // Gradient-clipped text. Colour is owned by the injected class (never
    // an inline style) so the `@supports` fallback to a solid --sf-ink
    // can win when `background-clip: text` is unavailable — the text is
    // never stranded transparent. We therefore strip any inline `color`
    // the caller passed.
    const sfxClass = effect === 'shine-sweep' ? 'souqna-shine' : 'souqna-gflow';
    const styleNoColor: CSSProperties = { ...(style ?? {}) };
    delete styleNoColor.color;
    return (
      <>
        <style>{SHINE_STYLES}</style>
        {createElement(
          as,
          {
            style: styleNoColor,
            className: [className, sfxClass].filter(Boolean).join(' '),
          },
          children,
        )}
      </>
    );
  }

  if (effect === 'glitch-text') {
    return (
      <>
        <style>{`
          @keyframes souqna-glitch {
            0%, 100% { text-shadow: none; transform: translateX(0); }
            22% { text-shadow: 2px 0 #7ccfa8, -2px 0 #8b3a3a; transform: translateX(-1px); }
            44% { text-shadow: -2px 0 #c9a961, 2px 0 #365f8f; transform: translateX(1px); }
          }
        `}</style>
        {createElement(as, { style: { ...style, animation: 'souqna-glitch 2.6s steps(2, end) infinite' }, className }, children)}
      </>
    );
  }

  const motionProps =
    effect === '3d-letter-swap' || effect === '3d-text-reveal'
      ? { rotateX: [70, 0], y: [18, 0], opacity: [0, 1] }
      : effect === 'particle-text' || effect === 'text-scatter'
        ? { letterSpacing: ['0.22em', '0em'], filter: ['blur(4px)', 'blur(0px)'], opacity: [0, 1] }
        : effect === 'text-path'
          ? { x: [-18, 0], opacity: [0, 1] }
          : { opacity: [0, 1] };

  const MotionTag = motion[as === 'div' ? 'div' : as];
  return (
    <MotionTag
      initial={false}
      animate={motionProps}
      transition={{ duration: 0.72, ease: 'easeOut' }}
      {...editAttr}
      style={{
        ...style,
        transformStyle: effect.includes('3d') ? 'preserve-3d' : undefined,
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
