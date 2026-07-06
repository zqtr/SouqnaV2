'use client';

import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

// Premium storefront background surfaces.
//
// These used to each mount a live three.js / @react-three/fiber WebGL
// canvas (aurora-blur, grain-wave, mosaic, glass-flow, gradient-bars,
// dot-shift). Because `BlockBackgroundFrame` wraps EVERY storefront
// section, a single page could spin up several WebGL contexts + RAF
// loops at once — which read as "extreme and laggy" on mid-range
// phones. They are now rebuilt as pure CSS in the spirit of the
// shadcnblocks background-pattern library: layered gradients + a
// `mask-image` fade, with a single GPU-cheap `transform`-only drift.
//
// The public API is unchanged on purpose — same six exports, same
// `{ children, className }` signature — so both consumers
// (`BlockBackgroundFrame` site backgrounds and `VariantFrame` block
// variants) and every persisted `backgroundEffect` id keep working with
// zero migration.
//
// Everything reads against the storefront palette via `--sf-ground` /
// `--sf-ink` / `--sf-accent` (set by `paletteCssVars`). No `dark:`
// utilities and no OS-theme reads — the storefront is palette-locked, so
// these surfaces stay legible in both themes.

type SurfaceProps = {
  children?: ReactNode;
  className?: string;
};

// ── Palette helpers ──────────────────────────────────────────────────
const ground = 'var(--sf-ground, #e8dcc4)';
const ink = (a: number) => `color-mix(in srgb, var(--sf-ink, #1f1b16) ${a}%, transparent)`;
const accent = (a: number) => `color-mix(in srgb, var(--sf-accent, #c9a961) ${a}%, transparent)`;

// Soft directional / radial fades reused across the surfaces so the
// pattern melts into the ground instead of ending on a hard tile edge —
// the signature "shadcn background pattern" look.
const FADE_RADIAL = 'radial-gradient(ellipse 120% 100% at 50% 0%, #000 30%, transparent 78%)';
const FADE_DIAGONAL = 'linear-gradient(120deg, #000 0%, #000 40%, transparent 82%)';
const FADE_CENTER = 'radial-gradient(circle at 50% 45%, #000 8%, transparent 66%)';

function PremiumRoot({
  children,
  className,
  style,
}: SurfaceProps & { style: CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        borderRadius: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A single oversized pattern layer that drifts via `transform` only
 * (translate / rotate / scale) so the browser composites it on the GPU
 * without per-frame paint. Oversizing (`inset: -18%`) keeps the drift
 * from exposing an empty edge. Static under reduced-motion.
 */
function PatternLayer({
  background,
  size,
  mask,
  blur,
  opacity = 1,
  animate,
  duration = 22,
  z = -1,
  reduced,
}: {
  background: string;
  size?: string;
  mask?: string;
  blur?: number;
  opacity?: number;
  animate?: TargetAndTransition;
  duration?: number;
  z?: number;
  reduced: boolean | null;
}) {
  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={reduced ? undefined : animate}
      transition={{ duration, ease: 'easeInOut', repeat: Infinity }}
      style={{
        position: 'absolute',
        inset: '-18%',
        zIndex: z,
        background,
        ...(size ? { backgroundSize: size } : {}),
        ...(mask
          ? {
              WebkitMaskImage: mask,
              maskImage: mask,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
            }
          : {}),
        ...(blur ? { filter: `blur(${blur}px)` } : {}),
        opacity,
        willChange: reduced ? undefined : 'transform',
      }}
    />
  );
}

// ── SILK — soft flowing aurora glow ──────────────────────────────────
export function SilkWavesSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot className={className} style={{ background: ground }}>
      <PatternLayer
        reduced={reduced}
        z={-2}
        blur={26}
        duration={26}
        background={`radial-gradient(42% 55% at 22% 30%, ${accent(38)}, transparent 66%), radial-gradient(48% 52% at 82% 68%, ${ink(16)}, transparent 66%), radial-gradient(40% 40% at 60% 12%, ${accent(22)}, transparent 70%)`}
        animate={{ transform: ['translate3d(-4%,0,0)', 'translate3d(4%,2%,0)', 'translate3d(-4%,0,0)'] }}
      />
      <PatternLayer
        reduced={reduced}
        z={-1}
        opacity={0.3}
        background={`repeating-linear-gradient(105deg, ${ink(7)} 0 1px, transparent 1px 18px)`}
        mask={FADE_DIAGONAL}
      />
      {children}
    </PremiumRoot>
  );
}

// ── GRAIN — soft dot grid with vignette ──────────────────────────────
export function GrainWaveSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot className={className} style={{ background: ground }}>
      <PatternLayer
        reduced={reduced}
        z={-2}
        blur={24}
        duration={20}
        background={`radial-gradient(45% 60% at 20% 30%, ${accent(28)}, transparent 70%), radial-gradient(55% 45% at 80% 72%, ${ink(14)}, transparent 68%)`}
        animate={{ transform: ['translate3d(-5%,0,0)', 'translate3d(5%,3%,0)', 'translate3d(-5%,0,0)'] }}
      />
      <PatternLayer
        reduced={reduced}
        z={-1}
        opacity={0.5}
        background={`radial-gradient(${ink(15)} 0.8px, transparent 0.9px)`}
        size="8px 8px"
        mask={FADE_CENTER}
      />
      {children}
    </PremiumRoot>
  );
}

// ── HALFTONE — accent dot grid with diagonal fade ────────────────────
export function HalftoneWaveSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot className={className} style={{ background: ground }}>
      <PatternLayer
        reduced={reduced}
        z={-1}
        duration={24}
        opacity={0.72}
        background={`radial-gradient(circle, ${accent(34)} 0 1.6px, transparent 1.9px)`}
        size="22px 22px"
        mask={FADE_DIAGONAL}
        animate={{ transform: ['translate3d(0,0,0)', 'translate3d(3%,2.5%,0)', 'translate3d(0,0,0)'] }}
      />
      <PatternLayer
        reduced={reduced}
        z={-2}
        blur={20}
        duration={30}
        background={`radial-gradient(50% 50% at 30% 20%, ${accent(18)}, transparent 68%)`}
        animate={{ transform: ['translate3d(0,0,0)', 'translate3d(4%,0,0)', 'translate3d(0,0,0)'] }}
      />
      {children}
    </PremiumRoot>
  );
}

// ── METAL — conic sheen over a subtle warm ground ────────────────────
export function MetallicSwirlSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot
      className={className}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${ground} 92%, var(--sf-accent, #c9a961)), ${ground})`,
      }}
    >
      <PatternLayer
        reduced={reduced}
        z={-1}
        blur={18}
        duration={30}
        opacity={0.9}
        background={`conic-gradient(from 120deg at 50% 50%, transparent, ${accent(42)}, ${ink(16)}, transparent, ${accent(30)}, transparent)`}
        animate={{ transform: ['rotate(0deg) scale(1)', 'rotate(12deg) scale(1.08)', 'rotate(0deg) scale(1)'] }}
      />
      <PatternLayer
        reduced={reduced}
        z={-1}
        opacity={0.28}
        background={`repeating-linear-gradient(45deg, ${ink(6)} 0 1px, transparent 1px 14px)`}
        mask={FADE_CENTER}
      />
      {children}
    </PremiumRoot>
  );
}

// ── BARS — editorial grid lines with edge fade ───────────────────────
export function GradientBarsSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot className={className} style={{ background: ground }}>
      <PatternLayer
        reduced={reduced}
        z={-2}
        blur={22}
        duration={18}
        background={`radial-gradient(60% 50% at 30% 20%, ${accent(24)}, transparent 70%), radial-gradient(50% 60% at 78% 80%, ${ink(12)}, transparent 70%)`}
        animate={{ transform: ['translate3d(-4%,0,0)', 'translate3d(4%,0,0)', 'translate3d(-4%,0,0)'] }}
      />
      <PatternLayer
        reduced={reduced}
        z={-1}
        opacity={0.7}
        duration={20}
        background={`linear-gradient(90deg, ${ink(9)} 1px, transparent 1px), linear-gradient(0deg, ${accent(12)} 1px, transparent 1px)`}
        size="34px 34px, 34px 34px"
        mask={FADE_RADIAL}
        animate={{ transform: ['translate3d(0,0,0)', 'translate3d(2.5%,0,0)', 'translate3d(0,0,0)'] }}
      />
      {children}
    </PremiumRoot>
  );
}

// ── CHROMA — gradient-border card over a masked dot grid ─────────────
export function ChromaDepthSurface({ children, className }: SurfaceProps) {
  const reduced = useReducedMotion();
  return (
    <PremiumRoot
      className={className}
      style={{
        padding: 1,
        borderRadius: 22,
        background: `linear-gradient(135deg, ${accent(72)}, ${ink(18)}, ${accent(42)})`,
        boxShadow: `0 30px 90px -42px ${accent(80)}, 0 1px 0 ${ink(12)}`,
      }}
    >
      <div
        style={{
          position: 'relative',
          isolation: 'isolate',
          borderRadius: 21,
          overflow: 'hidden',
          background: ground,
        }}
      >
        <PatternLayer
          reduced={reduced}
          z={-1}
          duration={26}
          opacity={0.6}
          background={`radial-gradient(${accent(38)} 1px, transparent 1.4px)`}
          size="16px 16px"
          mask={FADE_CENTER}
          animate={{ transform: ['translate3d(0,0,0)', 'translate3d(2%,2%,0)', 'translate3d(0,0,0)'] }}
        />
        {children}
      </div>
    </PremiumRoot>
  );
}
