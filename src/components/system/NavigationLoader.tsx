'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';
import { findNavigableAnchor } from './navigationLinkSelector';
import { RouteSkeleton } from './RouteSkeleton';

/**
 * Global navigation loading overlay.
 *
 * Mounts once at the App Router root. While a same-origin client
 * navigation is in flight, portals a backdrop-blur overlay onto
 * `document.body` containing a `RouteSkeleton` for the destination URL,
 * so the user gets immediate "I'm going somewhere" feedback even if the
 * server is slow to render the next route.
 *
 * Behavior:
 *  - A capturing `click` listener on `document` notices internal Link/<a>
 *    clicks (filtered through `findNavigableAnchor`) and starts the loader
 *    with the target pathname.
 *  - Programmatic `router.push` callers can opt in via the
 *    `useNavigationLoader()` context — call `start(target)` before pushing.
 *  - `usePathname()` + `useSearchParams()` change → the navigation
 *    completed, hide the overlay.
 *  - Failsafes: 8s timeout auto-hides if a route hangs; Escape key hides
 *    so the user is never trapped.
 *  - Short minimum visible duration so fast client transitions still read
 *    as intentional feedback instead of a dead click.
 *  - Honors `prefers-reduced-motion` (still shows the wireframe, no
 *    shimmer) and is direction-agnostic (uses logical CSS properties
 *    throughout the skeleton tree).
 */

type LoaderContext = {
  start: (targetPathname: string) => void;
  stop: () => void;
};

const NavigationLoaderCtx = createContext<LoaderContext | null>(null);

export function useNavigationLoader(): LoaderContext {
  const ctx = useContext(NavigationLoaderCtx);
  // Outside the provider (server render or test), no-op so callers don't
  // have to special-case it.
  return ctx ?? { start: () => {}, stop: () => {} };
}

const MIN_VISIBLE_MS = 240;
const FAILSAFE_MS = 8_000;

/**
 * Allow-list of destinations that get the loading overlay.
 *
 * Core admin section changes can involve server work, so they should show
 * progress feedback. Same-page query changes are still filtered below so tab
 * switches and inline filters do not get a full-screen overlay.
 */
const LOADER_TARGET_PREFIXES = [
  '/account/orders',
  '/account/products',
  '/account/customers',
  '/account/inquiries',
  '/account/marketing',
  '/account/discounts',
  '/account/analytics',
  '/account/storage-library',
  '/account/builder',
  '/account/pos',
  '/account/apps',
  '/account/settings',
] as const;

const LOADER_EXCLUDED_PREFIXES = ['/account/souqna'] as const;

function shouldShowLoaderFor(currentPath: string, targetWithQuery: string): boolean {
  // Only same-origin navigations that originated from inside the admin shell.
  if (!currentPath.startsWith('/account')) return false;

  const targetPath = (targetWithQuery.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
  if (
    LOADER_EXCLUDED_PREFIXES.some(
      (prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }

  // Home (/account exactly).
  if (targetPath === '/account') return true;

  return LOADER_TARGET_PREFIXES.some(
    (prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`),
  );
}

export function NavigationLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <NavigationLoaderInner />;
}

function NavigationLoaderInner() {
  const [target, setTarget] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSinceRef = useRef<number | null>(null);
  // Tracks the (pathname, search) we were on when the navigation started.
  // We only auto-hide once the route key actually changes, so a same-path
  // click (which we already filter out, but defensive) wouldn't hang.
  const startSnapshotRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    const finish = () => {
      setTarget(null);
      setVisible(false);
      startSnapshotRef.current = null;
      visibleSinceRef.current = null;
      hideTimerRef.current = null;
    };

    if (!visible || visibleSinceRef.current == null) {
      finish();
      return;
    }

    const elapsed = Date.now() - visibleSinceRef.current;
    if (elapsed >= MIN_VISIBLE_MS) {
      finish();
      return;
    }

    hideTimerRef.current = setTimeout(finish, MIN_VISIBLE_MS - elapsed);
  }, [clearTimers, visible]);

  const start = useCallback(
    (targetPathname: string) => {
      // Gate: only show the overlay for the handful of admin destinations
      // the user actually wants progress feedback on. Every other click
      // (Orders, Products, marketing pages, sign-out, etc.) is a no-op.
      if (!shouldShowLoaderFor(window.location.pathname, targetPathname)) {
        return;
      }

      // Same-path query-param changes (e.g. tab switches inside an app
      // page) keep the user on the current screen — surface chrome is
      // already mounted, so painting a full-screen skeleton over it is
      // jarring. Inline `<Suspense>` boundaries on the destination handle
      // any per-section streaming. Compare bare pathnames so `?foo=bar`
      // toggles are ignored but real route segment changes still win.
      const targetBarePath = targetPathname.split('?')[0] ?? '';
      if (targetBarePath === window.location.pathname) {
        return;
      }

      // Re-entrant start — restart the failsafe but keep the existing
      // overlay so consecutive clicks don't flash.
      clearTimers();
      // Normalize the snapshot through URLSearchParams so it matches the
      // format produced by `searchParams.toString()` in the auto-hide
      // effect below (no leading "?"). Without this, URLs with query
      // strings would auto-hide the loader on the first effect tick.
      const normalizedSearch = new URLSearchParams(window.location.search).toString();
      startSnapshotRef.current = `${window.location.pathname}?${normalizedSearch}`;
      visibleSinceRef.current = Date.now();
      flushSync(() => {
        setTarget(targetPathname);
        setVisible(true);
      });
      failsafeTimerRef.current = setTimeout(() => {
        stop();
      }, FAILSAFE_MS);
    },
    [clearTimers, stop],
  );

  // Click interception. Capturing phase so we beat any stopPropagation
  // happening downstream (e.g. command palette consumes its own clicks
  // but still navigates with router.push).
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const result = findNavigableAnchor(event);
      if (!result) return;
      start(result.url.pathname + result.url.search);
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
    };
  }, [start]);

  // Auto-hide once the URL actually changes — that's our signal the
  // destination route mounted.
  useEffect(() => {
    if (target == null) return;
    const key = `${pathname ?? ''}?${searchParams?.toString() ?? ''}`;
    if (startSnapshotRef.current && key !== startSnapshotRef.current) {
      stop();
    }
  }, [pathname, searchParams, target, stop]);

  // Esc to bail.
  useEffect(() => {
    if (target == null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') stop();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, stop]);

  // Cleanup on unmount.
  useEffect(() => () => clearTimers(), [clearTimers]);

  const ctxValue = useMemo<LoaderContext>(
    () => ({ start, stop }),
    [start, stop],
  );

  // CRITICAL: SSR and CSR must produce the EXACT same JSX shape, or
  // React aborts hydration and re-renders the entire subtree. Mounted
  // at a layout level, that bailout discards the document shell — which
  // is how the previous version of this loader took the whole app down.
  //
  // The portal is the only branch that must be client-only (it touches
  // `document.body`), so we gate just the `createPortal(...)` call —
  // not the surrounding JSX. `<StyleTag />` is server-renderable so it
  // emits identical markup on both sides.
  const portal =
    typeof document !== 'undefined' && visible && target != null
      ? createPortal(<Overlay target={target} />, document.body)
      : null;

  return (
    <NavigationLoaderCtx.Provider value={ctxValue}>
      <StyleTag />
      {portal}
    </NavigationLoaderCtx.Provider>
  );
}

function Overlay({ target }: { target: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="souqna-skel-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483600,
        background: 'color-mix(in srgb, var(--surface-bg) 42%, transparent)',
        backdropFilter: 'blur(10px) saturate(0.96)',
        WebkitBackdropFilter: 'blur(10px) saturate(0.96)',
        overflow: 'hidden',
        animation: 'souqnaSkelVeilIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.58,
          pointerEvents: 'none',
          animation: 'souqnaSkelContentIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <RouteSkeleton pathname={target.split('?')[0] ?? '/'} />
      </div>
    </div>
  );
}

/**
 * Inline keyframes + bone styling. Co-located so nothing about the
 * loader needs to land in `globals.css`. Mounted once per
 * NavigationLoader instance — React de-dupes the inner `<style>` text
 * on rerender, and there's only one loader instance app-wide.
 */
function StyleTag() {
  return (
    <style>{`
      @keyframes souqnaSkelShimmer {
        0% { background-position: -180% 0; }
        100% { background-position: 220% 0; }
      }
      @keyframes souqnaSkelVeilIn {
        from {
          opacity: 0;
          backdrop-filter: blur(0) saturate(1);
          -webkit-backdrop-filter: blur(0) saturate(1);
        }
        to {
          opacity: 1;
          backdrop-filter: blur(10px) saturate(0.96);
          -webkit-backdrop-filter: blur(10px) saturate(0.96);
        }
      }
      @keyframes souqnaSkelContentIn {
        from { opacity: 0; transform: translateY(4px) scale(0.995); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes souqnaSkelSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes souqnaDashScreenCycle {
        0%, 28% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        35%, 100% {
          opacity: 0;
          transform: translateY(-10px) scale(0.992);
          filter: blur(2px);
        }
      }
      @keyframes souqnaDashNavFocus {
        0%, 29% { transform: translateY(0); }
        36%, 63% { transform: translateY(38px); }
        70%, 100% { transform: translateY(76px); }
      }
      @keyframes souqnaDashWash {
        0%, 8% {
          opacity: 0;
          transform: translateX(-115%);
        }
        18%, 72% {
          opacity: 0.72;
        }
        92%, 100% {
          opacity: 0;
          transform: translateX(120%);
        }
      }
      @keyframes souqnaDashCursor {
        0% {
          opacity: 0;
          transform: translate(26px, 62px);
        }
        10%, 86% { opacity: 1; }
        24% { transform: translate(34px, 136px); }
        38% { transform: translate(44px, 174px); }
        56% { transform: translate(55vw, 168px); }
        74% { transform: translate(62vw, 320px); }
        100% {
          opacity: 0;
          transform: translate(66vw, 380px);
        }
      }
      @keyframes souqnaDashCursorRtl {
        0% {
          opacity: 0;
          transform: translate(calc(100% - 26px), 62px);
        }
        10%, 86% { opacity: 1; }
        24% { transform: translate(calc(100% - 34px), 136px); }
        38% { transform: translate(calc(100% - 44px), 174px); }
        56% { transform: translate(18vw, 168px); }
        74% { transform: translate(12vw, 320px); }
        100% {
          opacity: 0;
          transform: translate(10vw, 380px);
        }
      }
      @keyframes souqnaDashBreathe {
        0%, 100% { opacity: 0.82; }
        50% { opacity: 0.54; }
      }
      .souqna-dash-loader {
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
        color: var(--ink-strong);
        background-image:
          linear-gradient(color-mix(in srgb, var(--ink-strong) 4%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--ink-strong) 4%, transparent) 1px, transparent 1px),
          linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 72%, transparent), var(--surface-bg));
        background-size: 24px 24px, 24px 24px, 100% 100%;
      }
      .souqna-dash-loader *,
      .souqna-dash-loader *::before,
      .souqna-dash-loader *::after {
        box-sizing: border-box;
      }
      .souqna-dash-loader-shell {
        --loader-accent: var(--admin-accent, var(--color-gold, #B89A52));
        position: relative;
        isolation: isolate;
        display: grid;
        grid-template-columns: minmax(150px, 0.28fr) minmax(0, 1fr);
        width: min(980px, 100%);
        height: min(560px, calc(100dvh - 36px));
        min-height: 420px;
        overflow: hidden;
        border: 1px solid var(--surface-rule-strong, var(--surface-rule));
        border-radius: 24px;
        background: color-mix(in srgb, var(--surface-elevated) 88%, var(--surface-bg));
        box-shadow:
          0 28px 90px color-mix(in srgb, var(--ink-strong) 16%, transparent),
          inset 0 1px 0 color-mix(in srgb, white 16%, transparent);
      }
      .souqna-dash-loader-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(120deg, transparent 0 42%, color-mix(in srgb, var(--loader-accent) 10%, transparent) 50%, transparent 58%),
          linear-gradient(180deg, color-mix(in srgb, white 8%, transparent), transparent 34%);
        opacity: 0.72;
        mix-blend-mode: soft-light;
      }
      .souqna-dash-loader-rail {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-width: 0;
        padding: 18px 14px;
        background: color-mix(in srgb, var(--surface-bg) 64%, var(--surface-elevated));
      }
      .souqna-dash-loader-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .souqna-dash-loader-logo {
        display: block;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        border: 1px solid color-mix(in srgb, var(--loader-accent) 38%, transparent);
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--loader-accent) 82%, var(--surface-bg)), color-mix(in srgb, var(--loader-accent) 24%, var(--surface-elevated))),
          var(--surface-elevated);
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 28%, transparent);
      }
      .souqna-dash-loader-wordmark,
      .souqna-dash-loader-nav-line,
      .souqna-dash-loader-rail-foot span,
      .souqna-dash-loader-search,
      .souqna-dash-loader-heading span,
      .souqna-dash-loader-card span,
      .souqna-dash-loader-table-row span,
      .souqna-dash-loader-metric span,
      .souqna-dash-loader-grid span {
        display: block;
        border-radius: 999px;
        background: color-mix(in srgb, var(--ink-strong) 12%, transparent);
      }
      .souqna-dash-loader-wordmark {
        width: 82px;
        height: 12px;
      }
      .souqna-dash-loader-nav {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .souqna-dash-loader-nav-focus {
        position: absolute;
        inset-inline: 0;
        top: 0;
        height: 30px;
        border-radius: 9px;
        border: 1px solid color-mix(in srgb, var(--loader-accent) 24%, transparent);
        background: color-mix(in srgb, var(--loader-accent) 12%, var(--surface-elevated));
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 18%, transparent);
        animation: souqnaDashNavFocus 7.2s cubic-bezier(0.42, 0, 0.18, 1) infinite;
      }
      .souqna-dash-loader-nav-row {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 30px;
        padding-inline: 9px;
      }
      .souqna-dash-loader-nav-icon {
        display: block;
        width: 12px;
        height: 12px;
        border-radius: 4px;
        border: 1.5px solid color-mix(in srgb, var(--ink-strong) 42%, transparent);
      }
      .souqna-dash-loader-nav-line {
        height: 7px;
      }
      .souqna-dash-loader-rail-foot {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-block-start: auto;
      }
      .souqna-dash-loader-rail-foot span:first-child {
        width: 54%;
        height: 8px;
      }
      .souqna-dash-loader-rail-foot span:last-child {
        width: 34px;
        height: 34px;
        border-radius: 999px;
      }
      .souqna-dash-loader-workspace {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-rows: 64px minmax(0, 1fr);
        min-width: 0;
        background: color-mix(in srgb, var(--surface-elevated) 70%, var(--surface-bg));
      }
      .souqna-dash-loader-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-width: 0;
        padding-inline: clamp(16px, 3vw, 26px);
        border-block-end: 1px solid var(--surface-rule);
      }
      .souqna-dash-loader-search {
        width: min(320px, 48%);
        height: 30px;
        border: 1px solid var(--surface-rule);
        background: color-mix(in srgb, var(--surface-bg) 72%, transparent);
      }
      .souqna-dash-loader-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .souqna-dash-loader-actions span {
        display: block;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid var(--surface-rule);
        background: color-mix(in srgb, var(--surface-bg) 58%, transparent);
      }
      .souqna-dash-loader-stage {
        position: relative;
        min-width: 0;
        overflow: hidden;
      }
      .souqna-dash-loader-screen {
        position: absolute;
        inset: clamp(20px, 4vw, 42px);
        display: flex;
        flex-direction: column;
        gap: 18px;
        opacity: 0;
        animation: souqnaDashScreenCycle 7.2s cubic-bezier(0.42, 0, 0.18, 1) infinite;
      }
      .souqna-dash-loader-screen.is-two { animation-delay: 2.4s; }
      .souqna-dash-loader-screen.is-three { animation-delay: 4.8s; }
      .souqna-dash-loader-heading {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .souqna-dash-loader-heading span:first-child {
        width: 22%;
        height: 9px;
        background: color-mix(in srgb, var(--loader-accent) 42%, transparent);
      }
      .souqna-dash-loader-heading span:last-child {
        width: min(360px, 54%);
        height: 24px;
        border-radius: 8px;
        background: color-mix(in srgb, var(--ink-strong) 18%, transparent);
      }
      .souqna-dash-loader-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: min(430px, 80%);
        padding: 20px;
        border: 1px solid var(--surface-rule);
        border-radius: 14px;
        background: color-mix(in srgb, var(--surface-bg) 52%, var(--surface-elevated));
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 12%, transparent);
      }
      .souqna-dash-loader-card.is-balance {
        min-height: 150px;
      }
      .souqna-dash-loader-mini-label {
        width: 34%;
        height: 8px;
      }
      .souqna-dash-loader-value {
        width: 46%;
        height: 32px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--ink-strong) 24%, transparent) !important;
      }
      .souqna-dash-loader-button {
        width: 104px;
        height: 26px;
        background: color-mix(in srgb, var(--loader-accent) 54%, var(--surface-bg)) !important;
      }
      .souqna-dash-loader-card.is-wide {
        width: min(560px, 100%);
        min-height: 98px;
        opacity: 0.74;
      }
      .souqna-dash-loader-card.is-wide span:nth-child(1) {
        width: 30%;
        height: 9px;
      }
      .souqna-dash-loader-card.is-wide span:nth-child(2) {
        width: 84%;
        height: 12px;
      }
      .souqna-dash-loader-card.is-wide span:nth-child(3) {
        width: 58%;
        height: 12px;
      }
      .souqna-dash-loader-table {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--surface-rule);
        border-radius: 14px;
        background: color-mix(in srgb, var(--surface-bg) 50%, var(--surface-elevated));
      }
      .souqna-dash-loader-table-row {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(70px, 0.6fr) minmax(80px, 0.6fr);
        gap: 18px;
        align-items: center;
        min-height: 48px;
        padding-inline: 18px;
        border-block-start: 1px solid var(--surface-rule);
      }
      .souqna-dash-loader-table-row:first-child {
        border-block-start: 0;
      }
      .souqna-dash-loader-table-row span {
        height: 9px;
        animation: souqnaDashBreathe 2.4s ease-in-out infinite;
      }
      .souqna-dash-loader-table-row span:nth-child(2) {
        animation-delay: 0.18s;
      }
      .souqna-dash-loader-table-row span:nth-child(3) {
        animation-delay: 0.32s;
      }
      .souqna-dash-loader-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }
      .souqna-dash-loader-metric {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 100px;
        padding: 16px;
        border: 1px solid var(--surface-rule);
        border-radius: 14px;
        background: color-mix(in srgb, var(--surface-bg) 54%, var(--surface-elevated));
      }
      .souqna-dash-loader-metric span:first-child {
        width: 54%;
        height: 9px;
      }
      .souqna-dash-loader-metric span:last-child {
        width: 74%;
        height: 28px;
        border-radius: 9px;
        background: color-mix(in srgb, var(--loader-accent) 24%, transparent);
      }
      .souqna-dash-loader-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-block-start: 2px;
      }
      .souqna-dash-loader-grid span {
        height: 128px;
        border-radius: 14px;
        border: 1px solid var(--surface-rule);
        background:
          linear-gradient(180deg, color-mix(in srgb, var(--loader-accent) 18%, transparent), transparent 52%),
          color-mix(in srgb, var(--surface-bg) 56%, var(--surface-elevated));
      }
      .souqna-dash-loader-wash {
        position: absolute;
        inset-block: 0;
        width: 42%;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, color-mix(in srgb, white 52%, transparent), transparent);
        opacity: 0;
        filter: blur(10px);
        animation: souqnaDashWash 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
      }
      .souqna-dash-loader-cursor {
        position: absolute;
        top: 0;
        inset-inline-start: 0;
        width: 13px;
        height: 13px;
        border-radius: 999px;
        border: 2px solid color-mix(in srgb, var(--loader-accent) 74%, var(--ink-strong));
        background: var(--surface-elevated);
        box-shadow:
          0 0 0 6px color-mix(in srgb, var(--loader-accent) 14%, transparent),
          0 8px 24px color-mix(in srgb, var(--ink-strong) 18%, transparent);
        animation: souqnaDashCursor 7.2s cubic-bezier(0.42, 0, 0.18, 1) infinite;
      }
      [dir='rtl'] .souqna-dash-loader-cursor {
        animation-name: souqnaDashCursorRtl;
      }
      .souqna-skel-bone {
        background: color-mix(in srgb, var(--surface-rule) 42%, transparent);
        background-image: linear-gradient(
          90deg,
          color-mix(in srgb, var(--surface-rule) 38%, transparent) 0%,
          color-mix(in srgb, var(--ink-strong) 8%, transparent) 46%,
          color-mix(in srgb, var(--surface-rule) 38%, transparent) 100%
        );
        background-size: 200% 100%;
        background-repeat: no-repeat;
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ink-strong) 3%, transparent);
        animation: souqnaSkelShimmer 2.35s ease-in-out infinite;
      }
      .souqna-skel-spinner {
        animation: souqnaSkelSpin 1.35s linear infinite;
      }
      [dir='rtl'] .souqna-skel-bone {
        animation-direction: reverse;
      }
      [dir='rtl'] .souqna-dash-loader-wash {
        animation-direction: reverse;
      }
      @media (max-width: 760px) {
        .souqna-dash-loader {
          padding: 14px;
        }
        .souqna-dash-loader-shell {
          grid-template-columns: minmax(0, 1fr);
          height: min(520px, calc(100dvh - 28px));
          min-height: 390px;
          border-radius: 20px;
        }
        .souqna-dash-loader-rail {
          display: none;
        }
        .souqna-dash-loader-topbar {
          min-height: 58px;
        }
        .souqna-dash-loader-screen {
          inset: 18px;
        }
        .souqna-dash-loader-card,
        .souqna-dash-loader-card.is-wide {
          width: 100%;
        }
        .souqna-dash-loader-metrics {
          grid-template-columns: 1fr;
        }
        .souqna-dash-loader-metric {
          min-height: 72px;
        }
        .souqna-dash-loader-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .souqna-dash-loader-grid span {
          height: 92px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .souqna-skel-bone,
        .souqna-skel-spinner,
        .souqna-dash-loader-nav-focus,
        .souqna-dash-loader-screen,
        .souqna-dash-loader-table-row span {
          animation: none;
        }
        .souqna-dash-loader-screen {
          opacity: 0;
          transform: none;
          filter: none;
        }
        .souqna-dash-loader-screen.is-one {
          opacity: 1;
        }
        .souqna-dash-loader-wash,
        .souqna-dash-loader-cursor {
          display: none;
        }
        .souqna-skel-overlay {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
      }
    `}</style>
  );
}
