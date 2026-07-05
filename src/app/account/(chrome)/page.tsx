import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  MousePointerClick,
  type LucideIcon,
  Users,
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
import {
  CommerceMetricChartGroup,
  type CommerceChartMetric,
} from '@/components/admin/CommerceMetricChartGroup';
import { InteractiveDitheredTrendChart } from '@/components/admin/charts/InteractiveDitheredTrendChart';
import { adminPhrase } from '@/components/admin/adminLocale';
import { getAdminUserId } from '@/lib/adminAuth';
import { getStorefrontsForUser } from '@/lib/brief';
import { getAllProducts, topProductsByOrders } from '@/lib/products';
import {
  dailyOrdersSince,
  dailyEventSeriesSince,
  dailyVisitorsSince,
  eventCountSince,
  realtimeAnalyticsSnapshot,
  topReferrersSince,
  uniqueVisitorsSince,
} from '@/lib/analytics';
import { recentActivity } from '@/lib/audit';
import { listInstalledApps } from '@/lib/apps/installed';
import {
  getOrderStatsForStorefront,
  listOrdersForStorefront,
  revenueSeriesForStorefront,
  type Order,
  type RevenueSeriesPoint,
} from '@/lib/checkout-orders';
import {
  evaluateSetupCompletion,
  type AccountSetupTask,
} from '@/lib/accountSetupCompletion';

type StorefrontForHome = Awaited<ReturnType<typeof getStorefrontsForUser>>[number];
type HomeLabels = (typeof HOME_STRINGS)[Locale];
type HomeOrderStats = Awaited<ReturnType<typeof getOrderStatsForStorefront>>;
type HomeTopProducts = Awaited<ReturnType<typeof topProductsByOrders>>;
type HomeActivity = Awaited<ReturnType<typeof recentActivity>>;
type HomeTopReferrers = Awaited<ReturnType<typeof topReferrersSince>>;
type HomeRealtime = Awaited<ReturnType<typeof realtimeAnalyticsSnapshot>>;
type DashboardMetricSnapshot = {
  orderStats: HomeOrderStats;
  visitors30: number;
  pageViews30: number;
  carts30: number;
  productViews30: number;
  revenueTrend: number[];
  paidOrderTrend: number[];
  unpaidOrderTrend: number[];
  aovTrend: number[];
  conversionTrend: number[];
  previousRevenueTrend: number[];
  previousPaidOrderTrend: number[];
  previousUnpaidOrderTrend: number[];
  previousAovTrend: number[];
  previousConversionTrend: number[];
  previousCartAddTrend: number[];
  ordersTrend: number[];
  cartAddTrend: number[];
  pageViewTrend: number[];
  productViewTrend: number[];
  topReferrers: HomeTopReferrers;
  realtime: HomeRealtime;
};

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
    ordersPage,
    orderStats,
    installedApps,
    activity,
    visitors30,
    pageViews30,
    carts30,
    revenueSeries,
    previousRevenueSeries,
    ordersTrend,
    visitorTrend,
    previousVisitorTrend,
    cartAddTrend,
    previousCartAddTrend,
    pageViewTrend,
    productViewTrend,
    productViews30,
    topReferrers,
    realtime,
    topProductsRows,
  ] = await Promise.all([
    getAllProducts(storefront.slug),
    listOrdersForStorefront(storefront.slug, { limit: 6 }),
    getOrderStatsForStorefront(storefront.slug),
    listInstalledApps(storefront.slug),
    recentActivity(storefront.slug, 8),
    uniqueVisitorsSince(storefront.slug, 30),
    eventCountSince(storefront.slug, 'page_view', 30),
    eventCountSince(storefront.slug, 'cart_add', 30),
    revenueSeriesForStorefront(storefront.slug, 'day').catch(() => [] as RevenueSeriesPoint[]),
    revenueSeriesForStorefront(storefront.slug, 'day', 30).catch(() => [] as RevenueSeriesPoint[]),
    dailyOrdersSince(storefront.slug, 30).catch(() => [] as number[]),
    dailyVisitorsSince(storefront.slug, 30).catch(() => [] as number[]),
    dailyVisitorsSince(storefront.slug, 30, 30).catch(() => [] as number[]),
    dailyEventSeriesSince(storefront.slug, 'cart_add', 30).catch(() => [] as number[]),
    dailyEventSeriesSince(storefront.slug, 'cart_add', 30, 30).catch(() => [] as number[]),
    dailyEventSeriesSince(storefront.slug, 'page_view', 30).catch(() => [] as number[]),
    dailyEventSeriesSince(storefront.slug, 'product_view', 30).catch(() => [] as number[]),
    eventCountSince(storefront.slug, 'product_view', 30),
    topReferrersSince(storefront.slug, 30, 5).catch(() => []),
    realtimeAnalyticsSnapshot(storefront.slug).catch(() => ({ liveVisitors: 0, activeCarts: 0 })),
    topProductsByOrders(storefront.slug, 30, 5).catch(() => []),
  ]);
  const setup = evaluateSetupCompletion({
    storefront,
    products,
    productsCount: products.length,
    installedAppIds: installedApps.map((app) => app.appId),
  });
  const setupItems = setup.tasks;
  const setupProgress = setup.pct;
  const filledRevenueSeries = fillRevenueSeries(revenueSeries, 30);
  const previousFilledRevenueSeries = fillRevenueSeries(previousRevenueSeries, 30, 30);
  const dailyRevenue = filledRevenueSeries.map((point) => point.revenueQar);
  const dailyPaidOrders = filledRevenueSeries.map((point) => point.paidOrders);
  const dailyUnpaidOrders = filledRevenueSeries.map((point) => point.unpaidOrders);
  const previousDailyRevenue = previousFilledRevenueSeries.map((point) => point.revenueQar);
  const previousDailyPaidOrders = previousFilledRevenueSeries.map((point) => point.paidOrders);
  const previousDailyUnpaidOrders = previousFilledRevenueSeries.map((point) => point.unpaidOrders);
  const previousOrdersTrend = previousFilledRevenueSeries.map((point) => point.ordersCount);
  const revenueTrend = cumulativeTrend(dailyRevenue);
  const paidOrderTrend = cumulativeTrend(dailyPaidOrders);
  const unpaidOrderTrend = cumulativeTrend(dailyUnpaidOrders);
  const aovTrend = cumulativeRatioTrend(dailyRevenue, dailyPaidOrders);
  const conversionTrend = cumulativeRatioTrend(ordersTrend, visitorTrend, 100);
  const previousRevenueTrend = cumulativeTrend(previousDailyRevenue);
  const previousPaidOrderTrend = cumulativeTrend(previousDailyPaidOrders);
  const previousUnpaidOrderTrend = cumulativeTrend(previousDailyUnpaidOrders);
  const previousAovTrend = cumulativeRatioTrend(previousDailyRevenue, previousDailyPaidOrders);
  const previousConversionTrend = cumulativeRatioTrend(
    previousOrdersTrend,
    previousVisitorTrend,
    100,
  );
  const previousCartAddSeries = cumulativeTrend(previousCartAddTrend);
  const dashboardMetrics = getDashboardMetricSnapshot({
    storefrontSlug: storefront.slug,
    orderStats,
    visitors30,
    pageViews30,
    carts30,
    productViews30,
    revenueTrend,
    paidOrderTrend,
    unpaidOrderTrend,
    aovTrend,
    conversionTrend,
    previousRevenueTrend,
    previousPaidOrderTrend,
    previousUnpaidOrderTrend,
    previousAovTrend,
    previousConversionTrend,
    previousCartAddTrend: previousCartAddSeries,
    ordersTrend,
    cartAddTrend: cumulativeTrend(cartAddTrend),
    pageViewTrend,
    productViewTrend,
    topReferrers,
    realtime,
  });
  const dashboardStats = dashboardMetrics.orderStats;
  const souqyPortalHref = locale === 'ar' ? '/ar/begin/souqy' : '/begin/souqy';
  const conversionRate =
    dashboardMetrics.visitors30 > 0
      ? (dashboardStats.totalOrders / dashboardMetrics.visitors30) * 100
      : 0;
  const paidOrderShare =
    dashboardStats.totalOrders > 0
      ? (dashboardStats.paidOrders / dashboardStats.totalOrders) * 100
      : 0;
  const attentionOrders = dashboardStats.unpaidOrders + dashboardStats.pendingOrders;
  const productsNeedingReview = products.filter(
    (product) =>
      product.status !== 'active' ||
      !product.imageUrl ||
      product.priceQar == null ||
      !product.category,
  ).length;

  const revenueDisplay = formatCurrency(dashboardStats.revenueQar, storefront.checkout.currency);
  const commerceMetrics: CommerceChartMetric[] = [
    {
      id: 'revenue',
      label: t.revenue,
      value: revenueDisplay,
      hint: t.paidOrdersHint(dashboardStats.paidOrders),
      badge: t.lastThirtyDays,
      tone: 'success',
      format: 'currency',
      series: dashboardMetrics.revenueTrend,
      previousSeries: dashboardMetrics.previousRevenueTrend,
      icon: 'receipt',
    },
    {
      id: 'conversion',
      label: t.conversionRate,
      value: formatPercent(conversionRate, locale),
      hint: t.ordersFromVisitors(dashboardStats.totalOrders, dashboardMetrics.visitors30),
      badge: t.checkoutSignal,
      tone: 'info',
      format: 'percent',
      series: dashboardMetrics.conversionTrend,
      previousSeries: dashboardMetrics.previousConversionTrend,
      icon: 'gauge',
    },
    {
      id: 'aov',
      label: t.aov,
      value: formatCurrency(dashboardStats.averageOrderQar, storefront.checkout.currency),
      hint: t.aovHint,
      badge: t.average,
      tone: 'success',
      format: 'currency',
      series: dashboardMetrics.aovTrend,
      previousSeries: dashboardMetrics.previousAovTrend,
      icon: 'bag',
    },
    {
      id: 'paid-orders',
      label: t.paidOrders,
      value: formatNumber(dashboardStats.paidOrders, locale),
      hint: `${formatPercent(paidOrderShare, locale)} ${t.ofOrdersPaid}`,
      badge: t.settled,
      tone: dashboardStats.paidOrders > 0 ? 'success' : 'neutral',
      format: 'number',
      series: dashboardMetrics.paidOrderTrend,
      previousSeries: dashboardMetrics.previousPaidOrderTrend,
      icon: 'card',
    },
    {
      id: 'unpaid',
      label: t.unpaid,
      value: formatNumber(dashboardStats.unpaidOrders, locale),
      hint: t.unpaidHint,
      badge: dashboardStats.unpaidOrders > 0 ? t.needsAction : t.clear,
      tone: dashboardStats.unpaidOrders > 0 ? 'critical' : 'neutral',
      format: 'number',
      series: dashboardMetrics.unpaidOrderTrend,
      previousSeries: dashboardMetrics.previousUnpaidOrderTrend,
      icon: 'alert',
    },
    {
      id: 'cart-adds',
      label: t.cartAdds,
      value: formatNumber(dashboardMetrics.carts30, locale),
      hint: t.cartAddsHint,
      badge: t.intent,
      tone: dashboardMetrics.carts30 > 0 ? 'info' : 'neutral',
      format: 'number',
      series: dashboardMetrics.cartAddTrend,
      previousSeries: dashboardMetrics.previousCartAddTrend,
      icon: 'cart',
    },
  ];
  const metricsSlot = (
    <CommerceMetricChartGroup
      locale={locale}
      currency={storefront.checkout.currency}
      title={t.metricGroupTitle}
      subtitle={t.metricGroupSubtitle}
      currentLabel={t.currentPeriod}
      previousLabel={t.previousPeriod}
      lineLabel={t.lineView}
      ditherLabel={t.ditherView}
      selectLabel={t.selectMetric}
      metrics={commerceMetrics}
    />
  );

  return (
    <>
      <AccountHomeHero
        storefront={storefront}
        setupProgress={setupProgress}
        attentionOrders={attentionOrders}
        productsNeedingReview={productsNeedingReview}
        revenue={revenueDisplay}
        builderHref={`/account/builder${storeParam}`}
        ordersHref={`/account/orders${storeParam}`}
        productsHref={`/account/products${storeParam}`}
        souqyPortalHref={souqyPortalHref}
        labels={t}
        locale={locale}
      />
      <div className="souqna-dashboard5-home" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {metricsSlot}
        <Dashboard5CommerceFlowCard
          title={t.ordersTrendTitle}
          subtitle={`${formatNumber(
            dashboardMetrics.ordersTrend.reduce((a, b) => a + b, 0),
            locale,
          )} ${t.ordersTrendSuffix}`}
          ordersTrend={dashboardMetrics.ordersTrend}
          cartAddTrend={dashboardMetrics.cartAddTrend}
          ordersLabel={t.orders}
          cartAddsLabel={t.cartAdds}
          thirtyDaysAgo={t.thirtyDaysAgo}
          today={t.today}
          windowLabel={t.lastThirtyDays}
          ariaLabel={t.ordersBarAria}
        />
        <div className="souqna-dashboard5-support-grid">
          <Dashboard5OrderMixCard stats={dashboardStats} labels={t} locale={locale} />
          <Dashboard5SetupCard
            setupProgress={setupProgress}
            setupItems={setupItems}
            labels={t}
            locale={locale}
          />
        </div>
        <Dashboard5WebsiteAnalyticsCard
          pageViews={dashboardMetrics.pageViews30}
          uniqueVisitors={dashboardMetrics.visitors30}
          productViews={dashboardMetrics.productViews30}
          realtime={dashboardMetrics.realtime}
          pageViewTrend={dashboardMetrics.pageViewTrend}
          productViewTrend={dashboardMetrics.productViewTrend}
          referrers={dashboardMetrics.topReferrers}
          href={`/account/analytics${storeParam}`}
          labels={t}
          locale={locale}
        />
        <div className="souqna-dashboard5-secondary-grid">
          <div className="souqna-dashboard5-secondary-stack">
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
          </div>
          <Dashboard5ActivityCard
            entries={activity}
            href={`/account/settings/activity-log${storeParam}`}
            labels={t}
            locale={locale}
          />
        </div>
      </div>
      <style>{`
        .souqna-dashboard5-home {
          display: grid;
          gap: 18px;
          margin-bottom: 32px;
        }

        .souqna-dashboard5-support-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .souqna-dashboard5-website-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.72fr);
          gap: 18px;
          align-items: stretch;
        }

        .souqna-dashboard5-secondary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.78fr);
          gap: 18px;
          align-items: start;
        }

        .souqna-dashboard5-secondary-stack {
          display: grid;
          gap: 18px;
          align-items: start;
        }

        @media (max-width: 1180px) {
          .souqna-dashboard5-website-grid,
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
  attentionOrders,
  productsNeedingReview,
  revenue,
  builderHref,
  ordersHref,
  productsHref,
  souqyPortalHref,
  labels,
  locale,
}: {
  storefront: StorefrontForHome;
  setupProgress: number;
  attentionOrders: number;
  productsNeedingReview: number;
  revenue: string;
  builderHref: string;
  ordersHref: string;
  productsHref: string;
  souqyPortalHref: string;
  labels: (typeof HOME_STRINGS)[Locale];
  locale: Locale;
}) {
  const attentionDisplay = formatNumber(attentionOrders);
  const reviewDisplay = formatNumber(productsNeedingReview);
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
          gridTemplateColumns: 'minmax(0, 1fr)',
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
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-faint)',
              }}
            >
              {labels.workspace}
            </span>
            <span
              dir="auto"
              style={{
                minWidth: 0,
                color: 'var(--ink-faint)',
                fontSize: 12,
                fontWeight: 600,
                unicodeBidi: 'plaintext',
              }}
            >
              {storefront.businessName}
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
              maxWidth: 920,
              color: 'var(--ink-strong)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(28px, 3.4vw, 42px)',
              fontWeight: 650,
              lineHeight: 1.05,
              letterSpacing: 0,
              textWrap: 'balance',
              unicodeBidi: 'plaintext',
            }}
          >
            {labels.heroActionSummary(revenue, attentionDisplay, reviewDisplay)}
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

        <div className="souqna-account-action-grid" aria-label={labels.heroActions}>
          <ActionSignal
            label={labels.revenueAction}
            value={revenue}
            body={labels.revenueActionHint}
            href={`/account/analytics?store=${encodeURIComponent(storefront.slug)}`}
          />
          <ActionSignal
            label={labels.ordersAttention}
            value={attentionDisplay}
            body={labels.ordersAttentionHint}
            href={ordersHref}
          />
          <ActionSignal
            label={labels.productsReview}
            value={reviewDisplay}
            body={labels.productsReviewHint}
            href={productsHref}
          />
        </div>
      </div>
      <style>{`
        .souqna-account-action-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .souqna-account-action-card {
          display: grid;
          min-height: 112px;
          gap: 8px;
          align-content: space-between;
          border: 1px solid var(--dash-rule);
          border-radius: var(--dash-radius);
          background: color-mix(in srgb, var(--dash-panel-strong) 82%, transparent);
          color: var(--ink-strong);
          padding: 14px;
          text-decoration: none;
          box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dash-panel-strong) 58%, transparent);
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            transform 160ms ease;
        }

        .souqna-account-action-card:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--dash-important) 42%, transparent);
          background: color-mix(in srgb, var(--dash-important) 10%, var(--dash-panel-strong));
        }

        .souqna-account-action-label {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--ink-muted);
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 650;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .souqna-account-action-value {
          color: var(--ink-strong);
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
          tab-size: 4;
        }

        .souqna-account-action-body {
          margin: 0;
          color: var(--ink-muted);
          font-size: 12.5px;
          line-height: 1.45;
        }

        @media (max-width: 820px) {
          .souqna-account-hero {
            grid-template-columns: 1fr !important;
          }

          .souqna-account-action-grid {
            grid-template-columns: 1fr;
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
  return (
    <Card className="souqna-dashboard-card h-fit self-start overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
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
        <InteractiveDitheredTrendChart
          primary={ordersTrend}
          secondary={cartAddTrend}
          primaryLabel={ordersLabel}
          secondaryLabel={cartAddsLabel}
          thirtyDaysAgo={thirtyDaysAgo}
          today={today}
          ariaLabel={ariaLabel}
        />
      </CardContent>
    </Card>
  );
}

function Dashboard5WebsiteAnalyticsCard({
  pageViews,
  uniqueVisitors,
  productViews,
  realtime,
  pageViewTrend,
  productViewTrend,
  referrers,
  href,
  labels,
  locale,
}: {
  pageViews: number;
  uniqueVisitors: number;
  productViews: number;
  realtime: HomeRealtime;
  pageViewTrend: number[];
  productViewTrend: number[];
  referrers: HomeTopReferrers;
  href: string;
  labels: HomeLabels;
  locale: Locale;
}) {
  const productDepth = pageViews > 0 ? (productViews / pageViews) * 100 : 0;
  const maxReferrerCount = Math.max(...referrers.map((referrer) => referrer.count), 1);
  const signals: Array<{
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
  }> = [
    {
      label: labels.pageViews,
      value: formatNumber(pageViews, locale),
      hint: labels.totalTraffic,
      icon: Eye,
    },
    {
      label: labels.uniqueVisitors,
      value: formatNumber(uniqueVisitors, locale),
      hint: labels.audienceSignal,
      icon: Users,
    },
    {
      label: labels.productViews,
      value: formatNumber(productViews, locale),
      hint: labels.browsingIntent,
      icon: MousePointerClick,
    },
    {
      label: labels.liveVisitors,
      value: formatNumber(realtime.liveVisitors, locale),
      hint: `${formatNumber(realtime.activeCarts, locale)} ${labels.activeCarts}`,
      icon: Activity,
    },
  ];

  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.websiteAnalyticsTitle}</CardTitle>
          <CardDescription className="mt-1">{labels.websiteAnalyticsDescription}</CardDescription>
        </div>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={href}>
              {labels.openAnalytics}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 pt-4">
        <div className="souqna-dashboard5-website-grid">
          <div className="grid min-w-0 gap-4">
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {signals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className="rounded-lg border border-border/70 bg-muted/30 p-3"
                  >
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-card text-foreground">
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 truncate">{signal.label}</span>
                    </dt>
                    <dd className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                      {signal.value}
                    </dd>
                    <p className="m-0 mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {signal.hint}
                    </p>
                  </div>
                );
              })}
            </dl>
            <InteractiveDitheredTrendChart
              primary={pageViewTrend}
              secondary={productViewTrend}
              primaryLabel={labels.pageViews}
              secondaryLabel={labels.productViews}
              thirtyDaysAgo={labels.thirtyDaysAgo}
              today={labels.today}
              ariaLabel={labels.websiteTrendAria}
            />
          </div>
          <div className="grid gap-4 rounded-lg border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-sm font-semibold text-foreground">{labels.topSources}</h3>
              <Badge variant="outline">{labels.lastThirtyDays}</Badge>
            </div>
            {referrers.length > 0 ? (
              <ol className="grid gap-3">
                {referrers.map((referrer) => {
                  const pct = Math.max(4, Math.round((referrer.count / maxReferrerCount) * 100));
                  const host = referrer.host === 'direct' ? labels.directTraffic : referrer.host;
                  return (
                    <li key={referrer.host} className="grid gap-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-foreground">{host}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {formatNumber(referrer.count, locale)}
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-1.5 bg-background/80 [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
                      />
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="m-0 rounded-md border border-dashed border-border/80 px-3 py-6 text-sm text-muted-foreground">
                {labels.noSourcesYet}
              </p>
            )}
            <div className="grid gap-2 border-t border-border/70 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{labels.productDepth}</span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatPercent(productDepth, locale)}
                </span>
              </div>
              <Progress
                value={Math.min(100, productDepth)}
                className="h-2 bg-background/80 [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
              />
              <p className="m-0 text-xs text-muted-foreground">{labels.productDepthHint}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
      color: 'var(--dash-important)',
    },
    {
      label: labels.unpaid,
      value: stats.unpaidOrders,
      icon: AlertCircle,
      color: 'color-mix(in srgb, var(--dash-important) 50%, var(--muted-foreground))',
    },
    {
      label: labels.pending,
      value: stats.pendingOrders,
      icon: Clock3,
      color: 'var(--muted-foreground)',
    },
  ];

  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.checkoutSignal}</CardTitle>
          <CardDescription className="mt-1">{labels.checkoutStatusHint}</CardDescription>
        </div>
        <CardAction>
          <PaidShareRing paid={stats.paidOrders} total={stats.totalOrders} locale={locale} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 pt-4">
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
          {rows.map((row) => (
            <div
              key={row.label}
              style={{ width: `${(row.value / total) * 100}%`, background: row.color }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {rows.map((row) => {
            const pct = stats.totalOrders > 0 ? Math.round((row.value / total) * 100) : 0;
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex flex-col gap-1.5">
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 shrink-0" style={{ color: row.color }} aria-hidden />
                  <span className="truncate">{row.label}</span>
                </div>
                <div className="text-2xl font-semibold leading-none tabular-nums text-foreground">
                  {formatNumber(row.value, locale)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(pct, locale)} {labels.ofOrdersPaid}
                </div>
              </div>
            );
          })}
        </div>
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
  labels,
  locale,
}: {
  setupProgress: number;
  setupItems: AccountSetupTask[];
  labels: HomeLabels;
  locale: Locale;
}) {
  const completed = setupItems.filter((item) => item.done).length;
  const nextItem = setupItems.find((item) => !item.done) ?? null;

  return (
    <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border/80 px-5 py-4">
        <div>
          <CardTitle className="text-base">{labels.setupTitle}</CardTitle>
          <CardDescription className="mt-1">
            {labels.setupCompleted(completed, setupItems.length)}
          </CardDescription>
        </div>
        <CardAction>
          <StatusBadge tone={setupProgress === 100 ? 'info' : 'warning'}>
            {setupProgress === 100 ? labels.ready : labels.progress}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 pt-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
        <div className="grid gap-2">
          {setupItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border/80 bg-muted/30 px-3 py-3 text-sm text-foreground transition hover:border-[var(--dash-info)] hover:bg-accent hover:text-accent-foreground"
            >
              <span
                className={[
                  'grid size-8 place-items-center rounded-md border',
                  item.done
                    ? 'border-[var(--dash-success)]/45 bg-[var(--dash-success)]/12 text-[var(--dash-success)]'
                    : 'border-[var(--dash-warning)]/45 bg-[var(--dash-warning)]/12 text-[var(--dash-warning)]',
                ].join(' ')}
                aria-hidden
              >
                {item.done ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {locale === 'ar' ? item.arTitle : item.title}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                  {locale === 'ar' ? item.arBody : item.body}
                </span>
              </span>
              <span className="rounded-full border border-border/80 px-2 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                {item.done ? labels.done : labels.open}
              </span>
            </Link>
          ))}
        </div>
        <div className="rounded-md border border-border/80 bg-muted/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium capitalize text-muted-foreground">
                {nextItem ? labels.setupNext : labels.ready}
              </p>
              <p className="mt-2 text-sm font-medium">
                {nextItem
                  ? locale === 'ar'
                    ? nextItem.arTitle
                    : nextItem.title
                  : labels.setupAllSet}
              </p>
            </div>
            <div
              className="grid size-16 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--dash-info) 0 ${setupProgress}%, color-mix(in srgb, var(--muted) 78%, transparent) ${setupProgress}% 100%)`,
              }}
            >
              <div className="grid size-12 place-items-center rounded-full bg-card font-mono text-xs font-semibold tabular-nums">
                {formatPercent(setupProgress, locale)}
              </div>
            </div>
          </div>
          <Progress value={setupProgress} className="mt-4 h-1.5" />
          {nextItem ? (
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={nextItem.href}>
                {labels.open}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
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
  locale,
}: {
  entries: HomeActivity;
  href: string;
  labels: HomeLabels;
  locale: Locale;
}) {
  const isRtl = locale === 'ar';

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
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground">
                  <Bell className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p
                    className="m-0 line-clamp-2 text-sm text-foreground"
                    dir="auto"
                    style={{ unicodeBidi: 'plaintext' }}
                  >
                    {entry.summary ?? entry.targetId ?? labels.recordedActivity}
                  </p>
                  <p
                    className="m-0 mt-1 font-mono text-[11px] text-muted-foreground"
                    dir={isRtl ? 'rtl' : 'ltr'}
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    <bdi dir="ltr">{entry.action}</bdi>
                    <span aria-hidden> · </span>
                    <bdi dir={isRtl ? 'rtl' : 'ltr'}>{formatDate(entry.occurredAt, locale)}</bdi>
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

function ActionSignal({
  label,
  value,
  body,
  href,
}: {
  label: string;
  value: React.ReactNode;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="souqna-account-action-card">
      <span className="souqna-account-action-label">
        <span>{label}</span>
        <ArrowUpRight className="size-3.5" aria-hidden />
      </span>
      <span className="souqna-account-action-value" dir="ltr">
        {value}
      </span>
      <p className="souqna-account-action-body">{body}</p>
    </Link>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.charAt(0) ?? '?'}${parts[1]?.charAt(0) ?? ''}`;
  return letters.toUpperCase();
}

function getDashboardMetricSnapshot(
  metrics: DashboardMetricSnapshot & { storefrontSlug: string },
): DashboardMetricSnapshot {
  if (process.env.NODE_ENV !== 'development' || metrics.storefrontSlug !== 'components') {
    return metrics;
  }

  const orderWeights = [
    0.78, 0.82, 0.74, 0.9, 0.88, 0.95, 0.84, 0.92, 1.02, 0.98, 1.08, 1.04, 0.96, 1.12, 1.18, 1.06,
    1.14, 1.22, 1.09, 1.2, 1.28, 1.16, 1.24, 1.32, 1.18, 1.36, 1.3, 1.42, 1.34, 1.48,
  ];
  const pageViewWeights = [
    0.62, 0.7, 0.66, 0.78, 0.74, 0.82, 0.86, 0.84, 0.9, 0.96, 0.92, 1.02, 1.06, 1, 1.08, 1.12, 1.1,
    1.2, 1.16, 1.24, 1.28, 1.22, 1.32, 1.36, 1.3, 1.42, 1.38, 1.5, 1.46, 1.58,
  ];
  const revenueWeights = [
    0.7, 0.76, 0.72, 0.86, 0.9, 0.88, 0.96, 0.93, 1.04, 1.02, 1.08, 1.14, 1.03, 1.18, 1.22, 1.12,
    1.2, 1.26, 1.17, 1.3, 1.36, 1.24, 1.32, 1.4, 1.29, 1.45, 1.38, 1.5, 1.47, 1.58,
  ];
  const paidWeights = [
    0.76, 0.8, 0.73, 0.88, 0.86, 0.93, 0.82, 0.9, 1, 0.97, 1.06, 1.02, 0.95, 1.1, 1.16, 1.04, 1.12,
    1.2, 1.08, 1.18, 1.26, 1.14, 1.22, 1.3, 1.16, 1.34, 1.28, 1.4, 1.32, 1.46,
  ];
  const unpaidWeights = [
    1.38, 1.18, 1.28, 1.12, 1.2, 1.06, 1.14, 0.98, 1.08, 0.94, 1.02, 0.9, 0.96, 0.84, 0.9, 0.78,
    0.86, 0.72, 0.8, 0.68, 0.74, 0.62, 0.7, 0.58, 0.66, 0.52, 0.6, 0.48, 0.54, 0.44,
  ];
  const cartWeights = [
    0.68, 0.74, 0.72, 0.82, 0.8, 0.86, 0.9, 0.94, 0.88, 1.02, 0.96, 1.04, 1.08, 1, 1.12, 1.16, 1.1,
    1.18, 1.2, 1.15, 1.24, 1.28, 1.22, 1.32, 1.36, 1.3, 1.42, 1.38, 1.48, 1.54,
  ];
  const productWeights = [
    0.58, 0.64, 0.62, 0.72, 0.76, 0.8, 0.78, 0.86, 0.9, 0.88, 0.96, 1.02, 1, 1.08, 1.12, 1.06, 1.18,
    1.14, 1.22, 1.26, 1.2, 1.3, 1.34, 1.28, 1.38, 1.42, 1.36, 1.48, 1.52, 1.6,
  ];
  const ordersTrend = spreadSeries(2468, orderWeights);
  const previousOrdersTrend = spreadSeries(2180, orderWeights);
  const visitorTrend = spreadSeries(38640, pageViewWeights);
  const previousVisitorTrend = spreadSeries(35900, pageViewWeights);
  const pageViewTrend = spreadSeries(184920, pageViewWeights);
  const revenueDaily = spreadSeries(842500, revenueWeights);
  const previousRevenueDaily = spreadSeries(754200, revenueWeights);
  const paidDaily = spreadSeries(2396, paidWeights);
  const previousPaidDaily = spreadSeries(2215, paidWeights);
  const unpaidDaily = spreadSeries(72, unpaidWeights);
  const previousUnpaidDaily = spreadSeries(92, unpaidWeights);
  const cartDaily = spreadSeries(12880, cartWeights);
  const previousCartDaily = spreadSeries(11195, cartWeights);
  const aovValues = [
    394, 398, 391, 404, 408, 406, 412, 410, 418, 416, 421, 424, 418, 427, 431, 425, 430, 433, 426,
    435, 438, 431, 437, 441, 433, 444, 439, 447, 443, 448,
  ];
  const previousAovValues = [
    380, 384, 377, 390, 392, 391, 398, 395, 402, 400, 405, 408, 401, 412, 414, 407, 413, 417, 409,
    419, 422, 414, 421, 425, 416, 428, 423, 431, 426, 432,
  ];
  const aovTrend = cumulativeRatioTrend(
    paidDaily.map((orders, index) => orders * (aovValues[index] ?? 425)),
    paidDaily,
  );
  const previousAovTrend = cumulativeRatioTrend(
    previousPaidDaily.map((orders, index) => orders * (previousAovValues[index] ?? 408)),
    previousPaidDaily,
  );

  return {
    orderStats: {
      totalOrders: 2468,
      paidOrders: 2396,
      revenueQar: 842500,
      pendingOrders: 31,
      unpaidOrders: 72,
      averageOrderQar: 425,
    },
    visitors30: 38640,
    pageViews30: 184920,
    carts30: 12880,
    productViews30: 76240,
    revenueTrend: cumulativeTrend(revenueDaily),
    paidOrderTrend: cumulativeTrend(paidDaily),
    unpaidOrderTrend: cumulativeTrend(unpaidDaily),
    aovTrend,
    conversionTrend: cumulativeRatioTrend(ordersTrend, visitorTrend, 100),
    previousRevenueTrend: cumulativeTrend(previousRevenueDaily),
    previousPaidOrderTrend: cumulativeTrend(previousPaidDaily),
    previousUnpaidOrderTrend: cumulativeTrend(previousUnpaidDaily),
    previousAovTrend,
    previousConversionTrend: cumulativeRatioTrend(previousOrdersTrend, previousVisitorTrend, 100),
    previousCartAddTrend: cumulativeTrend(previousCartDaily),
    ordersTrend,
    cartAddTrend: cumulativeTrend(cartDaily),
    pageViewTrend,
    productViewTrend: spreadSeries(76240, productWeights),
    topReferrers: [
      { host: 'direct', count: 102500 },
      { host: 'instagram.com', count: 32800 },
      { host: 'google.com', count: 25120 },
      { host: 'tiktok.com', count: 18100 },
      { host: 'wa.me', count: 6420 },
    ],
    realtime: {
      liveVisitors: 183,
      activeCarts: 42,
    },
  };
}

function spreadSeries(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0 || weightTotal <= 0) return weights.map(() => 0);

  const raw = weights.map((weight) => (Math.max(0, weight) / weightTotal) * total);
  const series = raw.map(Math.floor);
  let remainder = total - series.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const item of order) {
    if (remainder <= 0) break;
    series[item.index] = (series[item.index] ?? 0) + 1;
    remainder -= 1;
  }

  return series;
}

function fillRevenueSeries(
  points: RevenueSeriesPoint[],
  sinceDays: number,
  offsetDays = 0,
): RevenueSeriesPoint[] {
  const byDay = new Map(points.map((point) => [point.label, point] as const));
  const out: RevenueSeriesPoint[] = [];
  const today = new Date();

  for (let index = 0; index < sinceDays; index += 1) {
    const day = new Date(today);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - offsetDays - (sinceDays - 1 - index));
    const label = day.toISOString().slice(0, 10);
    const point = byDay.get(label);
    out.push({
      label,
      revenueQar: point?.revenueQar ?? 0,
      ordersCount: point?.ordersCount ?? 0,
      paidOrders: point?.paidOrders ?? 0,
      unpaidOrders: point?.unpaidOrders ?? 0,
    });
  }

  return out;
}

function cumulativeTrend(values: number[]): number[] {
  let total = 0;
  return values.map((value) => {
    total += Math.max(0, value);
    return total;
  });
}

function cumulativeRatioTrend(
  numerator: number[],
  denominator: number[],
  multiplier = 1,
): number[] {
  const length = Math.max(numerator.length, denominator.length, 1);
  let numeratorTotal = 0;
  let denominatorTotal = 0;
  return Array.from({ length }, (_, index) => {
    numeratorTotal += Math.max(0, numerator[index] ?? 0);
    denominatorTotal += Math.max(0, denominator[index] ?? 0);
    if (denominatorTotal <= 0) return 0;
    return (numeratorTotal / denominatorTotal) * multiplier;
  });
}

function formatCurrency(value: number, currency: string): string {
  return `${currency} ${Intl.NumberFormat('en-GB').format(value)}`;
}

function formatNumber(value: number, locale?: Locale): string {
  void locale;
  return Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number, locale?: Locale): string {
  void locale;
  return `${Intl.NumberFormat('en-US', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  }).format(value)}%`;
}

function formatDate(value: string | Date, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-QA-u-nu-latn' : 'en-GB', {
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
    heroSubtitle: 'Clear payments, review the catalogue, and keep the storefront moving from here.',
    heroActionSummary: (revenue: string, orders: string, products: string) =>
      `You made ${revenue}, ${orders} orders need attention, ${products} products need review.`,
    heroActions: 'Storefront action summary',
    revenueAction: 'Profit view',
    revenueActionHint: 'Open the deeper traffic and sales readout.',
    ordersAttention: 'Needs attention',
    ordersAttentionHint: 'Unpaid and pending orders to clear next.',
    productsReview: 'Review products',
    productsReviewHint: 'Drafts or incomplete listings to finish.',
    openBuilder: 'Open builder',
    viewStore: 'Souqy Portal',
    metricGroupTitle: 'Sales overview',
    metricGroupSubtitle:
      'Click a KPI to switch the big chart and compare the last 30 days with the previous period.',
    selectMetric: 'Metric focus',
    currentPeriod: 'Current period',
    previousPeriod: 'Previous period',
    lineView: 'Line',
    ditherView: 'Dither',
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
    paidOrdersHint: (n: number) =>
      `${n.toLocaleString('en-US')} paid ${n === 1 ? 'order' : 'orders'}`,
    pageViewsHint: 'page views in the same window',
    lastThirtyDays: '30d',
    checkoutSignal: 'Checkout',
    checkoutStatusHint: 'Paid, unpaid, and pending orders',
    conversionTooltip: 'Orders divided by unique visitors over the last 30 days.',
    ordersFromVisitors: (orders: number, visits: number) =>
      `${orders.toLocaleString('en-US')} ${orders === 1 ? 'order' : 'orders'} from ${visits.toLocaleString('en-US')} ${visits === 1 ? 'visit' : 'visits'}`,
    visitorsHint: 'Last 30 days',
    productsHint: 'Published and draft items',
    customersHint: 'Saved customer records',
    revenueTrendAria: 'Revenue trend over the last 30 days',
    visitorTrendAria: 'Visitor trend over the last 30 days',
    ordersBarAria: 'Daily order count over the last 30 days',
    websiteAnalyticsTitle: 'Website analytics',
    websiteAnalyticsDescription: 'Traffic and product interest from the public storefront.',
    openAnalytics: 'Open analytics',
    pageViews: 'Page views',
    productViews: 'Product views',
    uniqueVisitors: 'Unique visitors',
    liveVisitors: 'Live visitors',
    activeCarts: 'active carts',
    totalTraffic: 'Total storefront traffic',
    audienceSignal: 'Audience reach',
    browsingIntent: 'Product interest',
    topSources: 'Top sources',
    directTraffic: 'Direct',
    noSourcesYet: 'No traffic sources yet.',
    productDepth: 'Product depth',
    productDepthHint: 'Product views compared with page views.',
    websiteTrendAria: 'Website traffic trend over the last 30 days',
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
    ofOrdersPaid: 'of orders',
    settled: 'settled',
    aovHint: 'Average cart value',
    average: 'average',
    unpaidHint: 'Awaiting payment',
    needsAction: 'needs action',
    clear: 'clear',
    cartAddsHint: 'Buyers who added to cart',
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
    setupCompleted: (done: number, total: number) => `${done}/${total} complete`,
    setupNext: 'Next task',
    setupAllSet: 'All setup tasks are complete.',
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
    heroSubtitle: 'صف المدفوعات وراجع الكتالوج وحرّك واجهة المتجر من هنا.',
    heroActionSummary: (revenue: string, orders: string, products: string) =>
      `حققت ${revenue}، ${orders} طلبات تحتاج انتباه، و${products} منتجات تحتاج مراجعة.`,
    heroActions: 'ملخص إجراءات المتجر',
    revenueAction: 'عرض الأرباح',
    revenueActionHint: 'افتح قراءة أعمق للزيارات والمبيعات.',
    ordersAttention: 'تحتاج انتباه',
    ordersAttentionHint: 'طلبات غير مدفوعة أو قيد الانتظار.',
    productsReview: 'مراجعة المنتجات',
    productsReviewHint: 'مسودات أو منتجات ناقصة تحتاج إكمال.',
    openBuilder: 'افتح المصمم',
    viewStore: 'Souqy Portal',
    metricGroupTitle: 'نظرة عامة على المبيعات',
    metricGroupSubtitle: 'اختر أي مؤشر لتغيير الرسم الكبير ومقارنة آخر 30 يوماً بالفترة السابقة.',
    selectMetric: 'تركيز المؤشر',
    currentPeriod: 'الفترة الحالية',
    previousPeriod: 'الفترة السابقة',
    lineView: 'خطي',
    ditherView: 'تنقيط',
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
    paidOrdersHint: (n: number) =>
      `${n.toLocaleString('en-US')} ${n === 1 ? 'طلب مدفوع' : 'طلبات مدفوعة'}`,
    pageViewsHint: 'مشاهدات صفحة في نفس الفترة',
    lastThirtyDays: '30 يوم',
    checkoutSignal: 'الدفع',
    checkoutStatusHint: 'مدفوعة، غير مدفوعة، ومعلّقة',
    conversionTooltip: 'الطلبات مقسومة على الزوار الفريدين خلال آخر 30 يوماً.',
    ordersFromVisitors: (orders: number, visits: number) =>
      `${orders.toLocaleString('en-US')} ${orders === 1 ? 'طلب' : 'طلبات'} من ${visits.toLocaleString('en-US')} زيارة`,
    visitorsHint: 'آخر 30 يوماً',
    productsHint: 'منتجات منشورة ومسوّدات',
    customersHint: 'سجلات العملاء',
    revenueTrendAria: 'منحنى الإيرادات خلال آخر 30 يوماً',
    visitorTrendAria: 'منحنى الزوّار خلال آخر 30 يوماً',
    ordersBarAria: 'عدد الطلبات اليومي خلال آخر 30 يوماً',
    websiteAnalyticsTitle: 'تحليلات الموقع',
    websiteAnalyticsDescription: 'الزيارات واهتمام المشترين من واجهة المتجر العامة.',
    openAnalytics: 'افتح التحليلات',
    pageViews: 'مشاهدات الصفحات',
    productViews: 'مشاهدات المنتجات',
    uniqueVisitors: 'زوار فريدون',
    liveVisitors: 'زوار مباشرون',
    activeCarts: 'سلات نشطة',
    totalTraffic: 'إجمالي زيارات المتجر',
    audienceSignal: 'وصول الجمهور',
    browsingIntent: 'اهتمام بالمنتجات',
    topSources: 'أهم المصادر',
    directTraffic: 'مباشر',
    noSourcesYet: 'لا توجد مصادر زيارات بعد.',
    productDepth: 'عمق التصفح',
    productDepthHint: 'مشاهدات المنتجات مقارنة بمشاهدات الصفحات.',
    websiteTrendAria: 'منحنى زيارات الموقع خلال آخر 30 يوماً',
    topProductsTitle: 'أكثر المنتجات مبيعاً',
    topProductsViewAll: 'عرض الكل',
    topProductsEmpty:
      'لا توجد طلبات مدفوعة بعد. عندما يبدأ الزبائن في الشراء ستظهر هنا أفضل منتجاتك.',
    topProductsEmptyCta: 'إدارة الكتالوج',
    topProductsOrdersSuffix: 'طلبات',
    ordersTrendTitle: 'منحنى الطلبات',
    ordersTrendSuffix: 'طلبات · آخر 30 يوماً',
    thirtyDaysAgo: 'قبل 30 يوماً',
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
    ofOrdersPaid: 'من الطلبات',
    settled: 'تمت التسوية',
    aovHint: 'متوسط قيمة الطلب',
    average: 'متوسط',
    unpaidHint: 'بانتظار الدفع',
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
    setupCompleted: (done: number, total: number) => `${done}/${total} مكتمل`,
    setupNext: 'المهمة التالية',
    setupAllSet: 'كل مهام الإعداد مكتملة.',
    ready: 'جاهز',
    progress: 'قيد التقدم',
    done: 'مكتمل',
    open: 'مفتوح',
    cartAdds: 'إضافات السلة',
    aov: 'متوسط الطلب',
    pending: 'قيد الانتظار',
    unpaid: 'غير مدفوع',
  },
} as const satisfies Record<
  Locale,
  Record<
    string,
    | string
    | ((n: number) => string)
    | ((a: number, b: number) => string)
    | ((revenue: string, orders: string, products: string) => string)
  >
>;
