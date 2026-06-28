import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { adminPhrase } from '@/components/admin/adminLocale';
import type { TopReferrer } from '@/lib/analytics';
import type { PaymentMethodPerformance } from '@/lib/checkout-orders';

export function MarketingAnalytics({
  locale,
  paymentMethods,
  referrers,
}: {
  locale?: string;
  paymentMethods: PaymentMethodPerformance[];
  referrers: TopReferrer[];
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const maxReferrers = Math.max(...referrers.map((row) => row.count), 1);

  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-5 py-4">
        <CardTitle>{t('Marketing and payment performance')}</CardTitle>
        <CardDescription>
          {t('Connect traffic quality, campaigns, influencer codes, and payment success in one place.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-foreground">{t('Traffic sources')}</h3>
            <Badge variant="outline">{t('Attribution')}</Badge>
          </div>
          {referrers.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{t('No traffic sources yet.')}</p>
          ) : (
            <div className="grid gap-3">
              {referrers.map((row) => (
                <div key={row.host} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">{row.host}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {formatNumber(row.count, locale)}
                    </span>
                  </div>
                  <Progress
                    value={(row.count / maxReferrers) * 100}
                    className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-foreground">{t('Payment provider performance')}</h3>
            <Badge variant="outline">{t('Checkout')}</Badge>
          </div>
          {paymentMethods.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{t('No payment performance yet.')}</p>
          ) : (
            <div className="grid gap-3">
              {paymentMethods.map((method, index) => (
                <div key={method.provider}>
                  {index > 0 ? <Separator className="mb-3" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-medium text-foreground">{paymentProviderLabel(method.provider)}</p>
                      <p className="m-0 mt-1 text-xs text-muted-foreground">
                        {formatNumber(method.paidOrders, locale)} {t('paid')} ·{' '}
                        {formatNumber(method.failedOrders, locale)} {t('failed')}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono tabular-nums">
                      {formatPercent(method.successRate, locale)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function paymentProviderLabel(provider: string): string {
  return provider
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNumber(value: number, locale?: string): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US', { maximumFractionDigits: 0 });
}

function formatPercent(value: number, locale?: string): string {
  return `${value.toLocaleString(locale === 'ar' ? 'ar-QA' : 'en-US', {
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  })}%`;
}
