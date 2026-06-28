import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStorefrontsForUser } from '@/lib/brief';
import {
  analyticsBreakdownSince,
  dailyEventCounts,
  eventCountSince,
  funnelCountsSince,
  realtimeAnalyticsSnapshot,
  searchAnalyticsSince,
  topProductsSince,
  topReferrersSince,
  visitorMixSince,
} from '@/lib/analytics';
import {
  analyticsHistoryDaysForPlan,
  canAccessAdvancedAnalytics,
  canAccessBasicAnalytics,
  canExportAnalytics,
  getPlan,
  hasEnterpriseAnalyticsDepth,
  PLAN_LIMITS,
  UPGRADE_GROWTH_TOOLS_COPY,
} from '@/lib/billing';
import {
  getOrderAnalyticsSummaryForStorefront,
  paymentMethodPerformanceForStorefront,
  realtimeOrderFeedForStorefront,
  revenueSeriesForStorefront,
} from '@/lib/checkout-orders';
import { inventoryAnalyticsForStorefront, topProductsByOrders } from '@/lib/products';
import { EmptyState, PageHeader } from '@/components/admin/primitives';
import { adminPhrase } from '@/components/admin/adminLocale';
import { BasicAnalyticsSection } from '@/components/admin/analytics/BasicAnalyticsSection';
import { AdvancedAnalyticsSection } from '@/components/admin/analytics/AdvancedAnalyticsSection';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ store?: string | string[] }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/account/analytics');
  const locale = (await cookies()).get('NEXT_LOCALE')?.value;
  const t = (text: string) => adminPhrase(locale, text);

  const sp = (await searchParams) ?? {};
  const requested = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const [storefronts, plan] = await Promise.all([
    getStorefrontsForUser(userId),
    getPlan(userId),
  ]);

  if (storefronts.length === 0) {
    return (
      <>
        <PageHeader title={t('Analytics')} subtitle={t('Set up a storefront to start tracking traffic.')} />
        <EmptyState
          eyebrow={t('Get started')}
          title={t('Create your store first')}
          body={t('Souqna writes privacy-respecting storefront events for visits, products, carts, orders, and searches. The command center fills as soon as your store is live.')}
          action={{ label: t('Create your store'), href: '/begin' }}
        />
      </>
    );
  }

  if (!canAccessBasicAnalytics(plan)) {
    return (
      <>
        <PageHeader title={t('Analytics')} subtitle={UPGRADE_GROWTH_TOOLS_COPY} />
        <EmptyState
          eyebrow={t('Plan locked')}
          title={t('Analytics unlock on Free and above')}
          body={t('Every Souqna plan includes Basic Analytics. Upgrade to Pro+ for advanced intelligence, behavior tracking, forecasting, and deeper reporting.')}
          action={{ label: t('Compare plans'), href: '/account/settings/plan' }}
        />
      </>
    );
  }

  const known = storefronts.map((storefront) => storefront.slug);
  const slug = requested && known.includes(requested) ? requested : storefronts[0]!.slug;
  const activeStorefront = storefronts.find((storefront) => storefront.slug === slug);
  const currency = activeStorefront?.checkout.currency ?? 'QAR';
  const historyDays = analyticsHistoryDaysForPlan(plan);
  const windowDays = plan === 'free' ? 30 : 90;
  const advancedUnlocked = canAccessAdvancedAnalytics(plan);
  const enterpriseDepth = hasEnterpriseAnalyticsDepth(plan);

  const [
    productViews,
    cartAdds,
    visitorMix,
    topProducts,
    topReferrers,
    pageViewSeries,
    productViewSeries,
    topSales,
    funnel,
    devices,
    browsers,
    search,
    realtime,
    orderFeed,
    orderSummary,
    revenueDay,
    revenueWeek,
    revenueMonth,
    revenueYear,
    paymentMethods,
    inventory,
  ] = await Promise.all([
    eventCountSince(slug, 'product_view', windowDays),
    eventCountSince(slug, 'cart_add', windowDays),
    visitorMixSince(slug, windowDays),
    topProductsSince(slug, windowDays, 6),
    topReferrersSince(slug, windowDays, 6),
    dailyEventCounts(slug, 'page_view', windowDays),
    dailyEventCounts(slug, 'product_view', windowDays),
    topProductsByOrders(slug, windowDays, 6).catch(() => []),
    funnelCountsSince(slug, windowDays),
    analyticsBreakdownSince(slug, 'device', windowDays),
    analyticsBreakdownSince(slug, 'browser', windowDays),
    searchAnalyticsSince(slug, windowDays),
    realtimeAnalyticsSnapshot(slug),
    realtimeOrderFeedForStorefront(slug, 5),
    getOrderAnalyticsSummaryForStorefront(slug, windowDays),
    revenueSeriesForStorefront(slug, 'day'),
    revenueSeriesForStorefront(slug, 'week'),
    revenueSeriesForStorefront(slug, 'month'),
    revenueSeriesForStorefront(slug, 'year'),
    paymentMethodPerformanceForStorefront(slug, windowDays),
    inventoryAnalyticsForStorefront(slug),
  ]);

  const healthScore = storeHealthScore({
    cartAdds,
    inventoryRisk: inventory.lowStockCount + inventory.outOfStockCount,
    orders: orderSummary.totalOrders,
    paidOrders: orderSummary.paidOrders,
    productViews,
    uniqueVisitors: visitorMix.uniqueVisitors,
  });
  const planLabel = PLAN_LIMITS[plan].label;
  const historyLabel = [
    planLabel,
    historyDays === Number.POSITIVE_INFINITY
      ? t('Unlimited history')
      : `${historyDays.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US')} ${t('days history')}`,
    canExportAnalytics(plan) ? t('Export ready') : t('Live view'),
  ].join(' · ');

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={t('Analytics')}
        title={t('Merchant command center')}
        subtitle={
          locale === 'ar'
            ? `أداء ${activeStorefront?.businessName ?? slug}.`
            : `${activeStorefront?.businessName ?? slug}: sales, visitors, products, customers, and growth intelligence.`
        }
      />

      <BasicAnalyticsSection
        cartAdds30={cartAdds}
        currency={currency}
        devices={devices}
        browsers={browsers}
        funnel={funnel}
        historyLabel={historyLabel}
        locale={locale}
        orderFeed={orderFeed}
        pageViewSeries={pageViewSeries}
        productViews30={productViews}
        productViewSeries={productViewSeries}
        realtime={realtime}
        revenueSeries={{
          day: revenueDay,
          week: revenueWeek,
          month: revenueMonth,
          year: revenueYear,
        }}
        search={search}
        slug={slug}
        summary={orderSummary}
        topProducts={topProducts}
        topReferrers={topReferrers}
        topSales={topSales}
        visitorMix={visitorMix}
      />

      <AdvancedAnalyticsSection
        canAccess={advancedUnlocked}
        currency={currency}
        enterpriseDepth={enterpriseDepth}
        funnel={funnel}
        healthScore={healthScore}
        inventory={inventory}
        locale={locale}
        paymentMethods={paymentMethods}
        summary={orderSummary}
        topReferrers={topReferrers}
      />
    </div>
  );
}

function storeHealthScore(input: {
  cartAdds: number;
  inventoryRisk: number;
  orders: number;
  paidOrders: number;
  productViews: number;
  uniqueVisitors: number;
}): number {
  const conversion = input.uniqueVisitors > 0 ? (input.orders / input.uniqueVisitors) * 100 : 0;
  const paidShare = input.orders > 0 ? (input.paidOrders / input.orders) * 100 : 0;
  const activity = Math.min(100, input.orders * 10 + input.cartAdds * 2 + input.productViews * 0.2);
  const stockReadiness = Math.max(0, 100 - input.inventoryRisk * 12);
  const score =
    Math.min(conversion * 8, 100) * 0.24 +
    paidShare * 0.28 +
    activity * 0.24 +
    stockReadiness * 0.24;
  return Math.max(0, Math.min(100, score));
}
