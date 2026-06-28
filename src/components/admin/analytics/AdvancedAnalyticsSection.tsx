import { Badge } from '@/components/ui/badge';
import { adminPhrase } from '@/components/admin/adminLocale';
import { ADVANCED_ANALYTICS_MODULES } from '@/lib/analytics/features';
import { LockedAnalyticsCard } from './LockedAnalyticsCard';
import { FunnelAnalytics } from './FunnelAnalytics';
import { CustomerAnalytics } from './CustomerAnalytics';
import { MarketingAnalytics } from './MarketingAnalytics';
import { AIInsights } from './AIInsights';
import type { TopReferrer } from '@/lib/analytics';
import type {
  OrderAnalyticsSummary,
  PaymentMethodPerformance,
} from '@/lib/checkout-orders';
import type { InventoryAnalyticsSnapshot } from '@/lib/products';

export function AdvancedAnalyticsSection({
  canAccess,
  currency,
  enterpriseDepth,
  funnel,
  healthScore,
  inventory,
  locale,
  paymentMethods,
  summary,
  topReferrers,
}: {
  canAccess: boolean;
  currency: string;
  enterpriseDepth: boolean;
  funnel: Record<'pageViews' | 'productViews' | 'cartAdds' | 'orders' | 'inquiries', number>;
  healthScore: number;
  inventory: InventoryAnalyticsSnapshot;
  locale?: string;
  paymentMethods: PaymentMethodPerformance[];
  summary: OrderAnalyticsSummary;
  topReferrers: TopReferrer[];
}) {
  const t = (text: string) => adminPhrase(locale, text);

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2 border-[color:color-mix(in_srgb,var(--color-gold-deep)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[color:var(--color-maroon)]">
            {t('Advanced Analytics')}
          </Badge>
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            {t('Growth intelligence')}
          </h2>
          <p className="m-0 mt-1 text-sm text-muted-foreground">
            {t('Funnels, customer value, behavior tracking, attribution, inventory intelligence, and AI forecasting.')}
          </p>
        </div>
        <Badge variant="outline" className="bg-card">
          {canAccess ? (enterpriseDepth ? 'Max+ depth' : 'Pro+ unlocked') : 'Pro+ required'}
        </Badge>
      </div>

      {!canAccess ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADVANCED_ANALYTICS_MODULES.map((module) => (
            <LockedAnalyticsCard
              key={module.id}
              module={module}
              locale={locale}
              ctaLabel={t('Upgrade to Pro+')}
            />
          ))}
        </section>
      ) : (
        <>
          <FunnelAnalytics counts={funnel} locale={locale} />
          <section className="grid gap-4">
            <CustomerAnalytics currency={currency} locale={locale} summary={summary} />
          </section>
          <MarketingAnalytics locale={locale} paymentMethods={paymentMethods} referrers={topReferrers} />
          <AIInsights
            enterpriseDepth={enterpriseDepth}
            healthScore={healthScore}
            inventory={inventory}
            locale={locale}
          />
        </>
      )}
    </section>
  );
}
