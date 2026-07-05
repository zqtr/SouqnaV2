'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import { Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useStorefronts } from './StorefrontContext';
import { SearchGlyph, ExternalGlyph } from './glyphs';
import { NotificationsBell } from './NotificationsBell';
import { PLAN_LIMITS, planUnlocksSouqy } from '@/lib/plans';
import { SouqyChatDrawer } from './SouqyChatDrawer';
import { SouqyLogo } from './SouqyLogo';
import { adminText } from './adminLocale';
import { AccountUpdatesModal } from '@/components/account/updates/AccountUpdatesModal';
import type { AccountUpdateView } from '@/components/account/updates/types';
import type { Locale } from '@/i18n/locales';

type SearchResult = {
  type: 'product' | 'order' | 'customer';
  id: string | number;
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse = {
  products: SearchResult[];
  orders: SearchResult[];
  customers: SearchResult[];
};

const EMPTY_RESULTS: SearchResponse = {
  products: [],
  orders: [],
  customers: [],
};

type AdminTopBarProps = {
  initialSouqyOpen?: boolean;
  accountUpdates?: AccountUpdateView[];
};

export function AdminTopBar({ initialSouqyOpen = false, accountUpdates = [] }: AdminTopBarProps) {
  const { active, plan, planPeriodEnd } = useStorefronts();
  const locale = useLocale() as Locale;
  const t = adminText(locale);
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(initialSouqyOpen);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updates, setUpdates] = useState(accountUpdates);
  const [focusedUpdateId, setFocusedUpdateId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [searching, setSearching] = useState(false);
  const autoOpenedUpdatesRef = useRef(false);
  const souqyPortalHref = active ? (locale === 'ar' ? '/ar/begin/souqy' : '/begin/souqy') : null;
  const canUseSouqy = planUnlocksSouqy(plan);
  const deploymentCommentUpdate = updates.find(
    (update) => !update.readAt && isDeploymentCommentUpdate(update),
  );
  const unreadDeploymentCommentUpdates = updates.filter(
    (update) => !update.readAt && isDeploymentCommentUpdate(update),
  ).length;

  useEffect(() => {
    setUpdates(accountUpdates);
  }, [accountUpdates]);

  useEffect(() => {
    if (autoOpenedUpdatesRef.current || !deploymentCommentUpdate) return;
    autoOpenedUpdatesRef.current = true;
    setFocusedUpdateId(deploymentCommentUpdate.id);
    setUpdatesOpen(true);
  }, [deploymentCommentUpdate]);

  useEffect(() => {
    if (canUseSouqy && window.location.search.includes('souqy=1')) {
      setAssistantOpen(true);
    }
  }, [canUseSouqy]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({ q: trimmed });
      if (active?.slug) params.set('store', active.slug);
      fetch(`/api/admin/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: SearchResponse | null) => {
          if (!body) return;
          setResults({
            products: Array.isArray(body.products) ? body.products : [],
            orders: Array.isArray(body.orders) ? body.orders : [],
            customers: Array.isArray(body.customers) ? body.customers : [],
          });
        })
        .catch((err) => {
          if ((err as Error).name !== 'AbortError') {
            setResults(EMPTY_RESULTS);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [active?.slug, query]);

  const openResult = (href: string) => {
    setCommandOpen(false);
    setQuery('');
    router.push(href);
  };

  const markUpdateRead = useCallback((updateId: string) => {
    const readAt = new Date().toISOString();
    setUpdates((value) =>
      value.map((update) => (update.id === updateId ? { ...update, readAt } : update)),
    );
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: topBarPortalStyles }} />
      <header
        className="souqna-admin-topbar sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-border px-3 backdrop-blur-xl"
        style={{
          background: 'color-mix(in srgb, var(--surface-bg) 92%, transparent)',
        }}
      >
        <SidebarTrigger className="shrink-0 border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground" />

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="souqna-admin-search-trigger flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground md:max-w-xl"
          dir="ltr"
        >
          <SearchGlyph size={15} />
          <span className="min-w-0 flex-1 truncate">{t.searchPlaceholder}</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
            Ctrl K
          </kbd>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setFocusedUpdateId(null);
            setUpdatesOpen(true);
          }}
          aria-label={`${locale === 'ar' ? 'التحديثات' : 'Updates'}${unreadDeploymentCommentUpdates > 0 ? ` (${unreadDeploymentCommentUpdates})` : ''}`}
          title={locale === 'ar' ? 'التحديثات' : 'Updates'}
          className="relative h-9 w-9 shrink-0 rounded-md border border-border bg-background/60 text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <Newspaper className="size-4" aria-hidden />
          {unreadDeploymentCommentUpdates > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1 font-mono text-[10px] font-bold leading-4 text-[var(--surface-bg)] shadow-[0_0_0_2px_var(--surface-bg)]">
              {unreadDeploymentCommentUpdates > 9 ? '9+' : unreadDeploymentCommentUpdates}
            </span>
          ) : null}
        </Button>

        <div className="flex flex-1 items-center justify-end gap-2">
          {souqyPortalHref ? (
            <Link
              href={souqyPortalHref}
              className="souqy-portal-link hidden sm:inline-flex"
              aria-label={`${t.viewStore}: ${active?.businessName ?? active?.slug}`}
            >
              <span className="souqy-portal-link-mark" aria-hidden>
                <SouqyLogo size={30} className="souqy-portal-link-logo" />
              </span>
              <span className="souqy-portal-link-copy">
                <span className="souqy-portal-link-kicker">Souqy</span>
                <span className="souqy-portal-link-label">{t.viewStore}</span>
              </span>
              <span className="souqy-portal-link-arrow" aria-hidden>
                <ExternalGlyph size={13} />
              </span>
            </Link>
          ) : null}

          <NotificationsBell />
          <PlanBadge plan={plan} periodEnd={planPeriodEnd} />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title={t.searchTitle}
        description={t.searchDescription}
        className="border-border bg-popover text-popover-foreground"
      >
        <div
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className={locale === 'ar' ? 'text-right' : 'text-left'}
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t.searchInputPlaceholder}
          />
          <CommandList>
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {t.searching}
              </div>
            ) : null}
            <CommandEmpty>{query.trim().length < 2 ? t.typeTwo : t.noMatches}</CommandEmpty>
            <SearchGroup label={t.products} items={results.products} onSelect={openResult} />
            <SearchGroup label={t.orders} items={results.orders} onSelect={openResult} />
            <SearchGroup label={t.customers} items={results.customers} onSelect={openResult} />
          </CommandList>
        </div>
      </CommandDialog>

      <AccountUpdatesModal
        initialUpdates={updates}
        locale={locale}
        open={updatesOpen}
        onOpenChange={(open) => {
          setUpdatesOpen(open);
          if (!open) setFocusedUpdateId(null);
        }}
        onUpdateRead={markUpdateRead}
        focusUpdateId={focusedUpdateId}
        autoOpen={false}
      />

      {canUseSouqy ? (
        <SouqyFloatingTrigger hidden={assistantOpen} onOpen={() => setAssistantOpen(true)} />
      ) : null}

      {canUseSouqy ? (
        <SouqyChatDrawer
          open={assistantOpen}
          storefront={active}
          onClose={() => setAssistantOpen(false)}
        />
      ) : null}
    </>
  );
}

function isDeploymentCommentUpdate(update: AccountUpdateView): boolean {
  return update.previewPayload?.kind === 'souqna-update';
}

function SouqyFloatingTrigger({ hidden, onOpen }: { hidden: boolean; onOpen: () => void }) {
  const dockRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, x: 0, y: 0, moved: false });
  const [dismissed, setDismissed] = useState(false);

  const endDrag = useCallback((pointerId: number | undefined, releaseX: number) => {
    const dock = dockRef.current;
    if (!dock || !drag.current.active) return;
    drag.current.active = false;
    if (pointerId != null) {
      try {
        dock.releasePointerCapture(pointerId);
      } catch {
        /* pointer already released */
      }
    }
    dock.style.cursor = '';
    dock.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease';
    // Hide when flung to the far right: a rightward drag that ends near the right edge.
    const nearRightEdge = releaseX >= window.innerWidth - 40;
    if (drag.current.x > 12 && (nearRightEdge || drag.current.x > 90)) {
      // Slide off the right edge, then remove it.
      dock.style.transform = `translate(${window.innerWidth}px, ${drag.current.y}px)`;
      dock.style.opacity = '0';
      window.setTimeout(() => setDismissed(true), 260);
    } else {
      // Snap back to the corner.
      dock.style.transform = 'translate(0px, 0px)';
      dock.style.opacity = '1';
      drag.current.x = 0;
      drag.current.y = 0;
    }
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const dock = dockRef.current;
    if (!dock) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      moved: false,
    };
    try {
      dock.setPointerCapture(event.pointerId);
    } catch {
      /* capture unsupported */
    }
    dock.style.transition = 'none';
    dock.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const dock = dockRef.current;
    if (!dock) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    drag.current.x = dx;
    drag.current.y = dy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    dock.style.transform = `translate(${dx}px, ${dy}px) scale(${drag.current.moved ? 1.04 : 1})`;
    // Fade as the pointer nears the right edge (the fling-to-hide zone).
    const edgeDist = window.innerWidth - event.clientX;
    dock.style.opacity = dx > 8 && edgeDist < 90 ? String(Math.max(0.2, edgeDist / 90)) : '1';
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) =>
    endDrag(event.pointerId, event.clientX);

  if (dismissed) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: souqyLauncherStyles }} />
      <div
        ref={dockRef}
        className="souqy-launcher-dock"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          onClick={() => {
            if (drag.current.moved) return;
            onOpen();
          }}
          aria-label="Open assistant chat"
          title="Drag to move. Fling right to hide. Click to open."
          className={`souqy-launcher${hidden ? ' is-hidden' : ''}`}
        >
          <span className="souqy-launcher-handle" aria-hidden>
            <SouqyLogo size={54} className="souqy-launcher-logo" />
          </span>
        </button>
      </div>
    </>
  );
}

const topBarPortalStyles = `
.souqy-portal-link {
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 42px;
  padding: 5px 8px 5px 9px;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid color-mix(in srgb, var(--admin-accent) 42%, transparent);
  border-radius: 999px;
  color: var(--dash-panel-strong, var(--surface-overlay));
  background:
    radial-gradient(circle at 19px 50%, color-mix(in srgb, var(--admin-accent) 28%, transparent), transparent 34px),
    linear-gradient(105deg, color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 10%, transparent), color-mix(in srgb, var(--admin-accent) 10%, transparent)),
    rgba(10, 10, 9, 0.84);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 16%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--admin-accent) 10%, transparent),
    0 0 0 1px color-mix(in srgb, var(--admin-accent) 8%, transparent),
    0 14px 30px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(20px) saturate(1.08);
  -webkit-backdrop-filter: blur(20px) saturate(1.08);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.souqy-portal-link::before {
  content: '';
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: inherit;
  background:
    radial-gradient(circle at 29px 50%, color-mix(in srgb, var(--admin-accent) 20%, transparent), transparent 38px),
    linear-gradient(180deg, color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 8%, transparent), transparent 54%, rgba(0, 0, 0, 0.12));
  opacity: 1;
  pointer-events: none;
}

.souqy-portal-link::after {
  content: '';
  position: absolute;
  inset: -55% -24%;
  z-index: -2;
  background:
    linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--admin-accent) 36%, transparent) 46%, transparent 62%),
    radial-gradient(circle at 22% 52%, color-mix(in srgb, var(--admin-accent) 20%, transparent), transparent 20%);
  transform: translateX(-48%) rotate(8deg);
  opacity: 0;
  animation: souqy-portal-sweep 6.2s ease-in-out infinite;
  pointer-events: none;
}

.souqy-portal-link-mark {
  position: relative;
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  box-shadow: 0 0 18px color-mix(in srgb, var(--admin-accent) 30%, transparent);
}

.souqy-portal-link-mark::after {
  content: '';
  position: absolute;
  inset: -4px;
  z-index: -1;
  border-radius: inherit;
  border: 1px solid color-mix(in srgb, var(--admin-accent) 22%, transparent);
  animation: souqy-portal-ripple 3.8s ease-in-out infinite;
}

.souqy-portal-link-logo {
  width: 30px;
  height: 30px;
}

.souqy-portal-link-logo.souqy-logo::before {
  inset: -1px;
}

.souqy-portal-link-logo.souqy-logo::after {
  inset: -8px;
  opacity: 0.42;
}

.souqy-portal-link-logo .souqy-logo-core {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 12%, transparent),
    inset 0 0 15px rgba(0, 0, 0, 0.68),
    0 8px 20px rgba(0, 0, 0, 0.22);
}

.souqy-portal-link-copy {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 0;
  gap: 2px;
}

.souqy-portal-link-kicker {
  color: color-mix(in srgb, var(--admin-accent) 72%, var(--dash-panel-strong, var(--surface-overlay)));
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
}

.souqy-portal-link-label,
.souqy-portal-link-arrow {
  position: relative;
  z-index: 1;
}

.souqy-portal-link-label {
  font-size: 12px;
  letter-spacing: 0;
}

.souqy-portal-link-arrow {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--admin-accent) 24%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--admin-accent) 8%, transparent);
  color: color-mix(in srgb, var(--admin-accent) 72%, var(--dash-panel-strong, var(--surface-overlay)));
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.souqy-portal-link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--admin-accent) 68%, transparent);
  color: var(--dash-panel-strong, var(--surface-overlay));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 20%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--admin-accent) 18%, transparent),
    0 0 0 1px color-mix(in srgb, var(--admin-accent) 14%, transparent),
    0 16px 34px rgba(0, 0, 0, 0.24);
}

.souqy-portal-link:hover .souqy-portal-link-arrow {
  border-color: color-mix(in srgb, var(--admin-accent) 42%, transparent);
  background: color-mix(in srgb, var(--admin-accent) 14%, transparent);
  color: var(--dash-panel-strong, var(--surface-overlay));
  transform: translateX(1px);
}

.souqy-portal-link:active {
  transform: translateY(0);
}

.souqy-portal-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--admin-accent) 72%, var(--dash-panel-strong, var(--surface-overlay)));
  outline-offset: 3px;
}

[data-theme='dark'] .souqy-portal-link {
  border-color: color-mix(in srgb, var(--admin-accent) 40%, transparent);
  color: var(--dash-panel-strong, var(--surface-overlay));
  background:
    radial-gradient(circle at 19px 50%, color-mix(in srgb, var(--admin-accent) 24%, transparent), transparent 34px),
    linear-gradient(105deg, color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 10%, transparent), color-mix(in srgb, var(--admin-accent) 10%, transparent)),
    rgba(8, 8, 7, 0.8);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--dash-panel-strong, var(--surface-overlay)) 16%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--admin-accent) 12%, transparent),
    0 12px 30px rgba(0, 0, 0, 0.24);
}

@keyframes souqy-portal-sweep {
  0%, 28% { transform: translateX(-48%) rotate(8deg); opacity: 0; }
  46% { opacity: 0.7; }
  70%, 100% { transform: translateX(48%) rotate(8deg); opacity: 0; }
}

@keyframes souqy-portal-ripple {
  0%, 100% { transform: scale(0.95); opacity: 0.28; }
  50% { transform: scale(1.12); opacity: 0.72; }
}

@media (prefers-reduced-motion: reduce) {
  .souqy-portal-link,
  .souqy-portal-link::after,
  .souqy-portal-link-mark::after {
    animation: none !important;
  }
}
`;

const souqyLauncherStyles = `
.souqy-launcher-dock {
  position: fixed;
  right: 18px;
  bottom: calc(22px + env(safe-area-inset-bottom));
  z-index: 70;
  touch-action: none;
  cursor: grab;
  will-change: transform;
}

.souqy-launcher-dock:active {
  cursor: grabbing;
}

.souqy-launcher {
  position: relative;
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  color: var(--foreground);
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  isolation: isolate;
  overflow: visible;
  transform: translateY(0) scale(1);
  opacity: 1;
  transition: transform 180ms ease, opacity 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  animation: souqy-launcher-settle 4.6s ease-in-out infinite;
}

.souqy-launcher::before {
  content: '';
  position: absolute;
  inset: 4px;
  z-index: -1;
  border: 1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent);
  border-radius: 999px;
  opacity: 0.42;
  transform: scale(1);
  transition: opacity 180ms ease, transform 180ms ease;
}

.souqy-launcher::after {
  content: '';
  position: absolute;
  inset: 8px;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(circle, color-mix(in srgb, var(--admin-accent) 20%, transparent), transparent 70%);
  opacity: 0.7;
  transition: opacity 180ms ease;
  pointer-events: none;
}

.souqy-launcher:hover {
  transform: translateY(-2px);
}

.souqy-launcher:hover::before {
  opacity: 1;
  transform: scale(1.02);
}

.souqy-launcher:hover::after {
  opacity: 1;
}

.souqy-launcher:active {
  transform: translateY(-1px) scale(0.99);
}

.souqy-launcher:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--admin-accent) 70%, var(--dash-panel-strong, var(--surface-overlay)));
  outline-offset: 4px;
}

.souqy-launcher.is-hidden {
  pointer-events: none;
  transform: translateY(12px) scale(0.96);
  opacity: 0;
}

.souqy-launcher-handle {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
  animation: souqy-launcher-mark 3.4s ease-in-out infinite;
}

.souqy-launcher-handle::after {
  display: none;
}

.souqy-launcher-logo {
  position: relative;
  width: 54px;
  height: 54px;
}

[data-theme='dark'] .souqy-launcher {
  background: transparent;
  box-shadow: none;
}

@keyframes souqy-launcher-settle {
  0%, 100% { transform: translateY(0); }
  46% { transform: translateY(0); }
  52% { transform: translateY(-2px); }
  58% { transform: translateY(0); }
}

@keyframes souqy-launcher-mark {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}

@keyframes souqy-launcher-orbit {
  0%, 100% { opacity: 0.42; transform: scale(1); }
  50% { opacity: 0.78; transform: scale(1.06); }
}

@media (max-width: 640px) {
  .souqy-launcher {
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    width: 58px;
    height: 58px;
  }

  .souqy-launcher-handle,
  .souqy-launcher-logo {
    width: 50px;
    height: 50px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .souqy-launcher,
  .souqy-launcher-handle,
  .souqy-launcher-handle::after {
    animation: none !important;
  }
}
`;

function SearchGroup({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: SearchResult[];
  onSelect: (href: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <CommandGroup heading={label}>
      {items.map((item) => (
        <CommandItem
          key={`${item.type}-${item.id}`}
          value={`${item.type} ${item.title} ${item.subtitle}`}
          onSelect={() => onSelect(item.href)}
          className="items-start"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{item.title}</span>
            <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function PlanBadge({
  plan,
  periodEnd,
}: {
  plan: keyof typeof PLAN_LIMITS;
  periodEnd: string | null;
}) {
  const locale = useLocale();
  const label =
    locale === 'ar'
      ? ((
          { free: 'مجاني', starter: 'برو', pro: 'برو+', atelier: 'ماكس+' } as Record<string, string>
        )[plan] ?? PLAN_LIMITS[plan].label)
      : PLAN_LIMITS[plan].label;
  const renews =
    periodEnd && plan !== 'free'
      ? `${locale === 'ar' ? 'يتجدد' : 'Renews'} ${new Date(periodEnd).toLocaleDateString(
          locale === 'ar' ? 'ar-QA' : 'en-GB',
          {
            day: 'numeric',
            month: 'short',
          },
        )}`
      : null;

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="hidden rounded-full text-xs lg:inline-flex"
    >
      <Link
        href="/account/settings/plan"
        title={renews ?? (locale === 'ar' ? 'إدارة الخطة' : 'Manage plan')}
      >
        <span className="font-semibold">{label}</span>
        {renews ? <span className="text-muted-foreground">{renews}</span> : null}
      </Link>
    </Button>
  );
}
