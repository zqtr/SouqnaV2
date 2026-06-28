import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { adminPhrase } from '@/components/admin/adminLocale';

export function FunnelAnalytics({
  counts,
  locale,
}: {
  counts: Record<'pageViews' | 'productViews' | 'cartAdds' | 'orders' | 'inquiries', number>;
  locale?: string;
}) {
  const t = (text: string) => adminPhrase(locale, text);
  const rows = [
    { label: t('Store visits'), value: counts.pageViews },
    { label: t('Product views'), value: counts.productViews },
    { label: t('Added to cart'), value: counts.cartAdds },
    { label: t('Orders placed'), value: counts.orders },
    { label: t('Inquiries sent'), value: counts.inquiries },
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-5 py-4">
        <CardTitle>{t('Full conversion funnel')}</CardTitle>
        <CardDescription>
          {t('See where shoppers move forward and where attention drops before checkout.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 pb-5">
        {rows.map((row, index) => {
          const previous = index > 0 ? rows[index - 1]?.value ?? 0 : row.value;
          const retained = previous > 0 ? (row.value / previous) * 100 : 0;
          const dropOff = index > 0 ? Math.max(0, 100 - retained) : 0;
          return (
            <div key={row.label} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{row.label}</span>
                <div className="flex items-center gap-2">
                  {index > 0 ? (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {formatPercent(dropOff, locale)} {t('drop-off')}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {formatNumber(row.value, locale)}
                  </Badge>
                </div>
              </div>
              <Progress
                value={Math.max(row.value > 0 ? 4 : 0, (row.value / max) * 100)}
                className="h-2 bg-background [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
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
