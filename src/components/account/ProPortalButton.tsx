'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { Locale } from '@/i18n/locales';

const PRO_HREF = '/account/pro';
const HARD_NAVIGATION_FALLBACK_MS = 1_600;

/**
 * Pro is a fixed identity — charcoal + sand-gold — in light and dark
 * admin themes alike, so the capsule and veil use literal colors, not
 * dashboard tokens (which invert in dark mode and turned the veil
 * cream on first ship).
 */
const INK = '#161310';
const CREAM = '#f2e9d8';
const GOLD = '#d4b06a';

const LABELS: Record<Locale, { label: string; opening: string; aria: string }> = {
  en: {
    label: 'Enter Pro',
    opening: 'Opening Pro',
    aria: 'Souqna Pro, enter the Pro workspace',
  },
  ar: { label: 'ادخل برو', opening: 'جارٍ فتح برو', aria: 'سوقنا برو، ادخل مساحة برو' },
};

/**
 * Topbar entry to the Pro workspace. Navigation starts immediately and keeps
 * the dashboard visible while the route resolves. A hard-navigation fallback
 * handles interrupted App Router transitions without trapping the merchant in
 * a decorative full-screen layer.
 */
export function ProPortalButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = LABELS[locale];
  const [pending, setPending] = React.useState(false);
  const navigationFallback = React.useRef<number | null>(null);

  const clearFallback = React.useCallback(() => {
    if (navigationFallback.current != null) {
      window.clearTimeout(navigationFallback.current);
      navigationFallback.current = null;
    }
  }, []);

  React.useEffect(() => {
    router.prefetch(PRO_HREF);
  }, [router]);

  React.useEffect(() => clearFallback, [clearFallback]);

  React.useEffect(() => {
    clearFallback();
    setPending(false);
  }, [clearFallback, pathname]);

  const launch = () => {
    if (pending) return;
    setPending(true);
    try {
      router.push(PRO_HREF);
    } catch {
      window.location.assign(PRO_HREF);
    }
    navigationFallback.current = window.setTimeout(() => {
      window.location.assign(PRO_HREF);
    }, HARD_NAVIGATION_FALLBACK_MS);
  };

  return (
    <>
      <button
        type="button"
        className="souqna-pro-capsule inline-flex"
        onClick={launch}
        aria-label={t.aria}
        aria-busy={pending}
        disabled={pending}
      >
        <span className="souqna-pro-capsule-mark" aria-hidden>
          {pending ? <LoaderCircle /> : '✦'}
        </span>
        <span className="souqna-pro-capsule-copy">
          <span className="souqna-pro-capsule-kicker" dir="ltr">
            Souqna
          </span>
          <span className="souqna-pro-capsule-label">{pending ? t.opening : t.label}</span>
        </span>
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden style={{ color: GOLD }} />
      </button>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .souqna-pro-capsule {
          position: relative;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 5px 13px 5px 9px;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid color-mix(in srgb, ${GOLD} 46%, transparent);
          border-radius: 999px;
          background:
            radial-gradient(circle at 19px 50%, color-mix(in srgb, ${GOLD} 26%, transparent), transparent 32px),
            rgba(12, 11, 9, 0.86);
          color: ${CREAM};
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, ${CREAM} 14%, transparent),
            0 0 0 1px color-mix(in srgb, ${GOLD} 10%, transparent),
            0 14px 30px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          cursor: pointer;
          backdrop-filter: blur(20px) saturate(1.08);
          -webkit-backdrop-filter: blur(20px) saturate(1.08);
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }

        .souqna-pro-capsule:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, ${GOLD} 72%, transparent);
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, ${CREAM} 18%, transparent),
            0 0 0 1px color-mix(in srgb, ${GOLD} 22%, transparent),
            0 16px 34px rgba(0, 0, 0, 0.26);
        }

        .souqna-pro-capsule:disabled {
          cursor: wait;
          transform: none;
        }

        .souqna-pro-capsule:focus-visible {
          outline: 2px solid ${GOLD};
          outline-offset: 2px;
        }

        .souqna-pro-capsule::after {
          content: '';
          position: absolute;
          inset: -55% -24%;
          z-index: -1;
          background: linear-gradient(
            105deg,
            transparent 34%,
            color-mix(in srgb, ${GOLD} 30%, transparent) 48%,
            transparent 62%
          );
          transform: translateX(-130%) rotate(8deg);
          transition: transform 700ms ease;
          pointer-events: none;
        }

        .souqna-pro-capsule:hover::after {
          transform: translateX(130%) rotate(8deg);
        }

        .souqna-pro-capsule-mark {
          position: relative;
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 999px;
          background:
            radial-gradient(circle, color-mix(in srgb, ${CREAM} 26%, transparent) 0.6px, transparent 0.8px),
            ${INK};
          background-size: 5px 5px, auto;
          color: ${GOLD};
          font-size: 13px;
          line-height: 1;
          box-shadow: 0 0 16px color-mix(in srgb, ${GOLD} 32%, transparent);
        }

        .souqna-pro-capsule-mark::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: inherit;
          border: 1px solid color-mix(in srgb, ${GOLD} 26%, transparent);
          animation: souqna-pro-capsule-ripple 3.8s ease-in-out infinite;
        }

        .souqna-pro-capsule-mark > svg {
          width: 14px;
          height: 14px;
          animation: souqna-pro-capsule-spin 900ms linear infinite;
        }

        @keyframes souqna-pro-capsule-ripple {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.14); opacity: 0.35; }
        }

        @keyframes souqna-pro-capsule-spin {
          to { transform: rotate(360deg); }
        }

        .souqna-pro-capsule-copy {
          display: grid;
          min-width: 0;
          gap: 2px;
          text-align: start;
        }

        @media (max-width: 639px) {
          .souqna-pro-capsule {
            min-height: 36px;
            padding: 3px;
          }

          .souqna-pro-capsule-copy,
          .souqna-pro-capsule > svg {
            display: none;
          }

          .souqna-pro-capsule-mark {
            width: 28px;
            height: 28px;
          }
        }

        .souqna-pro-capsule-kicker {
          color: color-mix(in srgb, ${GOLD} 80%, ${CREAM});
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.16em;
          line-height: 1;
          text-transform: uppercase;
        }

        .souqna-pro-capsule-label {
          font-size: 12px;
          font-weight: 750;
          line-height: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .souqna-pro-capsule-mark::after { animation: none; }
          .souqna-pro-capsule-mark > svg { animation: none; }
          .souqna-pro-capsule::after { display: none; }
        }
      `,
        }}
      />
    </>
  );
}
