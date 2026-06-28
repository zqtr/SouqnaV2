import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Gauge,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, PageHeader, StatusBadge, Surface } from '@/components/admin/primitives';
import { CommerceMetricCard, CommerceMetricGrid } from '@/components/admin/commerce-metrics';
import { adminPhrase } from '@/components/admin/adminLocale';
import { getAdminUserId } from '@/lib/adminAuth';
import { getStorefrontsForUser } from '@/lib/brief';
import { getAllProducts, topProductsByOrders } from '@/lib/products';
import { countCustomers } from '@/lib/customers';
import {
  dailyOrdersSince,
  dailyEventSeriesSince,
  dailyVisitorsSince,
  eventCountSince,
  uniqueVisitorsSince,
} from '@/lib/analytics';
import { recentActivity } from '@/lib/audit';
import { listInstalledApps } from '@/lib/apps/installed';
import {
  getOrderStatsForStorefront,
  listOrdersForStorefront,
  type Order,
} from '@/lib/checkout-orders';

type StorefrontForHome = Awaited<ReturnType<typeof getStorefrontsForUser>>[number];
type HomeLabels = (typeof HOME_STRINGS)[Locale];
type HomeOrderStats = Awaited<ReturnType<typeof getOrderStatsForStorefront>>;
type HomeTopProducts = Awaited<ReturnType<typeof topProductsByOrders>>;
type HomeActivity = Awaited<ReturnType<typeof recentActivity>>;

export default async function AccountHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ store?: string | string[] }>;
}) {
  const userId = await getAdminUserId('account/home');
  if (!userId) redirect('/sign-in?redirect_url=/account');

  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const t = HOME_STRINGS[locale];
  const p = (text: string) => adminPhrase(locale, text);
  const storefronts = await getStorefrontsForUser(userId);

  if (storefronts.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={p('Workspace')}
          title={p('Create your first storefront')}
          subtitle={p(
            'Your account is ready. Start with the onboarding flow and this dashboard will fill with live orders, products, customers, and activity.',
          )}
        />
        <EmptyState
          eyebrow={p('No store yet')}
          title={p('Start with a real storefront')}
          body={p(
            'Souqna needs one storefront before the admin workspace can show live commerce data.',
          )}
          action={{ label: p('Start a store'), href: '/begin' }}
        />
      </>
    );
  }

  const known = new Set(storefronts.map((store) => store.slug));
  const storefront =
    storefronts.find((store) => store.slug === requested && known.has(store.slug)) ??
    storefronts[0]!;
  const storeParam = `?store=${encodeURIComponent(storefront.slug)}`;

  const [
    products,
    customersTotal,
    ordersPage,
    orderStats,
    installedApps,
    activity,
    visitors30,
    pageViews30,
    carts30,
    visitorTrend,
    ordersTrend,
    cartAddTrend,
    topProductsRows,
  ] = await Promise.all([
    getAllProducts(storefront.slug),
    countCustomers(storefront.slug),
    listOrdersForStorefront(storefront.slug, { limit: 6 }),
    getOrderStatsForStorefront(storefront.slug),
    listInstalledApps(storefront.slug),
    recentActivity(storefront.slug, 8),
    uniqueVisitorsSince(storefront.slug, 30),
    eventCountSince(storefront.slug, 'page_view', 30),
    eventCountSince(storefront.slug, 'cart_add', 30),
    dailyVisitorsSince(storefront.slug, 30).catch(() => [] as number[]),
    dailyOrdersSince(storefront.slug, 30).catch(() => [] as number[]),
    dailyEventSeriesSince(storefront.slug, 'cart_add', 30).catch(() => [] as number[]),
    topProductsByOrders(storefront.slug, 30, 5).catch(() => []),
  ]);
  const setupItems = [
    {
      label: t.setupAddProducts,
      done: products.length > 0,
      href: `/account/products${storeParam}`,
    },
    {
      label: t.setupConfigureCheckout,
      done: storefront.checkout.paymentMethods.length > 0,
      href: `/account/settings/checkout${storeParam}`,
    },
    {
      label: t.setupPublishStorefront,
      done: storefront.isPublished,
      href: `/account/builder${storeParam}`,
    },
    {
      label: t.setupInstallApps,
      done: installedApps.length > 0,
      href: `/account/apps${storeParam}`,
    },
  ];
  const setupProgress = Math.round(
    (setupItems.filter((item) => item.done).length / setupItems.length) * 100,
  );
  const souqyPortalHref = locale === 'ar' ? '/ar/begin/souqy' : '/begin/souqy';
  const conversionRate = visitors30 > 0 ? (orderStats.totalOrders / visitors30) * 100 : 0;
  const paidOrderShare =
    orderStats.totalOrders > 0 ? (orderStats.paidOrders / orderStats.totalOrders) * 100 : 0;

  const revenueDisplay = formatCurrency(orderStats.revenueQar, storefront.checkout.currency);
  const metricsSlot = (
    <CommerceMetricGrid>
      <CommerceMetricCard
        label={t.revenue}
        value={revenueDisplay}
        hint={`${orderStats.paidOrders} ${t.paidOrdersHint}`}
        badge={t.lastThirtyDays}
        tone="success"
        trend={ordersTrend}
        chart="bar"
        icon={ReceiptText}
        tooltip={`${pageViews30} ${t.pageViewsHint}`}
      />
      <CommerceMetricCard
        label={t.conversionRate}
        value={formatPercent(conversionRate, locale)}
        hint={`${orderStats.totalOrders} ${t.ordersFromVisitors(visitors30)}`}
        badge={t.checkoutSignal}
        tone={conversionRate > 0 ? 'info' : 'neutral'}
        trend={visitorTrend}
        icon={Gauge}
        tooltip={t.conversionTooltip}
      />
      <CommerceMetricCard
        label={t.aov}
        value={formatCurrency(orderStats.averageOrderQar, storefront.checkout.currency)}
        hint={t.aovHint}
        badge={t.average}
        tone="neutral"
        trend={ordersTrend}
        chart="bar"
        icon={ShoppingBag}
      />
      <CommerceMetricCard
        label={t.paidOrders}
        value={orderStats.paidOrders}
        hint={`${formatPercent(paidOrderShare, locale)} ${t.ofOrdersPaid}`}
        badge={t.settled}
        tone={orderStats.paidOrders > 0 ? 'success' : 'neutral'}
        trend={ordersTrend}
        chart="bar"
        icon={CreditCard}
      />
      <CommerceMetricCard
        label={t.unpaid}
        value={orderStats.unpaidOrders}
        hint={t.unpaidHint}
        badge={orderStats.unpaidOrders > 0 ? t.needsAction : t.clear}
        tone={orderStats.unpaidOrders > 0 ? 'warning' : 'neutral'}
        icon={AlertCircle}
      />
      <CommerceMetricCard
        label={t.cartAdds}
        value={carts30}
        hint={t.cartAddsHint}
        badge={t.intent}
        tone={carts30 > 0 ? 'info' : 'neutral'}
        trend={cartAddTrend}
        chart="bar"
        icon={ShoppingCart}
      />
    </CommerceMetricGrid>
  );

  return (
    <>
      <AccountHomeHero
        storefront={storefront}
        setupProgress={setupProgress}
        productsCount={products.length}
        customersTotal={customersTotal}
        ordersTotal={ordersPage.total}
        revenue={revenueDisplay}
        builderHref={`/account/builder${storeParam}`}
        souqyPortalHref={souqyPortalHref}
        labels={t}
        locale={locale}
      />
      <div className="souqna-dashboard5-home" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {metricsSlot}
        <div className="souqna-dashboard5-primary-grid">
          <Dashboard5CommerceFlowCard
            title={t.ordersTrendTitle}
            subtitle={`${ordersTrend.reduce((a, b) => a + b, 0)} ${t.ordersTrendSuffix}`}
            ordersTrend={ordersTrend}
            cartAddTrend={cartAddTrend}
            ordersLabel={t.orders}
            cartAddsLabel={t.cartAdds}
            thirtyDaysAgo={t.thirtyDaysAgo}
            today={t.today}
            windowLabel={t.lastThirtyDays}
            ariaLabel={t.ordersBarAria}
          />
          <div className="souqna-dashboard5-side-stack">
            <Dashboard5OrderMixCard stats={orderStats} labels={t} locale={locale} />
            <Dashboard5SetupCard
              setupProgress={setupProgress}
              setupItems={setupItems}
              orderStats={orderStats}
              carts30={carts30}
              currency={storefront.checkout.currency}
              labels={t}
            />
          </div>
        </div>
        <div className="souqna-dashboard5-secondary-grid">
          <Dashboard5TopProductsCard
            rows={topProductsRows}
            storeParam={storeParam}
            currency={storefront.checkout.currency}
            labels={t}
          />
          <Dashboard5RecentOrdersCard
            orders={ordersPage.orders}
            storeParam={storeParam}
            labels={t}
            phrase={p}
          />
          <Dashboard5ActivityCard
            entries={activity}
            href={`/account/settings/activity-log${storeParam}`}
            labels={t}
          />
        </div>
      </div>
      <style>{`
        .souqna-dashboard5-home {
          display: grid;
          gap: 18px;
          margin-bottom: 32px;
        }

        .souqna-dashboard5-primary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.82fr);
          gap: 18px;
          align-items: start;
        }

        .souqna-dashboard5-side-stack {
          display: grid;
          gap: 18px;
        }

        .souqna-dashboard5-secondary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(280px, 0.8fr);
          gap: 18px;
          align-items: start;
        }

        @media (max-width: 1180px) {
          .souqna-dashboard5-primary-grid,
          .souqna-dashboard5-secondary-grid {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>
    </>
  );
}

function AccountHomeHero({
  storefront,
  setupProgress,
  productsCount,
  customersTotal,
  ordersTotal,
  revenue,
  builderHref,
  souqyPortalHref,
  labels,
  locale,
}: {
  storefront: StorefrontForHome;
  setupProgress: number;
  productsCount: number;
  customersTotal: number;
  ordersTotal: number;
  revenue: string;
  builderHref: string;
  souqyPortalHref: string;
  labels: (typeof HOME_STRINGS)[Locale];
  locale: Locale;
}) {
  return (
    <Surface
      className="souqna-dashboard-dither"
      padding={0}
      style={{
        overflow: 'hidden',
        margin: '8px 0 24px',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--dash-important) 18%, var(--dash-panel-strong)) 0%, var(--dash-panel) 54%, var(--dash-beige) 100%)',
        borderColor: 'var(--dash-rule-strong)',
      }}
    >
      <div
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 20,
          alignItems: 'start',
          padding: '24px clamp(18px, 3vw, 28px)',
        }}
        className="souqna-account-hero"
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              {labels.workspace}
            </span>
            <StatusBadge tone={storefront.isPublished ? 'info' : 'neutral'}>
              {storefront.isPublished ? labels.live : labels.draft}
            </StatusBadge>
            <StatusBadge tone={setupProgress === 100 ? 'info' : 'warning'}>
              {setupProgress}% {labels.setup}
            </StatusBadge>
          </div>
          <h1
            dir="auto"
            style={{
              margin: 0,
              maxWidth: 780,
              color: 'var(--ink-strong)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 650,
              lineHeight: 1.05,
              letterSpacing: 0,
              textWrap: 'balance',
              unicodeBidi: 'plaintext',
            }}
          >
            {storefront.businessName}
          </h1>
          <p
            style={{
              margin: '10px 0 0',
              maxWidth: 620,
              color: 'var(--ink-muted)',
              fontSize: 14.5,
              lineHeight: 1.65,
            }}
          >
            {labels.heroSubtitle}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 18,
            }}
          >
            <Button asChild>
              <Link href={builderHref}>
                {labels.openBuilder}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={souqyPortalHref}>
                {labels.viewStore}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))',
            gap: 10,
            minWidth: 280,
            margin: 0,
          }}
          className="souqna-account-hero-signals"
        >
          <Signal label={labels.orders} value={ordersTotal} />
          <Signal label={labels.products} value={productsCount} />
          <Signal label={labels.customers} value={customersTotal} />
          <Signal label={labels.revenue} value={revenue} />
        </dl>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .souqna-account-hero {
            grid-template-columns: 1fr !important;
          }
          .souqna-account-hero-signals {
            min-width: 0 !important;
          }
        }
      `}</style>
    </Surface>
  );
}

function Dashboard5CommerceFlowCard({
  title,
  subtitle,
  ordersTrend,
  cartAddTrend,
  ordersLabel,
  cartAddsLabel,
  thirtyDaysAgo,
  today,
  windowLabel,
  ariaLabel,
}: {
  title: string;
  subtitle: string;
  ordersTrend: number[];
  cartAddTrend: number[];
  ordersLabel: string;
  cartAddsLabel: string;
  thirtyDaysAgo: string;
  today: string;
  windowLabel: string;
  ariaLabel: string;
}) {
  const ordersTotal = ordersTrend.reduce((sum, value) => sum + value, 0);
  const cartAddsTotal = cartAddTrend.reduce((sum, value) => sum + value, 0);
  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1">{subtitle}</CardDescription>
        </div>
        <CardAction>
          <Badge
            variant="outline"
            style={{
              borderColor: 'color-mix(in srgb, var(--dash-important) 42%, transparent)',
              background: 'var(--dash-important-soft)',
              color: 'var(--dash-black)',
            }}
          >
            {windowLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 pt-4">
        <Dashboard5AreaChart
          primary={ordersTrend}
          secondary={cartAddTrend}
          primaryLabel={ordersLabel}
          secondaryLabel={cartAddsLabel}
          ariaLabel={ariaLabel}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Signal label={ordersLabel} value={ordersTotal} />
          <Signal label={cartAddsLabel} value={cartAddsTotal} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{thirtyDaysAgo}</span>
          <span>{today}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard5AreaChart({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  ariaLabel,
}: {
  primary: number[];
  secondary: number[];
  primaryLabel: string;
  secondaryLabel: string;
  ariaLabel: string;
}) {
  const width = 720;
  const height = 260;
  const padding = 22;
  const maxValue = Math.max(...primary, ...secondary, 1);
  const primaryPoints = getChartPoints(primary, width, height, padding, maxValue);
  const secondaryPoints = getChartPoints(secondary, width, height, padding, maxValue);
  const first = primaryPoints[0] ?? { x: padding, y: height - padding };
  const last = primaryPoints[primaryPoints.length - 1] ?? first;
  const baseline = height - padding;
  const areaPoints = [
    pointsToString(primaryPoints),
    `${last.x.toFixed(1)},${baseline.toFixed(1)}`,
    `${first.x.toFixed(1)},${baseline.toFixed(1)}`,
  ].join(' ');

  return (
    <div className="souqna-dashboard-chart rounded-lg border border-border/80 bg-muted/40 p-3">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] w-full overflow-visible"
      >
        <title>{ariaLabel}</title>
        <defs>
          <linearGradient id="souqna-dashboard5-flow-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + (height - padding * 2) * line}
            y2={padding + (height - padding * 2) * line}
            stroke="currentColor"
            className="text-border/80"
            strokeDasharray="5 7"
          />
        ))}
        <polygon points={areaPoints} fill="url(#souqna-dashboard5-flow-fill)" />
        <polyline
          points={pointsToString(primaryPoints)}
          fill="none"
          stroke="var(--chart-primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <polyline
          points={pointsToString(secondaryPoints)}
          fill="none"
          stroke="var(--chart-secondary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          strokeDasharray="7 7"
        />
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-primary)]" />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-secondary)]" />
          {secondaryLabel}
        </span>
      </div>
    </div>
  );
}

function Dashboard5OrderMixCard({
  stats,
  labels,
  locale,
}: {
  stats: HomeOrderStats;
  labels: HomeLabels;
  locale: Locale;
}) {
  const total = Math.max(stats.totalOrders, 1);
  const rows = [
    {
      label: labels.paidOrders,
      value: stats.paidOrders,
      icon: CheckCircle2,
      accent: 'var(--dash-important)',
    },
    {
      label: labels.unpaid,
      value: stats.unpaidOrders,
      icon: AlertCircle,
      accent: 'var(--dash-important)',
    },
    {
      label: labels.pending,
      value: stats.pendingOrders,
      icon: Clock3,
      accent: 'var(--dash-black)',
    },
  ];

  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.checkoutSignal}</CardTitle>
          <CardDescription className="mt-1">{labels.ofOrdersPaid}</CardDescription>
        </div>
        <CardAction>
          <PaidShareRing paid={stats.paidOrders} total={stats.totalOrders} locale={locale} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 pt-4">
        {rows.map((row) => {
          const pct = stats.totalOrders > 0 ? (row.value / total) * 100 : 0;
          const Icon = row.icon;
          return (
            <div key={row.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md border"
                    style={{
                      borderColor: `color-mix(in srgb, ${row.accent} 28%, transparent)`,
                      background: `color-mix(in srgb, ${row.accent} 12%, transparent)`,
                    }}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">{row.value}</span>
              </div>
              <Progress
                value={pct}
                className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PaidShareRing({ paid, total, locale }: { paid: number; total: number; locale: Locale }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div
      className="grid size-14 place-items-center rounded-full"
      style={{
        background:
          total > 0
            ? `conic-gradient(var(--dash-important) 0 ${pct}%, color-mix(in srgb, var(--muted) 78%, transparent) ${pct}% 100%)`
            : 'var(--muted)',
      }}
    >
      <div className="grid size-10 place-items-center rounded-full bg-card font-mono text-[11px] font-semibold tabular-nums">
        {formatPercent(pct, locale)}
      </div>
    </div>
  );
}

function Dashboard5SetupCard({
  setupProgress,
  setupItems,
  orderStats,
  carts30,
  currency,
  labels,
}: {
  setupProgress: number;
  setupItems: Array<{ label: string; done: boolean; href: string }>;
  orderStats: HomeOrderStats;
  carts30: number;
  currency: string;
  labels: HomeLabels;
}) {
  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.setupTitle}</CardTitle>
          <CardDescription className="mt-1">{labels.setupProgress(setupProgress)}</CardDescription>
        </div>
        <CardAction>
          <StatusBadge tone={setupProgress === 100 ? 'info' : 'warning'}>
            {setupProgress === 100 ? labels.ready : labels.progress}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">
        <Progress value={setupProgress} className="h-2" />
        <div className="mt-4 grid gap-2">
          {setupItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-muted/35 px-3 py-2 text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              <span className="truncate">{item.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {item.done ? labels.done : labels.open}
              </span>
            </Link>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Signal label={labels.cartAdds} value={carts30} />
          <Signal label={labels.aov} value={formatCurrency(orderStats.averageOrderQar, currency)} />
          <Signal label={labels.pending} value={orderStats.pendingOrders} />
          <Signal label={labels.unpaid} value={orderStats.unpaidOrders} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Dashboard5TopProductsCard({
  rows,
  storeParam,
  currency,
  labels,
}: {
  rows: HomeTopProducts;
  storeParam: string;
  currency: string;
  labels: HomeLabels;
}) {
  const maxRevenue = Math.max(...rows.map((row) => row.revenueQar), 1);
  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.topProductsTitle}</CardTitle>
          <CardDescription className="mt-1">{labels.topProductsEmptyCta}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/account/products${storeParam}`}>
              {labels.topProductsViewAll}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">
        {rows.length > 0 ? (
          <ol className="grid gap-4">
            {rows.map((row, index) => {
              const pct = Math.max(4, Math.round((row.revenueQar / maxRevenue) * 100));
              return (
                <li key={row.product.id} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-md border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--dash-important) 42%, transparent)',
                          background: 'var(--dash-important-soft)',
                          color: 'var(--dash-black)',
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {row.product.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.ordersCount} {labels.topProductsOrdersSuffix}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-end font-mono text-sm font-semibold tabular-nums">
                      {formatCurrency(row.revenueQar, currency)}
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
                  />
                </li>
              );
            })}
          </ol>
        ) : (
          <InlineEmpty
            title={labels.topProductsTitle}
            body={labels.topProductsEmpty}
            href={`/account/products${storeParam}`}
            label={labels.topProductsEmptyCta}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard5RecentOrdersCard({
  orders,
  storeParam,
  labels,
  phrase,
}: {
  orders: Order[];
  storeParam: string;
  labels: HomeLabels;
  phrase: (text: string) => string;
}) {
  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.recentOrdersTitle}</CardTitle>
          <CardDescription className="mt-1">{labels.noOrdersBody}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/account/orders${storeParam}`}>
              {labels.topProductsViewAll}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.customer}</TableHead>
                <TableHead>{labels.status}</TableHead>
                <TableHead className="text-right">{labels.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                        {initialsFor(order.customerName)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/account/orders/${order.id}${storeParam}`}
                          className="truncate font-medium text-foreground hover:underline"
                        >
                          {order.customerName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={statusTone(order.orderStatus)}>
                      {phrase(order.orderStatus.replace('_', ' '))}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.totalQar, order.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <InlineEmpty
            title={labels.noOrdersYet}
            body={labels.noOrdersBody}
            href={`/account/products${storeParam}`}
            label={labels.setupAddProducts}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard5ActivityCard({
  entries,
  href,
  labels,
}: {
  entries: HomeActivity;
  href: string;
  labels: HomeLabels;
}) {
  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.recentActivityTitle}</CardTitle>
          <CardDescription className="mt-1">{labels.recordedActivity}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              {labels.log}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">
        {entries.length > 0 ? (
          <ol className="grid gap-3">
            {entries.slice(0, 5).map((entry) => (
              <li
                key={entry.id}
                className="flex gap-3 rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground">
                  <Bell className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="m-0 line-clamp-2 text-sm text-foreground">
                    {entry.summary ?? entry.targetId ?? labels.recordedActivity}
                  </p>
                  <p className="m-0 mt-1 font-mono text-[11px] text-muted-foreground">
                    {entry.action} · {formatDate(entry.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <InlineEmpty title={labels.noActivityYet} body={labels.noActivityBody} />
        )}
      </CardContent>
    </Card>
  );
}

function InlineEmpty({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-10">
      <h3 className="m-0 font-serif text-base font-semibold" style={{ color: 'var(--ink-strong)' }}>
        {title}
      </h3>
      <p
        className="m-0 max-w-xl"
        style={{
          fontSize: '14.5px',
          lineHeight: 1.65,
          color: 'var(--ink-muted)',
        }}
      >
        {body}
      </p>
      {href && label ? (
        <Button asChild size="sm" className="mt-2">
          <Link href={href}>{label}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="souqna-dashboard-signal rounded-md border border-border bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function getChartPoints(
  series: number[],
  width: number,
  height: number,
  padding: number,
  maxValue: number,
): Array<{ x: number; y: number }> {
  const values = series.length > 0 ? series : [0, 0];
  const plotted = values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : values;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const scale = Math.max(maxValue, 1);

  return plotted.map((rawValue, index) => ({
    x: padding + (usableWidth * index) / Math.max(plotted.length - 1, 1),
    y: height - padding - (Math.max(0, rawValue) / scale) * usableHeight,
  }));
}

function pointsToString(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.charAt(0) ?? '?'}${parts[1]?.charAt(0) ?? ''}`;
  return letters.toUpperCase();
}

function formatCurrency(value: number, currency: string): string {
  return `${currency} ${Intl.NumberFormat('en-GB').format(value)}`;
}

function formatPercent(value: number, locale?: Locale): string {
  return `${Intl.NumberFormat(locale === 'ar' ? 'ar-QA' : 'en-US', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  }).format(value)}%`;
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusTone(
  status: Order['orderStatus'],
): 'success' | 'warning' | 'critical' | 'info' | 'neutral' {
  if (status === 'delivered' || status === 'confirmed') return 'info';
  if (status === 'cancelled') return 'critical';
  if (status === 'pending') return 'warning';
  if (status === 'preparing' || status === 'shipped') return 'info';
  return 'neutral';
}

const HOME_STRINGS = {
  en: {
    workspace: 'Workspace',
    live: 'live',
    draft: 'draft',
    setup: 'setup',
    heroSubtitle:
      'A quieter control room for orders, products, customers, and the storefront you are building.',
    openBuilder: 'Open builder',
    viewStore: 'Souqy Portal',
    orders: 'Orders',
    revenue: 'Revenue',
    visitors: 'Visitors',
    products: 'Products',
    customers: 'Customers',
    conversionRate: 'Conversion rate',
    customer: 'Customer',
    status: 'Status',
    total: 'Total',
    revenueHint: 'total orders',
    paidOrdersHint: 'paid orders',
    pageViewsHint: 'page views in the same window',
    lastThirtyDays: '30d',
    checkoutSignal: 'checkout',
    conversionTooltip: 'Orders divided by unique visitors over the last 30 days.',
    ordersFromVisitors: (n: number) => `orders from ${n} visitors`,
    visitorsHint: 'Last 30 days',
    productsHint: 'Published and draft items',
    customersHint: 'Saved customer records',
    revenueTrendAria: 'Revenue trend over the last 30 days',
    visitorTrendAria: 'Visitor trend over the last 30 days',
    ordersBarAria: 'Daily order count over the last 30 days',
    topProductsTitle: 'Top products',
    topProductsViewAll: 'View all',
    topProductsEmpty: 'No paid orders yet. Once buyers check out, your best sellers surface here.',
    topProductsEmptyCta: 'Manage catalogue',
    topProductsOrdersSuffix: 'orders',
    ordersTrendTitle: 'Orders trend',
    ordersTrendSuffix: 'orders · last 30 days',
    thirtyDaysAgo: '30 days ago',
    today: 'Today',
    quickActionsTitle: 'Quick actions',
    quickActionsAddProduct: 'Add a product',
    quickActionsEditStorefront: 'Edit storefront',
    quickActionsBrowseApps: 'Browse apps',
    setupAddProducts: 'Add products',
    setupConfigureCheckout: 'Configure checkout',
    setupPublishStorefront: 'Publish storefront',
    setupInstallApps: 'Install apps',
    recentOrdersTitle: 'Recent orders',
    noOrdersYet: 'No orders yet',
    noOrdersBody: 'Orders placed from checkout will appear here automatically.',
    paidOrders: 'Paid orders',
    ofOrdersPaid: 'of orders paid',
    settled: 'settled',
    aovHint: 'Average checkout value',
    average: 'average',
    unpaidHint: 'Awaiting payment or cash confirmation',
    needsAction: 'needs action',
    clear: 'clear',
    cartAddsHint: 'Buyers who added an item to cart',
    intent: 'intent',
    recentActivityTitle: 'Recent activity',
    log: 'Log',
    action: 'Action',
    summary: 'Summary',
    when: 'When',
    recordedActivity: 'Recorded activity',
    noActivityYet: 'No activity yet',
    noActivityBody: 'Saved changes, app installs, and order actions will build this log.',
    setupTitle: 'Setup',
    setupProgress: (n: number) => `${n}% complete for this storefront.`,
    ready: 'ready',
    progress: 'progress',
    done: 'done',
    open: 'open',
    cartAdds: 'Cart adds',
    aov: 'AOV',
    pending: 'Pending',
    unpaid: 'Unpaid',
  },
  ar: {
    workspace: 'مساحة العمل',
    live: 'مباشر',
    draft: 'مسودة',
    setup: 'إعداد',
    heroSubtitle: 'غرفة تحكم أهدأ للطلبات والمنتجات والعملاء والمتجر الذي تبنيه.',
    openBuilder: 'افتح المصمم',
    viewStore: 'Souqy Portal',
    orders: 'الطلبات',
    revenue: 'الإيرادات',
    visitors: 'الزوّار',
    products: 'المنتجات',
    customers: 'العملاء',
    conversionRate: 'معدل التحويل',
    customer: 'العميل',
    status: 'الحالة',
    total: 'الإجمالي',
    revenueHint: 'إجمالي الطلبات',
    paidOrdersHint: 'طلبات مدفوعة',
    pageViewsHint: 'مشاهدات صفحة في نفس الفترة',
    lastThirtyDays: '٣٠ يوم',
    checkoutSignal: 'الدفع',
    conversionTooltip: 'الطلبات مقسومة على الزوار الفريدين خلال آخر ٣٠ يوماً.',
    ordersFromVisitors: (n: number) => `طلبات من ${n.toLocaleString('ar-QA')} زائر`,
    visitorsHint: 'آخر ٣٠ يوماً',
    productsHint: 'منتجات منشورة ومسوّدات',
    customersHint: 'سجلات العملاء',
    revenueTrendAria: 'منحنى الإيرادات خلال آخر ٣٠ يوماً',
    visitorTrendAria: 'منحنى الزوّار خلال آخر ٣٠ يوماً',
    ordersBarAria: 'عدد الطلبات اليومي خلال آخر ٣٠ يوماً',
    topProductsTitle: 'أكثر المنتجات مبيعاً',
    topProductsViewAll: 'عرض الكل',
    topProductsEmpty:
      'لا توجد طلبات مدفوعة بعد. عندما يبدأ الزبائن في الشراء ستظهر هنا أفضل منتجاتك.',
    topProductsEmptyCta: 'إدارة الكتالوج',
    topProductsOrdersSuffix: 'طلبات',
    ordersTrendTitle: 'منحنى الطلبات',
    ordersTrendSuffix: 'طلبات · آخر ٣٠ يوماً',
    thirtyDaysAgo: 'قبل ٣٠ يوماً',
    today: 'اليوم',
    quickActionsTitle: 'إجراءات سريعة',
    quickActionsAddProduct: 'إضافة منتج',
    quickActionsEditStorefront: 'تعديل المتجر',
    quickActionsBrowseApps: 'تصفّح التطبيقات',
    setupAddProducts: 'إضافة منتجات',
    setupConfigureCheckout: 'إعداد الدفع',
    setupPublishStorefront: 'نشر المتجر',
    setupInstallApps: 'تثبيت التطبيقات',
    recentOrdersTitle: 'أحدث الطلبات',
    noOrdersYet: 'لا توجد طلبات بعد',
    noOrdersBody: 'ستظهر الطلبات القادمة من الدفع هنا تلقائياً.',
    paidOrders: 'الطلبات المدفوعة',
    ofOrdersPaid: 'من الطلبات مدفوعة',
    settled: 'تمت التسوية',
    aovHint: 'متوسط قيمة الطلب',
    average: 'متوسط',
    unpaidHint: 'بانتظار الدفع أو تأكيد الدفع عند الاستلام',
    needsAction: 'يحتاج إجراء',
    clear: 'لا يوجد',
    cartAddsHint: 'عملاء أضافوا منتجاً إلى السلة',
    intent: 'نية شراء',
    recentActivityTitle: 'النشاط الأخير',
    log: 'السجل',
    action: 'الإجراء',
    summary: 'الملخص',
    when: 'الوقت',
    recordedActivity: 'نشاط مسجل',
    noActivityYet: 'لا يوجد نشاط بعد',
    noActivityBody: 'ستظهر التغييرات المحفوظة وتثبيت التطبيقات وإجراءات الطلبات في هذا السجل.',
    setupTitle: 'الإعداد',
    setupProgress: (n: number) => `اكتمل ${n}% من إعداد هذا المتجر.`,
    ready: 'جاهز',
    progress: 'قيد التقدم',
    done: 'مكتمل',
    open: 'مفتوح',
    cartAdds: 'إضافات السلة',
    aov: 'متوسط الطلب',
    pending: 'قيد الانتظار',
    unpaid: 'غير مدفوع',
  },
} as const satisfies Record<Locale, Record<string, string | ((n: number) => string)>>;
