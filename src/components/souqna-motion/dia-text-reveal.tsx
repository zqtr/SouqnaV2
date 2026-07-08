'use client';

// Dia Text Reveal — a horizontal color band sweeps across the text with a
// gradient shine, then settles on a solid foreground colour.
//
// Ported from Magic UI (credit: @chishiyac / magicuidesign) with three
// changes for this codebase:
//   1. Imports come from `framer-motion` (the repo standard) rather than
//      `motion/react`.
//   2. Defaults are storefront-palette aware — `textColor` settles on
//      `--sf-ink` and the sweeping band is derived from `--sf-accent`,
//      so a merchant on any palette gets an on-brand metallic shine
//      instead of the stock rainbow.
//   3. It is SSR-safe: until the component has mounted on the client it
//      renders plain, solid, visible text. The storefront is very
//      sensitive to "invisible until JS" headings, so we never paint the
//      text transparent on the server or for no-JS visitors.

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Palette-derived metallic shine — a light accent highlight, the accent
// itself, then an accent/ink blend. Reads as a warm sweep on cream and a
// glint on charcoal without ever leaving the merchant's palette.
const DEFAULT_COLORS = [
  'color-mix(in srgb, var(--sf-accent, #c9a961) 55%, #fff)',
  'var(--sf-accent, #c9a961)',
  'color-mix(in srgb, var(--sf-accent, #c9a961) 72%, var(--sf-ink, #1f1b16))',
];
const BAND_HALF = 17;
const SWEEP_START = -BAND_HALF;
const SWEEP_END = 100 + BAND_HALF;

const sweepEase = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

function buildGradient(pos: number, colors: string[], textColor: string) {
  const bandStart = pos - BAND_HALF;
  const bandEnd = pos + BAND_HALF;

  if (bandStart >= 100) {
    return `linear-gradient(90deg, ${textColor}, ${textColor})`;
  }
  const n = colors.length;
  const parts: string[] = [];

  if (bandStart > 0) parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`);

  colors.forEach((c, i) => {
    const pct = n === 1 ? pos : bandStart + (i / (n - 1)) * BAND_HALF * 2;
    parts.push(`${c} ${pct.toFixed(2)}%`);
  });

  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`);

  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

function measureWidths(el: HTMLElement, texts: string[]) {
  const ghost = el.cloneNode() as HTMLElement;
  Object.assign(ghost.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: 'auto',
    whiteSpace: 'nowrap',
  });
  el.parentElement!.appendChild(ghost);
  const widths = texts.map((t) => {
    ghost.textContent = t;
    return ghost.getBoundingClientRect().width;
  });
  ghost.remove();
  return widths;
}

export interface DiaTextRevealProps
  extends Omit<
    HTMLMotionProps<'span'>,
    'ref' | 'children' | 'style' | 'animate' | 'transition' | 'color'
  > {
  /** Text to reveal. Pass multiple strings to rotate when `repeat` is `true`. */
  text: string | string[];
  /** Colours sampled across the moving gradient band. */
  colors?: string[];
  /** Solid colour the text settles on after the sweep. @default `var(--sf-ink)` */
  textColor?: string;
  /** Duration of one sweep pass, in seconds. @default 1.5 */
  duration?: number;
  /** Delay before the sweep starts, in seconds. @default 0 */
  delay?: number;
  /** When `text` is an array, advance to the next string after each pass. */
  repeat?: boolean;
  /** Pause between cycles when `repeat` is `true`, in seconds. @default 0.5 */
  repeatDelay?: number;
  /** Start only once the element scrolls into view. @default true */
  startOnView?: boolean;
  /** Fire in-view detection at most once (no replay on scroll-back). @default true */
  once?: boolean;
  className?: string;
  /** Lock width to the widest string (multi-line) to avoid layout shift. */
  fixedWidth?: boolean;
}

export function DiaTextReveal({
  text,
  colors = DEFAULT_COLORS,
  textColor = 'var(--sf-ink, #1f1b16)',
  duration = 1.5,
  delay = 0,
  repeat = false,
  repeatDelay = 0.5,
  startOnView = true,
  once = true,
  className,
  fixedWidth = false,
  ...props
}: DiaTextRevealProps) {
  const texts = Array.isArray(text) ? text : [text];
  const isMulti = texts.length > 1;
  const prefersReducedMotion = useReducedMotion();

  // Paint solid, visible text on the server and until the client mounts —
  // the sweep only ever runs after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const spanRef = useRef<HTMLSpanElement>(null);
  const optsRef = useRef({ colors, textColor, duration, delay, repeat, repeatDelay, texts });
  optsRef.current = { colors, textColor, duration, delay, repeat, repeatDelay, texts };

  const indexRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playRef = useRef<() => void>(() => {});
  const stopRef = useRef<(() => void) | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [measuredWidths, setMeasuredWidths] = useState<number[]>([]);

  const sweepPos = useMotionValue(SWEEP_START);

  const backgroundImage = useTransform(sweepPos, (pos) =>
    buildGradient(pos, optsRef.current.colors, optsRef.current.textColor),
  );

  const isInView = useInView(spanRef, { once, amount: 0.1 });

  useEffect(() => {
    const el = spanRef.current;
    if (!el || !isMulti) return;
    setMeasuredWidths(measureWidths(el, texts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(text) ? text.join('\0') : text]);

  playRef.current = () => {
    const { duration, delay, repeat, repeatDelay, texts } = optsRef.current;

    sweepPos.set(SWEEP_START);

    const controls = animate(sweepPos, SWEEP_END, {
      duration,
      delay,
      ease: sweepEase,
      onComplete() {
        if (!repeat) return;
        timerRef.current = setTimeout(() => {
          const next = (indexRef.current + 1) % texts.length;
          indexRef.current = next;
          setActiveIndex(next);
          playRef.current();
        }, repeatDelay * 1000);
      },
    });

    stopRef.current = () => controls.stop();
  };

  useEffect(() => {
    if (!mounted) return;
    if (prefersReducedMotion) {
      sweepPos.set(SWEEP_END);
      return;
    }
    if (startOnView && !isInView) return;
    if (once && hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    playRef.current();

    return () => {
      stopRef.current?.();
      clearTimeout(timerRef.current);
    };
  }, [mounted, isInView, startOnView, once, prefersReducedMotion, sweepPos]);

  const fixedW =
    isMulti && fixedWidth && measuredWidths.length > 0 ? Math.max(...measuredWidths) : undefined;

  const animatedW =
    isMulti && !fixedWidth && measuredWidths[activeIndex] != null
      ? measuredWidths[activeIndex]
      : undefined;

  // Pre-mount / reduced-motion: solid legible text, no background-clip.
  if (!mounted || prefersReducedMotion) {
    return (
      <span ref={spanRef} className={cn('align-bottom leading-[100%] text-inherit', className)} style={{ color: textColor }}>
        {texts[activeIndex]}
      </span>
    );
  }

  return (
    <motion.span
      ref={spanRef}
      className={cn('align-bottom leading-[100%] text-inherit', className)}
      style={{
        transform: 'translateY(-2px)',
        color: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        backgroundSize: '100% 100%',
        backgroundImage,
        ...(isMulti && {
          display: 'inline-block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          verticalAlign: 'text-center',
          ...(fixedW != null && { width: fixedW }),
        }),
      }}
      animate={animatedW != null ? { width: animatedW } : undefined}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      {...props}
    >
      {texts[activeIndex]}
    </motion.span>
  );
}

export default DiaTextReveal;
