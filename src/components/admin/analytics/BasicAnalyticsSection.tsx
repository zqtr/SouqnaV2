import Link from 'next/link';
import {
  Activity,
  BadgeDollarSign,
  Eye,
  Gauge,
  Search,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkline } from '@/components/admin/charts/Sparkline';
import { SalesLeaderboardCard } from '@/components/admin/commerce-metrics';
import { adminPhrase } from '@/components/admin/adminLocale';
import { MetricCard } from './MetricCard';
import type {
  BreakdownRow,
  DailyMetric,
  SearchAnalytics,
  TopProduct,
  TopReferrer,
  VisitorMix,
} from '@/lib/analytics';
import type {
  OrderAnalyticsSummary,
  RealtimeOrderFeedItem,
  RevenueSeriesPoint,
} from '@/lib/checkout-orders';
import type { TopProductByOrders } from '@/lib/products';

export function BasicAnalyticsSection({
  cartAdds30,
  currency,
  devices,
  browsers,
  funnel,
  historyLabel,
  locale,
  orderFeed,
  pageViewSeries,
  productViews30,
  productViewSeries,
  realtime,
  revenueSeries,
  search,
  slug,
  summary,
  topProducts,
  topReferrers,
  topSales,
  visitorMix,
}: {
  cartAdds30: number;
  currency: string;
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  funnel: Record<'pageViews' | 'productViews' | 'cartAdds' | 'orders' | 'inquiries', number>;
  historyLabel: string;
  locale?: string;
  orderFeed: RealtimeOrderFeedItem[];
  pageViewSeries: DailyMetric[];
  productViews30: number;
  productViewSeries: DailyMetric[];
  realtime: { liveVisitors: number; activeCarts: number };
  revenueSeries: Record<'day' | 'week' | 'month' | 'year', RevenueSeriesPoint[]>;
  search: SearchAnalytics;
  slug: string;
  summary: OrderAnalyticsSummary;
  topProducts: TopProduct[];
  topReferrers: TopReferrer[];
  topSales: TopProductByOrders[];
  visitorMix: VisitorMix;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const productConversion = productViews30 > 0 ? (funnel.orders / productViews30) * 100 : 0;

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2 border-[color:color-mix(in_srgb,var(--color-gold-deep)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_12%,transparent)] text-[color:var(--color-maroon)]">
            {t('Basic Analytics')}
          </Badge>
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            {t('Essential store performance')}
          </h2>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            {t('The numbers every merchant needs daily: sales, visitors, products, orders, search, and live activity.')}
          </p>
        </div>
        <Badge variant="outline" className="bg-card">
          {historyLabel}
        </Badge>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('Total revenue')}
          value={`${currency} ${formatNumber(summary.revenueQar, locale)}`}
          hint={t('Paid order revenue')}
          badge={t('Sales')}
          tone={summary.revenueQar > 0 ? 'success' : 'neutral'}
          trend={revenueSeries.day.map((point) => point.revenueQar)}
          chart="bar"
          icon={BadgeDollarSign}
        />
        <MetricCard
          label={t('Orders count')}
          value={formatNumber(summary.totalOrders, locale)}
          hint={`${formatNumber(summary.paidOrders, locale)} ${t('paid')}`}
          badge={t('Orders')}
          tone={summary.totalOrders > 0 ? 'info' : 'neutral'}
          trend={revenueSeries.day.map((point) => point.ordersCount)}
          chart="bar"
          icon={ShoppingBag}
        />
        <MetricCard
          label={t('Average order value')}
          value={`${currency} ${formatNumber(summary.averageOrderQar, locale)}`}
          hint={t('Paid orders only')}
          badge={t('AOV')}
          tone="premium"
          trend={revenueSeries.week.map((point) => point.revenueQar)}
          icon={Gauge}
        />
        <MetricCard
          label={t('Product conversion')}
          value={formatPercent(productConversion, locale)}
          hint={t('Orders divided by product views')}
          badge={t('Products')}
          tone={productConversion > 0 ? 'success' : 'neutral'}
          trend={productViewSeries.map((point) => point.n)}
          icon={Gauge}
        />
        <MetricCard
          label={t('Total visitors')}
          value={formatNumber(visitorMix.totalVisitors, locale)}
          hint={t('Storefront visits')}
          badge={t('Traffic')}
          tone="info"
          trend={pageViewSeries.map((point) => point.n)}
          icon={Eye}
        />
        <MetricCard
          label={t('Unique visitors')}
          value={formatNumber(visitorMix.uniqueVisitors, locale)}
          hint={`${formatNumber(visitorMix.returningVisitors, locale)} ${t('returning')}`}
          badge={t('Audience')}
          tone="neutral"
          trend={pageViewSeries.map((point) => point.n)}
          icon={Users}
        />
        <MetricCard
          label={t('Add-to-cart events')}
          value={formatNumber(cartAdds30, locale)}
          hint={t('Purchase intent')}
          badge={t('Cart')}
          tone={cartAdds30 > 0 ? 'warning' : 'neutral'}
          trend={revenueSeries.day.map((point) => point.ordersCount)}
          chart="bar"
          icon={ShoppingCart}
        />
        <MetricCard
          label={t('Live visitors')}
          value={formatNumber(realtime.liveVisitors, locale)}
          hint={`${formatNumber(realtime.activeCarts, locale)} ${t('active carts')}`}
          badge={t('Live')}
          tone={realtime.liveVisitors > 0 ? 'success' : 'neutral'}
          icon={Activity}
        />
      </section>

      <RevenueByPeriodCard currency={currency} locale={locale} series={revenueSeries} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SalesLeaderboardCard
          rows={topSales}
          currency={currency}
          title={t('Top-selling products')}
          subtitle={t('Purchases per product from active checkout orders.')}
          empty={t('No product purchases yet. Paid and active checkout orders will build this leaderboard.')}
          ctaHref={`/account/products?store=${encodeURIComponent(slug)}`}
          ctaLabel={t('Manage catalogue')}
          ordersLabel={t('orders')}
        />
        <ProductViewsCard topProducts={topProducts} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <BreakdownCard title={t('Device breakdown')} rows={devices} empty={t('No device data yet.')} locale={locale} />
        <BreakdownCard title={t('Browser breakdown')} rows={browsers} empty={t('No browser data yet.')} locale={locale} />
        <TrafficSourcesCard rows={topReferrers} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <OrderHealthCard summary={summary} locale={locale} />
        <SearchAndLiveCard
          currency={currency}
          locale={locale}
          orderFeed={orderFeed}
          search={search}
          slug={slug}
          realtime={realtime}
        />
      </section>
    </section>
  );
}

function RevenueByPeriodCard({
  currency,
  locale,
  series,
}: {
  currency: string;
  locale?: string;
  series: Record<'day' | 'week' | 'month' | 'year', RevenueSeriesPoint[]>;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const tabs = [
    { id: 'day', label: t('Day'), points: series.day },
    { id: 'week', label: t('Week'), points: series.week },
    { id: 'month', label: t('Month'), points: series.month },
    { id: 'year', label: t('Year'), points: series.year },
  ] as const;

  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border px-5 py-4">
        <div>
          <CardTitle>{t('Revenue by period')}</CardTitle>
          <CardDescription>{t('Daily, weekly, monthly, and yearly revenue views for the store.')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <Tabs defaultValue="day">
          <TabsList className="mb-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => {
            const total = tab.points.reduce((sum, point) => sum + point.revenueQar, 0);
            const orders = tab.points.reduce((sum, point) => sum + point.ordersCount, 0);
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
                  <div className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {tab.label}
                    </p>
                    <p className="m-0 mt-3 text-3xl font-semibold tabular-nums text-foreground">
                      {currency} {formatNumber(total, locale)}
                    </p>
                    <p className="m-0 mt-2 text-sm text-muted-foreground">
                      {formatNumber(orders, locale)} {t('orders')}
                    </p>
                  </div>
                  <div className="h-40 rounded-md border border-border bg-muted/20 p-3">
                    <Sparkline
                      data={tab.points.map((point) => point.revenueQar)}
                      width={640}
                      height={136}
                      accent="var(--admin-accent)"
                      ariaLabel={`${tab.label} revenue`}
                    />
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ProductViewsCard({ topProducts, locale }: { topProducts: TopProduct[]; locale?: string }) {
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle>{t('Product page views')}</CardTitle>
        <CardDescription>{t('Which products shoppers inspect before buying.')}</CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {topProducts.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">{t('No product views yet.')}</p>
        ) : (
          <MetricList
            rows={topProducts.map((product) => ({
              label: product.title ?? product.productId,
              value: product.views,
            }))}
            locale={locale}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
  empty,
  locale,
}: {
  title: string;
  rows: BreakdownRow[];
  empty: string;
  locale?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {rows.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <MetricList rows={rows.map((row) => ({ label: row.label, value: row.count }))} locale={locale} />
        )}
      </CardContent>
    </Card>
  );
}

function TrafficSourcesCard({ rows, locale }: { rows: TopReferrer[]; locale?: string }) {
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">{t('Traffic sources')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {rows.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">{t('No traffic sources yet.')}</p>
        ) : (
          <MetricList rows={rows.map((row) => ({ label: row.host, value: row.count }))} locale={locale} />
        )}
      </CardContent>
    </Card>
  );
}

function OrderHealthCard({ summary, locale }: { summary: OrderAnalyticsSummary; locale?: string }) {
  const t = (text: string) => adminPhrase(locale, text);
  const rows = [
    { label: t('Pending orders'), value: summary.pendingOrders },
    { label: t('Fulfilled orders'), value: summary.fulfilledOrders },
    { label: t('Delivered orders'), value: summary.deliveredOrders },
    { label: t('Cancelled orders'), value: summary.cancelledOrders },
    { label: t('Refund requests'), value: summary.refundRequests },
    { label: t('Unpaid orders'), value: summary.unpaidOrders },
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle>{t('Order status analytics')}</CardTitle>
        <CardDescription>{t('Spot pending, fulfilled, delivered, cancelled, refunded, and unpaid orders.')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 py-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <Badge variant="outline" className="font-mono tabular-nums">
                {formatNumber(row.value, locale)}
              </Badge>
            </div>
            <Progress
              value={Math.max(row.value > 0 ? 4 : 0, (row.value / max) * 100)}
              className="h-1.5 bg-background [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SearchAndLiveCard({
  currency,
  locale,
  orderFeed,
  realtime,
  search,
  slug,
}: {
  currency: string;
  locale?: string;
  orderFeed: RealtimeOrderFeedItem[];
  realtime: { liveVisitors: number; activeCarts: number };
  search: SearchAnalytics;
  slug: string;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="border-b border-border px-5 py-4">
        <div>
          <CardTitle>{t('Search and live activity')}</CardTitle>
          <CardDescription>{t('Track what shoppers search for and what is happening right now.')}</CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline" className="bg-card">
            {formatNumber(realtime.liveVisitors, locale)} {t('live')}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 py-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <h3 className="m-0 text-sm font-semibold text-foreground">{t('Most searched keywords')}</h3>
          </div>
          {search.topKeywords.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{t('No storefront searches yet.')}</p>
          ) : (
            <MetricList
              rows={search.topKeywords.map((row) => ({ label: row.keyword, value: row.count }))}
              locale={locale}
            />
          )}
          <Separator className="my-4" />
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
            <span className="text-sm text-muted-foreground">{t('Searches with no results')}</span>
            <Badge variant="outline" className="font-mono tabular-nums">
              {formatNumber(search.noResultSearches, locale)}
            </Badge>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-foreground">{t('Real-time order feed')}</h3>
            <Badge variant="outline">
              {formatNumber(realtime.activeCarts, locale)} {t('active carts')}
            </Badge>
          </div>
          {orderFeed.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{t('No orders yet.')}</p>
          ) : (
            <div className="grid gap-3">
              {orderFeed.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
                  <div className="min-w-0">
                    <Link
                      href={`/account/orders?store=${encodeURIComponent(slug)}`}
                      className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      #{order.displayCode}
                    </Link>
                    <p className="m-0 mt-1 truncate text-xs text-muted-foreground">
                      {order.customerName} · {order.orderStatus.replace(/_/gu, ' ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono tabular-nums">
                    {currency} {formatNumber(order.totalQar, locale)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricList({
  rows,
  locale,
}: {
  rows: Array<{ label: string; value: number }>;
  locale?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {formatNumber(row.value, locale)}
            </span>
          </div>
          <Progress
            value={(row.value / max) * 100}
            className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
          />
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: number, locale?: string): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US', { maximumFractionDigits: 0 });
}

function formatPercent(value: number, locale?: string): string {
  return `${value.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  })}%`;
}
