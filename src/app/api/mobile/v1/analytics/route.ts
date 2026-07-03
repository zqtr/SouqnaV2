import { z } from 'zod';
import {
  analyticsBreakdownSince,
  dailyEventSeriesSince,
  dailyVisitorsSince,
  funnelCountsSince,
  realtimeAnalyticsSnapshot,
  searchAnalyticsSince,
  topProductsSince,
  topReferrersSince,
  visitorMixSince,
} from '@/lib/analytics';
import {
  getOrderAnalyticsSummaryForStorefront,
  realtimeOrderFeedForStorefront,
  revenueSeriesForStorefront,
} from '@/lib/checkout-orders';
import {
  mobileJson,
  mobileOptions,
  requireMobileStoreAccess,
  searchParam,
} from '@/lib/mobile/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(): Response {
  return mobileOptions();
}

const WindowSchema = z.coerce.number().int().min(1).max(90).catch(30);

export async function GET(req: Request): Promise<Response> {
  const slug = searchParam(req, 'store');
  const gate = await requireMobileStoreAccess(slug, 'analytics.view');
  if (!gate.ok) return gate.response;

  const days = WindowSchema.parse(new URL(req.url).searchParams.get('days') ?? '30');
  const storefront = gate.access.storefront;

  const [
    revenueDay,
    revenueWeek,
    revenueMonth,
    revenueYear,
    pageViewCounts,
    productViewCounts,
    visitorCounts,
    funnel,
    visitorMix,
    summary,
    topProducts,
    topReferrers,
    devices,
    browsers,
    search,
    realtime,
    orderFeed,
  ] = await Promise.all([
    revenueSeriesForStorefront(storefront.slug, 'day'),
    revenueSeriesForStorefront(storefront.slug, 'week'),
    revenueSeriesForStorefront(storefront.slug, 'month'),
    revenueSeriesForStorefront(storefront.slug, 'year'),
    dailyEventSeriesSince(storefront.slug, 'page_view', days),
    dailyEventSeriesSince(storefront.slug, 'product_view', days),
    dailyVisitorsSince(storefront.slug, days),
    funnelCountsSince(storefront.slug, days),
    visitorMixSince(storefront.slug, days),
    getOrderAnalyticsSummaryForStorefront(storefront.slug, days),
    topProductsSince(storefront.slug, days, 5),
    topReferrersSince(storefront.slug, days, 5),
    analyticsBreakdownSince(storefront.slug, 'device', days),
    analyticsBreakdownSince(storefront.slug, 'browser', days),
    searchAnalyticsSince(storefront.slug, days),
    realtimeAnalyticsSnapshot(storefront.slug),
    realtimeOrderFeedForStorefront(storefront.slug, 5),
  ]);

  const dayLabels = dailyWindowLabels(days);

  return mobileJson({
    store: {
      slug: storefront.slug,
      businessName: storefront.businessName,
      locale: storefront.locale,
      isPublished: storefront.isPublished,
    },
    windowDays: days,
    revenueSeries: {
      day: revenueDay,
      week: revenueWeek,
      month: revenueMonth,
      year: revenueYear,
    },
    pageViewSeries: toDailyPoints(dayLabels, pageViewCounts),
    productViewSeries: toDailyPoints(dayLabels, productViewCounts),
    visitorSeries: toDailyPoints(dayLabels, visitorCounts),
    funnel,
    visitorMix: {
      totalVisitors: visitorMix.totalVisitors,
      uniqueVisitors: visitorMix.uniqueVisitors,
      returningVisitors: visitorMix.returningVisitors,
    },
    summary,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      title: p.title,
      views: p.views,
    })),
    topReferrers: topReferrers.map((r) => ({ host: r.host, count: r.count })),
    devices: devices.map((row) => ({ label: row.label, count: row.count })),
    browsers: browsers.map((row) => ({ label: row.label, count: row.count })),
    search: {
      topKeywords: search.topKeywords,
      noResultSearches: search.noResultSearches,
    },
    realtime: {
      liveVisitors: realtime.liveVisitors,
      activeCarts: realtime.activeCarts,
    },
    orderFeed: orderFeed.map((item) => ({
      id: item.id,
      displayCode: item.displayCode,
      customerName: item.customerName,
      orderStatus: item.orderStatus,
      totalQar: item.totalQar,
      paymentStatus: item.paymentStatus,
      createdAt: new Date(item.createdAt).toISOString(),
    })),
  });
}

/**
 * UTC day keys ('YYYY-MM-DD', oldest first) aligned with the zero-filled
 * arrays returned by `dailyVisitorsSince`/`dailyEventSeriesSince`, which
 * bucket by UTC midnight using the same arithmetic.
 */
function dailyWindowLabels(days: number): string[] {
  const today = new Date();
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
}

function toDailyPoints(labels: string[], counts: number[]): Array<{ day: string; n: number }> {
  return labels.map((day, i) => ({ day, n: counts[i] ?? 0 }));
}
