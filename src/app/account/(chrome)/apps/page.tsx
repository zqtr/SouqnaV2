import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  CircleAlert,
  PlugZap,
  Search,
  Settings2,
} from 'lucide-react';
import { getStorefrontsForUser } from '@/lib/brief';
import { listInstalledApps } from '@/lib/apps/installed';
import { APP_REGISTRY } from '@/lib/apps/registry';
import type { AppCategory, AppDescriptor } from '@/lib/apps/types';
import { env } from '@/lib/env';
import { EmptyState } from '@/components/admin/primitives';
import { AppMark } from '@/components/admin/apps/AppMark';
import { adminPhrase } from '@/components/admin/adminLocale';

type MarketplaceApp = {
  app: AppDescriptor;
  ctaHref: string;
  ctaLabel: string;
  configured: boolean;
  installed: boolean;
  primaryCta: boolean;
  setupRequired: boolean;
};

type MarketplaceCategory = 'recommended' | 'installed' | AppCategory;

type MarketplaceTab = {
  id: MarketplaceCategory;
  label: string;
  count: number;
  href: string;
  active: boolean;
};

const CATEGORY_ORDER: AppCategory[] = [
  'marketing',
  'sales',
  'finance',
  'support',
  'analytics',
  'media',
  'logistics',
];

const CATEGORY_LABELS: Record<AppCategory, string> = {
  analytics: 'Analytics',
  finance: 'Finance',
  logistics: 'Logistics',
  marketing: 'Marketing',
  media: 'Media',
  sales: 'Sales',
  support: 'Support',
};

/**
 * Souqna Marketplace shell. The page is intentionally server-rendered:
 * app install/configure routing stays stable while the UI behaves like a
 * compact integrations directory.
 */
export default async function AppsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
    store?: string | string[];
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/apps');
  const locale = (await cookies()).get('NEXT_LOCALE')?.value;
  const t = (text: string) => adminPhrase(locale, text);

  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const requestedCategory = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const requestedQuery = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const query = requestedQuery?.trim() ?? '';
  const storefronts = await getStorefrontsForUser(userId);
  if (storefronts.length === 0) {
    return (
      <EmptyState
        eyebrow={t('Marketplace')}
        title={t('Souqna Marketplace')}
        body={t('Marketplace tools are scoped per-storefront. Set up a store to unlock Souqna Marketplace.')}
        action={{ label: t('Create your store'), href: '/begin' }}
      />
    );
  }

  const known = storefronts.map((s) => s.slug);
  const storefront =
    storefronts.find((store) => requested && known.includes(requested) && store.slug === requested) ??
    storefronts[0]!;
  const slug = storefront.slug;
  const installed = await listInstalledApps(slug);
  const installedSet = new Set(installed.map((a) => a.appId));
  const marketplaceApps = APP_REGISTRY.map((app) =>
    toMarketplaceApp({
      app,
      installed: installedSet.has(app.id),
      storeSlug: slug,
      t,
    }),
  );
  const selectedCategory = isMarketplaceCategory(requestedCategory)
    ? requestedCategory
    : 'recommended';
  const tabs = buildMarketplaceTabs({
    apps: marketplaceApps,
    query,
    selectedCategory,
    storeSlug: slug,
    t,
  });
  const categoryApps = filterMarketplaceApps(marketplaceApps, selectedCategory);
  const visibleApps = filterMarketplaceSearch(categoryApps, query);

  return (
    <div className="souqna-marketplace">
      <MarketplaceHeader t={t} />

      <div className="marketplace-layout">
        <section className="marketplace-directory" aria-labelledby="marketplace-apps-title">
          <div className="marketplace-directory__head">
            <div>
              <p className="marketplace-kicker">{t('Available in Souqna Marketplace')}</p>
              <h2 id="marketplace-apps-title">{t('Integration directory')}</h2>
            </div>
            <form className="marketplace-search" action="/account/apps">
              <Search className="h-4 w-4" />
              <input type="hidden" name="store" value={slug} />
              {selectedCategory !== 'recommended' ? (
                <input type="hidden" name="category" value={selectedCategory} />
              ) : null}
              <input
                aria-label={t('Search marketplace')}
                defaultValue={query}
                name="q"
                placeholder={t('Search apps, channels, and tools')}
                type="search"
              />
              <button type="submit" aria-label={t('Search marketplace')}>
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <nav className="marketplace-tabs" aria-label={t('Marketplace categories')}>
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={tab.active ? 'page' : undefined}
                className={tab.active ? 'is-active' : undefined}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </Link>
            ))}
          </nav>

          {visibleApps.length > 0 ? (
            <div className="marketplace-grid">
              {visibleApps.map((item, index) => (
                <MarketplaceAppCard
                  key={item.app.id}
                  item={item}
                  index={index}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="marketplace-empty">
              <PlugZap className="h-5 w-5" aria-hidden="true" />
              <h3>{query ? t('No apps match this search') : t('No apps in this category yet')}</h3>
              <p>
                {query
                  ? t('Try another app name, category, or provider.')
                  : t('Installed apps and new channels will appear here as Souqna Marketplace grows.')}
              </p>
            </div>
          )}
        </section>

      </div>

      <style dangerouslySetInnerHTML={{ __html: marketplaceStyles }} />
    </div>
  );
}

function MarketplaceHeader({ t }: { t: (text: string) => string }) {
  return (
    <section className="marketplace-header" aria-labelledby="marketplace-title">
      <div className="marketplace-header__copy">
        <p className="marketplace-kicker">{t('Souqna Marketplace')}</p>
        <h1 id="marketplace-title">{t('Connect the stack behind this store')}</h1>
        <p>
          {t('Pick the apps that move orders, customers, messages, and products without leaving the dashboard.')}
        </p>
      </div>
    </section>
  );
}

function MarketplaceAppCard({
  item,
  index,
  locale,
  t,
}: {
  item: MarketplaceApp;
  index: number;
  locale?: string;
  t: (text: string) => string;
}) {
  const { app, ctaHref, ctaLabel, installed, primaryCta, setupRequired } = item;
  const unavailable = !app.available;
  const actionIcon = installed ? Settings2 : unavailable ? CircleAlert : PlugZap;
  const ActionIcon = actionIcon;

  return (
    <article className="marketplace-card" style={{ ['--delay' as string]: `${index * 70}ms` }}>
      <header className="marketplace-card__header">
        <AppMark app={app} size={50} radius={14} />
        <div className="marketplace-card__title">
          <p>{locale === 'ar' ? `بواسطة ${app.vendor.replace(/^by\s+/i, '')}` : app.vendor}</p>
          <h3>{app.name}</h3>
        </div>
        <MarketplaceStatus item={item} t={t} />
      </header>

      <div className="marketplace-card__body">
        <h4>{t(app.tagline)}</h4>
        <p>{t(app.description)}</p>
      </div>

      <div className="marketplace-card__meta">
        <span>{t(CATEGORY_LABELS[app.category])}</span>
        <span>{t(authLabel(app.authKind))}</span>
      </div>

      {unavailable ? (
        <span className="marketplace-card__cta is-disabled" aria-disabled="true">
          {ctaLabel}
          <ActionIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : (
        <Link
          href={ctaHref}
          className={[
            'marketplace-card__cta',
            primaryCta ? 'marketplace-card__cta--primary' : '',
            setupRequired ? 'marketplace-card__cta--setup' : '',
          ].filter(Boolean).join(' ')}
        >
          {ctaLabel}
          <ActionIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

function MarketplaceStatus({
  item,
  t,
}: {
  item: MarketplaceApp;
  t: (text: string) => string;
}) {
  if (item.installed) {
    return (
      <span className="marketplace-status marketplace-status--installed">
        {t('installed')}
      </span>
    );
  }
  if (!item.app.available) {
    return (
      <span className="marketplace-status marketplace-status--soon">
        {t('soon')}
      </span>
    );
  }
  if (item.setupRequired) {
    return (
      <span className="marketplace-status marketplace-status--setup">
        {t('setup')}
      </span>
    );
  }
  return null;
}

function buildMarketplaceTabs({
  apps,
  query,
  selectedCategory,
  storeSlug,
  t,
}: {
  apps: MarketplaceApp[];
  query: string;
  selectedCategory: MarketplaceCategory;
  storeSlug: string;
  t: (text: string) => string;
}): MarketplaceTab[] {
  const categoryCount = new Map<AppCategory, number>();
  for (const item of apps) {
    categoryCount.set(item.app.category, (categoryCount.get(item.app.category) ?? 0) + 1);
  }

  const tabs: MarketplaceTab[] = [
    {
      id: 'recommended',
      label: t('Recommended'),
      count: apps.filter((item) => item.app.available || item.installed).length,
      href: marketplaceHref(storeSlug, 'recommended', query),
      active: selectedCategory === 'recommended',
    },
    {
      id: 'installed',
      label: t('Installed'),
      count: apps.filter((item) => item.installed).length,
      href: marketplaceHref(storeSlug, 'installed', query),
      active: selectedCategory === 'installed',
    },
  ];

  for (const category of CATEGORY_ORDER) {
    const count = categoryCount.get(category) ?? 0;
    if (count === 0) continue;
    tabs.push({
      id: category,
      label: t(CATEGORY_LABELS[category]),
      count,
      href: marketplaceHref(storeSlug, category, query),
      active: selectedCategory === category,
    });
  }

  return tabs;
}

function filterMarketplaceApps(
  apps: MarketplaceApp[],
  selectedCategory: MarketplaceCategory,
): MarketplaceApp[] {
  if (selectedCategory === 'installed') return apps.filter((item) => item.installed);
  if (selectedCategory === 'recommended') {
    return apps.filter((item) => item.app.available || item.installed);
  }
  return apps.filter((item) => item.app.category === selectedCategory);
}

function filterMarketplaceSearch(apps: MarketplaceApp[], query: string): MarketplaceApp[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return apps;
  return apps.filter(({ app }) =>
    [
      app.name,
      app.vendor,
      app.tagline,
      app.description,
      CATEGORY_LABELS[app.category],
      authLabel(app.authKind),
    ].some((value) => value.toLowerCase().includes(needle)),
  );
}

function marketplaceHref(storeSlug: string, category: MarketplaceCategory, query: string): string {
  const params = new URLSearchParams({ store: storeSlug });
  if (category !== 'recommended') params.set('category', category);
  if (query) params.set('q', query);
  return `/account/apps?${params.toString()}`;
}

function isMarketplaceCategory(value: string | undefined): value is MarketplaceCategory {
  if (!value) return false;
  return value === 'recommended' || value === 'installed' || CATEGORY_ORDER.includes(value as AppCategory);
}

function toMarketplaceApp({
  app,
  installed,
  storeSlug,
  t,
}: {
  app: AppDescriptor;
  installed: boolean;
  storeSlug: string;
  t: (text: string) => string;
}): MarketplaceApp {
  const configured = isConfigured(app);
  const setupRequired = app.available && !configured && !installed;
  const primaryCta = app.available && !installed;
  const ctaHref = installed
    ? `/account/apps/${app.id}/configure?store=${storeSlug}`
    : app.available
      ? `/account/apps/${app.id}?store=${storeSlug}`
      : '#';
  const ctaLabel = installed
    ? t('Manage')
    : app.available
      ? t('Connect')
      : t('Coming soon');

  return {
    app,
    configured,
    ctaHref,
    ctaLabel,
    installed,
    primaryCta,
    setupRequired,
  };
}

function isConfigured(app: AppDescriptor): boolean {
  const envReady = (app.requiredEnv ?? []).every((key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
  if (!envReady) return false;
  if (app.authKind === 'oauth' || app.authKind === 'api_key') {
    return Boolean(env.APPS_ENCRYPTION_KEY);
  }
  return true;
}

function authLabel(authKind: AppDescriptor['authKind']): string {
  if (authKind === 'oauth') return 'Account connection';
  if (authKind === 'api_key') return 'API key';
  return 'One-click install';
}

const marketplaceStyles = `
.souqna-marketplace {
  --market-panel: color-mix(in srgb, var(--surface-elevated) 88%, var(--surface-bg));
  --market-panel-soft: color-mix(in srgb, var(--surface-elevated) 68%, transparent);
  --market-line: color-mix(in srgb, var(--ink-strong) 13%, transparent);
  --market-line-strong: color-mix(in srgb, var(--ink-strong) 23%, transparent);
  --market-accent: var(--admin-accent, var(--color-gold, #b89a52));
  --market-accent-ink: color-mix(in srgb, var(--market-accent) 78%, var(--ink-strong));
  color: var(--ink-strong);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.marketplace-kicker {
  margin: 0;
  color: var(--market-accent-ink);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.marketplace-header {
  display: block;
}

.marketplace-header__copy,
.marketplace-directory,
.marketplace-card,
.marketplace-empty {
  border: 1px solid var(--market-line);
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--market-panel) 96%, transparent), color-mix(in srgb, var(--surface-bg) 94%, transparent)),
    var(--surface-elevated);
  box-shadow: 0 18px 60px color-mix(in srgb, #000 12%, transparent);
}

.marketplace-header__copy {
  position: relative;
  overflow: hidden;
  padding: clamp(20px, 3vw, 30px);
}

.marketplace-header__copy::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--market-accent) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ink-strong) 5%, transparent) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(90deg, #000, transparent 86%);
  opacity: 0.46;
  pointer-events: none;
}

.marketplace-header__copy > * {
  position: relative;
  z-index: 1;
}

.marketplace-header h1 {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--ink-strong);
  font-size: clamp(28px, 4.5vw, 52px);
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.02;
}

.marketplace-header__copy > p:not(.marketplace-kicker) {
  max-width: 690px;
  margin: 14px 0 0;
  color: var(--ink-muted);
  font-size: 15px;
  line-height: 1.65;
}

.marketplace-layout {
  display: block;
}

.marketplace-directory {
  padding: clamp(16px, 2vw, 20px);
}

.marketplace-directory__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--market-line);
  padding-bottom: 14px;
}

.marketplace-directory__head h2 {
  margin: 5px 0 0;
  color: var(--ink-strong);
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 750;
  letter-spacing: 0;
}

.marketplace-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 42%);
  min-height: 38px;
  border: 1px solid var(--market-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-bg) 52%, transparent);
  color: var(--ink-muted);
  font-size: 13px;
  padding: 0 12px;
}

.marketplace-search:focus-within {
  border-color: color-mix(in srgb, var(--market-accent) 44%, transparent);
  background: color-mix(in srgb, var(--surface-bg) 62%, transparent);
}

.marketplace-search svg {
  flex-shrink: 0;
}

.marketplace-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink-strong);
  font: inherit;
  outline: none;
}

.marketplace-search input::placeholder {
  color: var(--ink-muted);
  opacity: 1;
}

.marketplace-search input::-webkit-search-cancel-button {
  filter: grayscale(1);
  opacity: 0.55;
}

.marketplace-search button {
  display: inline-grid;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--market-line);
  border-radius: 7px;
  background: color-mix(in srgb, var(--surface-elevated) 68%, transparent);
  color: var(--ink-muted);
  cursor: pointer;
  padding: 0;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}

.marketplace-search button:hover,
.marketplace-search button:focus-visible {
  border-color: color-mix(in srgb, var(--market-accent) 46%, transparent);
  background: color-mix(in srgb, var(--market-accent) 14%, var(--surface-elevated));
  color: var(--ink-strong);
  outline: none;
}

.marketplace-tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.marketplace-tabs a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  border: 1px solid var(--market-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-bg) 44%, transparent);
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 680;
  padding: 0 12px;
  text-decoration: none;
  white-space: nowrap;
}

.marketplace-tabs a strong {
  color: var(--ink-strong);
  font-family: var(--font-mono);
  font-size: 11px;
}

.marketplace-tabs a.is-active {
  border-color: color-mix(in srgb, var(--market-accent) 46%, transparent);
  background: color-mix(in srgb, var(--market-accent) 14%, var(--market-panel));
  color: var(--ink-strong);
}

.marketplace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.marketplace-card {
  display: flex;
  min-height: 268px;
  flex-direction: column;
  padding: 14px;
  opacity: 0;
  transform: translateY(10px);
  animation: marketplace-card-in 420ms ease forwards;
  animation-delay: var(--delay);
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.marketplace-card:hover,
.marketplace-card:focus-within {
  border-color: color-mix(in srgb, var(--market-accent) 42%, transparent);
  box-shadow: 0 22px 72px color-mix(in srgb, #000 16%, transparent);
  transform: translateY(-1px);
}

.marketplace-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.marketplace-card__title {
  min-width: 0;
  flex: 1;
}

.marketplace-card__title p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 12px;
}

.marketplace-card__title h3 {
  margin: 3px 0 0;
  color: var(--ink-strong);
  font-size: 18px;
  font-weight: 740;
  line-height: 1.12;
}

.marketplace-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0 8px;
  text-transform: uppercase;
}

.marketplace-status--installed {
  border-color: color-mix(in srgb, var(--market-accent) 34%, transparent);
  background: color-mix(in srgb, var(--market-accent) 12%, transparent);
  color: var(--ink-strong);
}

.marketplace-status--setup,
.marketplace-status--soon {
  border-color: color-mix(in srgb, var(--market-line-strong) 88%, transparent);
  background: color-mix(in srgb, var(--surface-bg) 45%, transparent);
  color: var(--ink-muted);
}

.marketplace-card__body {
  margin-top: 16px;
  margin-bottom: auto;
}

.marketplace-card__body h4 {
  margin: 0;
  color: var(--ink-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.35;
}

.marketplace-card__body p {
  margin: 8px 0 0;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.55;
}

.marketplace-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.marketplace-card__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid var(--market-line);
  border-radius: 999px;
  color: var(--ink-muted);
  font-size: 11.5px;
  font-weight: 640;
  padding: 0 9px;
}

.marketplace-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  margin-top: 14px;
  border: 1px solid var(--market-line-strong);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-bg) 42%, transparent);
  color: var(--ink-strong);
  font-size: 13px;
  font-weight: 740;
  text-decoration: none;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.marketplace-card__cta:hover,
.marketplace-card__cta:focus-visible {
  border-color: color-mix(in srgb, var(--market-accent) 52%, transparent);
  background: color-mix(in srgb, var(--market-accent) 14%, var(--surface-elevated));
  outline: none;
}

.marketplace-card__cta--primary {
  border-color: color-mix(in srgb, var(--market-accent) 52%, transparent);
  background: var(--ink-strong);
  color: var(--surface-bg);
}

.marketplace-card__cta--setup {
  border-color: color-mix(in srgb, var(--market-accent) 36%, transparent);
  background: color-mix(in srgb, var(--market-accent) 12%, var(--surface-elevated));
}

.marketplace-card__cta.is-disabled {
  color: var(--ink-muted);
  cursor: not-allowed;
}

.marketplace-empty {
  border: 1px solid var(--market-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-bg) 42%, transparent);
}

.marketplace-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 18px;
}

.marketplace-empty svg {
  color: var(--market-accent-ink);
}

.marketplace-empty h3 {
  margin: 0;
  color: var(--ink-strong);
  font-size: 16px;
}

.marketplace-empty p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.5;
}

@keyframes marketplace-card-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 680px) {
  .marketplace-directory__head {
    align-items: stretch;
  }

  .marketplace-directory__head {
    flex-direction: column;
  }

  .marketplace-search {
    width: 100%;
  }

  .marketplace-grid {
    grid-template-columns: 1fr;
  }

  .marketplace-header__copy,
  .marketplace-directory,
  .marketplace-card {
    border-radius: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .marketplace-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;
