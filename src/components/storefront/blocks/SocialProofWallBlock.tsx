'use client';

import { useId } from 'react';
import type { SocialProofWallProps } from '@/lib/blocks/types';
import type { BlockRenderProps } from './BlockContext';

const DURATION: Record<NonNullable<SocialProofWallProps['speed']>, number> = {
  slow: 64,
  medium: 44,
  fast: 28,
};

/**
 * Social Proof Wall (Pro+). A seamless, hover-pausing marquee of customer
 * reviews. Bilingual (each review carries an Arabic pair) and fully
 * palette-driven via `--sf-*` vars — no external logo assets, no arbitrary
 * colours. Respects `prefers-reduced-motion` (marquee stops, reviews wrap).
 */
export function SocialProofWallBlock({ block, ctx }: BlockRenderProps<SocialProofWallProps>) {
  const p = block.props;
  const { isRtl } = ctx;
  const reviews = p.reviews ?? [];
  const uid = useId().replace(/[:]/g, '');
  const cls = `sq-spw-${uid}`;
  const duration = DURATION[p.speed ?? 'medium'];

  if (reviews.length === 0) return null;

  // Duplicate the set so the -50% translate loops seamlessly.
  const loop = [...reviews, ...reviews];

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 'clamp(20px, 3vw, 32px)' }}>
      {(p.eyebrow || p.title) && (
        <header style={{ display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center' }}>
          {p.eyebrow ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'color-mix(in srgb, var(--sf-ink) 60%, transparent)',
              }}
            >
              {p.eyebrow}
            </span>
          ) : null}
          {p.title ? (
            <h2
              style={{
                margin: 0,
                fontFamily: isRtl ? 'var(--font-arabic-serif)' : 'var(--font-serif, var(--font-sans))',
                fontWeight: 500,
                fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)',
                lineHeight: 1.1,
              }}
            >
              {p.title}
            </h2>
          ) : null}
        </header>
      )}

      <div
        className={`${cls}-mask`}
        style={{
          overflow: 'hidden',
          maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        <div className={`${cls}-track`}>
          {loop.map((r, i) => {
            const quote = (isRtl && r.quoteAr) || r.quote;
            const author = (isRtl && r.authorAr) || r.author;
            const role = (isRtl && r.roleAr) || r.role;
            return (
              <figure
                key={i}
                style={{
                  flex: '0 0 auto',
                  width: 'min(84vw, 340px)',
                  margin: 0,
                  padding: '20px 22px',
                  borderRadius: 16,
                  background: 'color-mix(in srgb, var(--sf-ground) 84%, var(--sf-ink) 4%)',
                  border: '1px solid color-mix(in srgb, var(--sf-ink) 12%, transparent)',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div aria-hidden style={{ display: 'flex', gap: 3, color: 'var(--sf-accent)', fontSize: 13 }}>
                  {'★★★★★'}
                </div>
                <blockquote
                  style={{
                    margin: 0,
                    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-sans)',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: 'color-mix(in srgb, var(--sf-ink) 88%, transparent)',
                  }}
                >
                  “{quote}”
                </blockquote>
                <figcaption style={{ display: 'grid', gap: 2 }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 600 }}>{author}</strong>
                  {role ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        color: 'color-mix(in srgb, var(--sf-ink) 55%, transparent)',
                      }}
                    >
                      {role}
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      <style>{`
        .${cls}-track {
          display: flex;
          gap: clamp(14px, 2vw, 22px);
          width: max-content;
          animation: ${cls}-scroll ${duration}s linear infinite;
          animation-direction: ${isRtl ? 'reverse' : 'normal'};
        }
        .${cls}-mask:hover .${cls}-track { animation-play-state: paused; }
        @keyframes ${cls}-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .${cls}-track { animation: none; flex-wrap: wrap; width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
