'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { setProEditorModeAction } from '@/app/actions/pro';
import type { Locale } from '@/i18n/locales';

type Props = {
  locale: Locale;
  slug: string;
  activeMode: 'easy' | 'pro';
  eligible: boolean;
  hasWorkspace: boolean;
  onBeforeSwitch?: () => Promise<void> | void;
};

export function ProModeSwitch({
  locale,
  slug,
  activeMode,
  eligible,
  hasWorkspace,
  onBeforeSwitch,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [pendingMode, setPendingMode] = React.useState<'easy' | 'pro' | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const navigationFallback = React.useRef<number | null>(null);
  const isArabic = locale === 'ar';

  React.useEffect(
    () => () => {
      if (navigationFallback.current != null) window.clearTimeout(navigationFallback.current);
    },
    [],
  );

  async function select(mode: 'easy' | 'pro') {
    if (pending || mode === activeMode) return;
    setPending(true);
    setPendingMode(mode);
    setErrorMessage(null);
    let navigationStarted = false;
    const navigate = (href: string) => {
      router.push(href);
      navigationStarted = true;
      navigationFallback.current = window.setTimeout(() => {
        window.location.assign(href);
      }, 1_600);
    };
    try {
      await onBeforeSwitch?.();
      if (mode === 'pro' && !eligible) {
        navigate('/account/settings/plan');
        return;
      }
      if (mode === 'pro' && !hasWorkspace) {
        navigate(`/account/pro?store=${encodeURIComponent(slug)}`);
        return;
      }
      const result = await setProEditorModeAction({ slug, mode });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      navigate(
        mode === 'easy'
          ? `/account/builder?store=${encodeURIComponent(slug)}&easy=1`
          : `/account/builder?store=${encodeURIComponent(slug)}`,
      );
      router.refresh();
    } catch {
      setErrorMessage(
        isArabic ? 'تعذر فتح وضع برو. حاول مرة أخرى.' : 'Pro could not open. Please try again.',
      );
    } finally {
      if (!navigationStarted) {
        setPending(false);
        setPendingMode(null);
      }
    }
  }

  return (
    <div
      className="souqna-pro-mode-switch"
      role="group"
      aria-label={isArabic ? 'وضع المحرر' : 'Editor mode'}
      aria-busy={pending}
    >
      <button
        type="button"
        data-active={activeMode === 'easy' ? '' : undefined}
        aria-pressed={activeMode === 'easy'}
        disabled={pending}
        onClick={() => void select('easy')}
      >
        {pendingMode === 'easy' ? <LoaderCircle aria-hidden /> : null}
        {isArabic ? 'سهل' : 'Easy'}
      </button>
      <button
        type="button"
        data-active={activeMode === 'pro' ? '' : undefined}
        aria-pressed={activeMode === 'pro'}
        disabled={pending}
        onClick={() => void select('pro')}
      >
        {pendingMode === 'pro' ? <LoaderCircle aria-hidden /> : null}
        Pro
        {!eligible ? <span aria-hidden>+</span> : null}
      </button>
      {errorMessage ? (
        <span className="souqna-pro-mode-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
      <style jsx>{`
        .souqna-pro-mode-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border: 1px solid var(--bld-divider, rgba(232, 220, 196, 0.18));
          border-radius: 999px;
          background: var(--bld-tile-bg, rgba(255, 255, 255, 0.05));
          flex: 0 0 auto;
        }
        button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 24px;
          padding: 0 9px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: var(--bld-text-muted, #9d9487);
          font: 600 10px/1 var(--font-mono, monospace);
          letter-spacing: 0.04em;
          cursor: pointer;
        }
        button[data-active] {
          background: var(--bld-accent, #d4b06a);
          color: var(--bld-accent-ink, #161310);
        }
        button:focus-visible {
          outline: 2px solid var(--bld-accent, #d4b06a);
          outline-offset: 2px;
        }
        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }
        span {
          margin-inline-start: 1px;
        }
        button svg {
          width: 11px;
          height: 11px;
          animation: souqna-pro-mode-spin 900ms linear infinite;
        }
        .souqna-pro-mode-error {
          position: absolute;
          inset-block-start: calc(100% + 8px);
          inset-inline-end: 0;
          z-index: 80;
          width: max-content;
          max-width: min(280px, calc(100vw - 24px));
          margin: 0;
          padding: 8px 10px;
          border: 1px solid rgba(203, 114, 104, 0.38);
          border-radius: 8px;
          background: #17110f;
          color: #e3aaa3;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.36);
          font: 600 10px/1.45 var(--font-sans, sans-serif);
          letter-spacing: 0;
        }
        @keyframes souqna-pro-mode-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 680px) {
          button {
            padding-inline: 7px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          button svg {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
