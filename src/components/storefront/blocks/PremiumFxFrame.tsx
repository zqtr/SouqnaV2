'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Props = {
  /** The heavy effect (WebGL/GSAP). Only mounted once in view. */
  children: ReactNode;
  /** Static, GPU-cheap stand-in shown before mount, on mobile, and under
   *  reduced-motion. Should visually approximate the effect. */
  fallback: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Pre-load margin so the effect is ready just before it scrolls in. */
  rootMargin?: string;
  /** Skip the heavy effect at/below this width (px). Mid-range phones
   *  choke on live WebGL — the fallback carries small screens. */
  mobileBreakpoint?: number;
};

/**
 * Budget guardrail for premium GPU-heavy blocks.
 *
 * Encodes the lesson from the `PremiumSurfaces` refactor (several live
 * WebGL contexts at once lagged mid-range phones): a heavy effect only
 * mounts when it's (a) scrolled into view, (b) above the mobile
 * breakpoint, and (c) not under `prefers-reduced-motion`. Otherwise the
 * `fallback` renders. Keep to **one** heavy effect per page.
 *
 * SSR and the first client render both show `fallback`, so hydration
 * matches; an effect then upgrades to the live version in view.
 */
export function PremiumFxFrame({
  children,
  fallback,
  className,
  style,
  rootMargin = '200px',
  mobileBreakpoint = 640,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
    if (reduce || small) return;

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, mobileBreakpoint]);

  return (
    <div ref={ref} className={className} style={style}>
      {active ? children : fallback}
    </div>
  );
}
