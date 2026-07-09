'use client';

import { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Souqy's working indicator — a 3×3 matrix whose lit cells sweep through
 * the grid in a chromatic-split "comet", paired with a status word
 * (Loading / Thinking / Managing / Building). One animation for every
 * busy state in the IDE so waiting always reads as the same brand moment.
 *
 * The cell opacities per frame trace the comet; the RGB-split SVG filter
 * gives the lit cells their aberration. Static (frame 0) under
 * prefers-reduced-motion.
 */
const FRAMES: number[][][] = [
  [[1, 0, 0], [0.767, 0, 0], [0.533, 0, 0]],
  [[0.767, 1, 0], [0.533, 0, 0], [0, 0, 0]],
  [[0.533, 0.767, 1], [0, 0, 0], [0, 0, 0]],
  [[0, 0.533, 0.767], [0, 0, 1], [0, 0, 0]],
  [[0, 0, 0.533], [0, 0, 0.767], [0, 0, 1]],
  [[0, 0, 0], [0, 0, 0.533], [0, 1, 0.767]],
  [[0, 0, 0], [0, 0, 0], [1, 0.767, 0.533]],
  [[0, 0, 0], [1, 0, 0], [0.767, 0.533, 0]],
];

const CELL = 27;
const GAP = 5;
const SPAN = 3 * CELL + 2 * GAP; // 91
const ON = '#E0DACA';
const OFF = '#22211E';

export function SouqyPulse({
  label,
  size = 60,
}: {
  label?: string;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const rawId = useId();
  const filterId = `souqy-pulse-${rawId.replace(/[:]/g, '')}`;
  const cellRefs = useRef<Array<SVGRectElement | null>>([]);

  useEffect(() => {
    const apply = (frameIndex: number) => {
      const frame = FRAMES[frameIndex]!;
      let i = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cellRefs.current[i++]?.setAttribute('opacity', String(frame[r]![c]));
        }
      }
    };
    apply(0);
    if (reduced) return;

    let raf = 0;
    let frameIndex = 0;
    let last = performance.now();
    const frameMs = 1000 / 24;
    const tick = (now: number) => {
      if (now - last >= frameMs) {
        last = now - ((now - last) % frameMs);
        frameIndex = (frameIndex + 1) % FRAMES.length;
        apply(frameIndex);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  let cellKey = 0;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Working'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SPAN} ${SPAN}`}
        style={{ overflow: 'visible', flexShrink: 0 }}
        aria-hidden
      >
        <defs>
          <filter
            id={filterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              result="r"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
            <feOffset in="r" dx="-3" dy="0" result="rs" />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              result="g"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              result="b"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
            <feOffset in="b" dx="3" dy="0" result="bs" />
            <feBlend in="rs" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="bs" mode="screen" />
          </filter>
        </defs>
        <g>
          {Array.from({ length: 3 }).flatMap((_, r) =>
            Array.from({ length: 3 }).map((__, c) => (
              <rect
                key={`off-${r}-${c}`}
                x={c * (CELL + GAP)}
                y={r * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill={OFF}
              />
            )),
          )}
        </g>
        <g filter={`url(#${filterId})`}>
          {Array.from({ length: 3 }).flatMap((_, r) =>
            Array.from({ length: 3 }).map((__, c) => {
              const index = cellKey++;
              return (
                <rect
                  key={`on-${r}-${c}`}
                  ref={(el) => {
                    cellRefs.current[index] = el;
                  }}
                  x={c * (CELL + GAP)}
                  y={r * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={ON}
                  opacity={0}
                />
              );
            }),
          )}
        </g>
      </svg>
      {label ? (
        <span
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 14,
            letterSpacing: '0.02em',
            color: ON,
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
