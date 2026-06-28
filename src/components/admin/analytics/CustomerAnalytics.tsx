import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { adminPhrase } from '@/components/admin/adminLocale';
import type { OrderAnalyticsSummary } from '@/lib/checkout-orders';

export function CustomerAnalytics({
  currency,
  locale,
  summary,
}: {
  currency: string;
  locale?: string;
  summary: OrderAnalyticsSummary;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const revenuePerCustomer =
    summary.customerCount > 0 ? summary.revenueQar / summary.customerCount : 0;
  const repeatPurchaseRate =
    summary.customerCount > 0 ? (summary.returningCustomers / summary.customerCount) * 100 : 0;
  const segments = [
    { label: t('VIP customers'), value: summary.paidOrders, hint: t('Paid order relationships') },
    { label: t('Loyal customers'), value: summary.returningCustomers, hint: t('Bought again') },
    { label: t('At-risk customers'), value: 0, hint: t('Needs behavior tracking') },
    { label: t('Churned customers'), value: 0, hint: t('Needs retention history') },
  ];

  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-5 py-4">
        <CardTitle>{t('Customer intelligence')}</CardTitle>
        <CardDescription>
          {t('Understand customer value, repeat buying, and segments worth following up.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label={t('Customer count')} value={formatNumber(summary.customerCount, locale)} />
          <MiniStat
            label={t('Revenue per customer')}
            value={`${currency} ${formatNumber(Math.round(revenuePerCustomer), locale)}`}
          />
          <MiniStat label={t('Repeat purchase rate')} value={formatPercent(repeatPurchaseRate, locale)} />
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3 sm:grid-cols-2">
          {segments.map((segment) => (
            <div key={segment.label} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-medium text-foreground">{segment.label}</p>
                  <p className="m-0 mt-1 truncate text-xs text-muted-foreground">{segment.hint}</p>
                </div>
                <Badge variant="outline" className="font-mono tabular-nums">
                  {formatNumber(segment.value, locale)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('Retention strength')}</span>
            <span>{formatPercent(repeatPurchaseRate, locale)}</span>
          </div>
          <Progress
            value={repeatPurchaseRate}
            className="h-2 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="m-0 mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</p>
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
