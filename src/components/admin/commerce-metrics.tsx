import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, BarChart3, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Reveal } from '@/components/motion/Reveal';
import { MiniBarChart } from '@/components/admin/charts/MiniBarChart';
import { Sparkline } from '@/components/admin/charts/Sparkline';
import type { TopProductByOrders } from '@/lib/products';
import { cn } from '@/lib/utils';

type MetricTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info';

const TONE_ACCENT: Record<MetricTone, string> = {
  neutral: 'var(--admin-accent)',
  success: '#2f9e6d',
  warning: '#c9a961',
  critical: 'var(--color-maroon)',
  info: '#3b82f6',
};

const TONE_BADGE: Record<MetricTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

export function CommerceMetricGrid({ children }: { children: ReactNode }) {
  return (
    <Reveal y={14}>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</section>
    </Reveal>
  );
}

export function CommerceMetricCard({
  label,
  value,
  hint,
  badge,
  tone = 'neutral',
  trend,
  chart = 'sparkline',
  icon: Icon = BarChart3,
  tooltip,
}: {
  label: string;
  value: string | number;
  hint?: string;
  badge?: string;
  tone?: MetricTone;
  trend?: number[];
  chart?: 'sparkline' | 'bar';
  icon?: LucideIcon;
  tooltip?: string;
}) {
  const accent = TONE_ACCENT[tone];
  return (
    <Card
      className="group relative overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/18 hover:shadow-[var(--shadow-card)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, var(--surface-overlay)) 0%, var(--card) 100%)',
      }}
    >
      <CardHeader className="gap-3 px-4 pt-4 pb-2">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md border text-foreground/80"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
                background: `color-mix(in srgb, ${accent} 10%, transparent)`,
              }}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <CardTitle className="min-w-0 truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </CardTitle>
          </div>
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`${label} details`}>
                    <Info className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : badge ? (
            <Badge variant="outline" className={cn('shrink-0', TONE_BADGE[tone])}>
              {badge}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {value}
            </div>
            {hint ? <CardDescription className="mt-1 truncate">{hint}</CardDescription> : null}
          </div>
          {trend && trend.length > 0 ? (
            <div className="h-12 w-28 shrink-0 opacity-90 transition-opacity group-hover:opacity-100">
              {chart === 'bar' ? (
                <MiniBarChart data={trend} width={112} height={48} accent={accent} ariaLabel={`${label} bar trend`} />
              ) : (
                <Sparkline data={trend} width={112} height={48} accent={accent} ariaLabel={`${label} trend`} />
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesLeaderboardCard({
  rows,
  currency,
  title,
  subtitle,
  empty,
  ctaHref,
  ctaLabel,
  ordersLabel = 'orders',
}: {
  rows: TopProductByOrders[];
  currency: string;
  title: string;
  subtitle: string;
  empty: string;
  ctaHref: string;
  ctaLabel: string;
  ordersLabel?: string;
}) {
  const maxRevenue = Math.max(...rows.map((row) => row.revenueQar), 1);
  return (
    <Reveal y={16}>
      <Card className="overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
        <CardHeader className="border-b border-border px-5 py-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{subtitle}</CardDescription>
          </div>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {rows.length === 0 ? (
            <div className="flex min-h-36 flex-col items-start justify-center gap-3">
              <p className="m-0 max-w-xl text-sm leading-6 text-muted-foreground">{empty}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            </div>
          ) : (
            <ol className="grid gap-3">
              {rows.map((row, index) => {
                const pct = Math.max(4, Math.round((row.revenueQar / maxRevenue) * 100));
                return (
                  <li key={row.product.id} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-muted font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {row.product.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.ordersCount} {ordersLabel}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                        {currency} {formatNumber(row.revenueQar)}
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </Reveal>
  );
}

export function ComparisonSignalCard({
  title,
  value,
  description,
  progress,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  description: string;
  progress: number;
  tone?: MetricTone;
}) {
  return (
    <Card className="border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className={TONE_BADGE[tone]}>
            {value}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Progress
          value={Math.max(0, Math.min(100, progress))}
          className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--admin-accent)]"
        />
        <Separator className="my-3" />
        <p className="m-0 text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number): string {
  return Intl.NumberFormat('en-GB').format(value);
}
