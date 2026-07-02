'use client';

import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';

export type DitherBorderBeamVariant = 'pulse' | 'sweep' | 'rotate' | 'corner-glow';

interface DitherBorderBeamProps {
  children?: React.ReactNode;
  className?: string;
  variant?: DitherBorderBeamVariant;
  /** Animation speed in seconds */
  speed?: number;
  /** Beam intensity (0–1) */
  intensity?: number;
  /** Use Souqna monochrome palette */
  monochrome?: boolean;
  /** Disable animation */
  static?: boolean;
}

export function DitherBorderBeam({
  children,
  className,
  variant = 'pulse',
  speed = 2.4,
  intensity = 0.6,
  monochrome = true,
  static: forceStatic = false,
}: DitherBorderBeamProps) {
  const reduced = useReducedMotion();
  const shouldAnimate = !reduced && !forceStatic;

  const baseClasses = cn(
    'relative overflow-hidden rounded-[22px] border border-[var(--sqs-line)]',
    'bg-[var(--sqs-panel)]',
    className
  );

  const beamColor = monochrome
    ? 'var(--sqs-cream)'
    : 'color-mix(in srgb, var(--sqs-cream) 85%, var(--sqs-accent, #c9a961))';

  return (
    <div className={baseClasses}>
      {/* Dither texture layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, color-mix(in srgb, var(--sqs-cream) 14%, transparent) 0.8px, transparent 0.8px)`,
          backgroundSize: '6px 6px',
          opacity: 0.18,
          mixBlendMode: 'screen',
        }}
      />

      {/* Animated beam layer */}
      {shouldAnimate && (
        <div
          className={cn(
            'absolute inset-0 z-10 pointer-events-none',
            variant === 'pulse' && 'animate-[dither-beam-pulse]',
            variant === 'sweep' && 'animate-[dither-beam-sweep]',
            variant === 'rotate' && 'animate-[dither-beam-rotate]',
          )}
          style={{
            '--beam-color': beamColor,
            '--beam-speed': `${speed}s`,
            '--beam-intensity': intensity,
          } as React.CSSProperties}
        />
      )}

      {/* Static fallback for reduced motion */}
      {!shouldAnimate && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${beamColor} 35%, transparent), transparent)`,
            opacity: intensity * 0.6,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-20">{children}</div>
    </div>
  );
}
