'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

type PreviewPalette = { ink: string; ground: string; accent: string };

type Props = {
  /** Full-bleed live store URL — iframe src AND "See live" target. */
  liveHref: string;
  /** Screenshot poster (may 404 before the capture script runs). */
  posterSrc: string;
  /** CSS-only fallback shown while the poster file is missing. */
  palette: PreviewPalette;
  label: string;
  dir?: 'ltr' | 'rtl';
  /** Fake address shown in the browser chrome (e.g. `atrium.souqna.qa`). */
  addressLabel: string;
  interactLabel: string;
  loadingLabel: string;
  /** When false, render a static poster only (index thumbnails). */
  interactive?: boolean;
  /** Desktop width the iframe renders at before it's scaled to fit. */
  desktopWidth?: number;
  /** Frame aspect ratio, width / height. */
  aspect?: number;
};

/**
 * A framed, browser-chrome preview of a template.
 *
 * Poster-first: shows the `preview.webp` screenshot (or a palette gradient
 * fallback while that file is missing), then — on interaction — mounts the
 * real store in an iframe scaled from `desktopWidth` down to the frame,
 * so the embed reads as a desktop store. Full scroll lives behind the
 * "See live" button on the parent page.
 */
export function TemplatePreviewFrame({
  liveHref,
  posterSrc,
  palette,
  label,
  dir = 'ltr',
  addressLabel,
  interactLabel,
  loadingLabel,
  interactive = true,
  desktopWidth = 1280,
  aspect = 16 / 10,
}: Props) {
  const [live, setLive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setScale(el.clientWidth / desktopWidth);
  }, [desktopWidth]);

  useEffect(() => {
    measure();
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const gradient =
    `radial-gradient(circle at 22% 18%, ${withAlpha(palette.accent, 0.55)} 0, transparent 45%),` +
    `linear-gradient(135deg, ${palette.ground} 0%, ${mix(palette.ground, palette.accent)} 100%)`;

  const scaledHeight = desktopWidth / aspect / scale;

  return (
    <figure
      style={{
        margin: 0,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--sq-rule, rgba(31,27,22,0.14))',
        background: 'var(--sq-elevated, #F1E9D7)',
        boxShadow: '0 30px 60px -34px rgba(31,27,22,0.4)',
      }}
    >
      {/* Browser chrome */}
      <div
        dir="ltr"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--sq-rule, rgba(31,27,22,0.12))',
          background: 'var(--sq-bg, #E8DCC4)',
        }}
      >
        <span style={{ display: 'flex', gap: 6 }}>
          {['#E5665B', '#E7B14C', '#69B072'].map((c) => (
            <i
              key={c}
              style={{ width: 10, height: 10, borderRadius: 999, background: c, display: 'block' }}
            />
          ))}
        </span>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--sq-muted, rgba(31,27,22,0.6))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {addressLabel}
        </span>
        <span style={{ width: 42 }} />
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        dir={dir}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: String(aspect),
          overflow: 'hidden',
          background: posterFailed ? gradient : palette.ground,
          isolation: 'isolate',
        }}
      >
        {/* Poster layer */}
        {!posterFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt={label}
            loading="lazy"
            onError={() => setPosterFailed(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              opacity: live && loaded ? 0 : 1,
              transition: 'opacity 240ms ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 24,
              textAlign: 'center',
              opacity: live && loaded ? 0 : 1,
              transition: 'opacity 240ms ease',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-english)',
                fontWeight: 600,
                fontSize: 'clamp(20px, 3vw, 30px)',
                color: palette.ink,
              }}
            >
              {label}
            </span>
          </div>
        )}

        {/* Live iframe (scaled desktop) */}
        {interactive && live ? (
          <iframe
            src={liveHref}
            title={label}
            onLoad={() => setLoaded(true)}
            scrolling="no"
            style={
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: desktopWidth,
                height: scaledHeight,
                border: 0,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 320ms ease',
              } as CSSProperties
            }
          />
        ) : null}

        {/* Interact affordance */}
        {interactive && !live ? (
          <button
            type="button"
            onClick={() => setLive(true)}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={interactLabel}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                background: 'rgba(20,16,12,0.82)',
                color: '#F5EAD6',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(4px)',
              }}
            >
              ▶ {interactLabel}
            </span>
          </button>
        ) : null}

        {/* Loading shimmer */}
        {interactive && live && !loaded ? (
          <span
            style={{
              position: 'absolute',
              insetInlineStart: 14,
              bottom: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: palette.ink,
              opacity: 0.7,
            }}
          >
            {loadingLabel}
          </span>
        ) : null}
      </div>
    </figure>
  );
}

/** Rough hex → rgba; passes non-hex colors through unchanged. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace('#', '');
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 50/50 blend of two hex colors; falls back to `a` when parsing fails. */
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
