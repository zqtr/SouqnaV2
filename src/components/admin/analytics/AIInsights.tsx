import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { adminPhrase } from '@/components/admin/adminLocale';
import type { InventoryAnalyticsSnapshot } from '@/lib/products';

export function AIInsights({
  enterpriseDepth,
  healthScore,
  inventory,
  locale,
}: {
  enterpriseDepth: boolean;
  healthScore: number;
  inventory: InventoryAnalyticsSnapshot;
  locale?: string;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const forecasts = [
    t('Revenue forecasting'),
    t('Sales forecasting'),
    t('Customer churn prediction'),
    t('LTV prediction'),
    t('Inventory forecasting'),
  ];

  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('AI insights and store health')}</CardTitle>
            <CardDescription className="mt-1">
              {t('Forecast demand, spot stock risk, and keep the store moving from one health score.')}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-[color:color-mix(in_srgb,var(--color-gold-deep)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[color:var(--color-maroon)]"
          >
            {enterpriseDepth ? 'Max+' : 'Pro+'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('Store Health Score')}
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-semibold tabular-nums text-foreground">
              {Math.round(healthScore)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">/100</span>
          </div>
          <Progress
            value={healthScore}
            className="mt-4 h-2 bg-background [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
          />
          <p className="m-0 mt-3 text-sm leading-6 text-muted-foreground">
            {t('Score blends revenue activity, conversion, order health, and stock readiness.')}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniInsight label={t('Low stock alerts')} value={formatNumber(inventory.lowStockCount, locale)} />
          <MiniInsight label={t('Out of stock')} value={formatNumber(inventory.outOfStockCount, locale)} />
          <MiniInsight label={t('Overstock detection')} value={formatNumber(inventory.overstockCount, locale)} />
          <MiniInsight label={t('Units on hand')} value={formatNumber(inventory.totalUnitsOnHand, locale)} />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-foreground">{t('Forecasting modules')}</h3>
            <Badge variant="outline">{enterpriseDepth ? t('Enterprise depth') : t('Advanced')}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {forecasts.map((forecast) => (
              <div key={forecast} className="rounded-md border border-border bg-muted/20 p-3">
                <p className="m-0 text-sm font-medium text-foreground">{forecast}</p>
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  {enterpriseDepth ? t('Ready for deeper history') : t('Upgrade path to Max+ depth')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="m-0 truncate text-sm text-muted-foreground">{label}</p>
      <p className="m-0 mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function formatNumber(value: number, locale?: string): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US', { maximumFractionDigits: 0 });
}
