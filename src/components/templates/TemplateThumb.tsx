'use client';

import { useState } from 'react';

type PreviewPalette = { ink: string; ground: string; accent: string };

type Props = {
  posterSrc: string;
  palette: PreviewPalette;
  label: string;
  /** width / height */
  aspect?: number;
};

/**
 * Lightweight template thumbnail for the `/templates` index grid.
 *
 * Shows the `preview.webp` screenshot, or a palette-derived gradient with
 * the template name while that file is missing (same graceful-fallback
 * contract as `templatePresets.previewImage`). No iframe, no chrome —
 * the rich, interactive embed lives on the detail page.
 */
export function TemplateThumb({ posterSrc, palette, label, aspect = 16 / 10 }: Props) {
  const [failed, setFailed] = useState(false);

  const gradient =
    `radial-gradient(circle at 24% 20%, ${withAlpha(palette.accent, 0.6)} 0, transparent 46%),` +
    `linear-gradient(135deg, ${palette.ground} 0%, ${mix(palette.ground, palette.accent)} 100%)`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: String(aspect),
        overflow: 'hidden',
        background: failed ? gradient : palette.ground,
      }}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterSrc}
          alt={label}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-english)',
              fontWeight: 600,
              fontSize: 'clamp(16px, 2vw, 22px)',
              color: palette.ink,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace('#', '');
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(a: string, b: string): string {
  const pa = a.trim().replace('#', '');
  const pb = b.trim().replace('#', '');
  if (pa.length !== 6 || pb.length !== 6) return a;
  const blend = (i: number) =>
    Math.round((parseInt(pa.slice(i, i + 2), 16) + parseInt(pb.slice(i, i + 2), 16)) / 2)
      .toString(16)
      .padStart(2, '0');
  return `#${blend(0)}${blend(2)}${blend(4)}`;
}
