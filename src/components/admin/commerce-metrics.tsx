import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Reveal } from '@/components/motion/Reveal';
import { Sparkline } from '@/components/admin/charts/Sparkline';
import type { TopProductByOrders } from '@/lib/products';

type MetricTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info';

const TONE_ACCENT: Record<MetricTone, string> = {
  neutral: 'var(--chart-secondary)',
  success: 'var(--chart-success)',
  warning: 'var(--dash-important)',
  critical: 'var(--chart-danger)',
  info: 'var(--chart-primary)',
};

const TONE_BADGE_STYLE: Record<MetricTone, CSSProperties> = {
  neutral: {
    borderColor: 'var(--dash-rule-strong)',
    background: 'color-mix(in srgb, var(--chart-secondary) 5%, transparent)',
    color: 'var(--dash-ink-muted)',
  },
  success: {
    borderColor: 'color-mix(in srgb, var(--chart-success) 32%, transparent)',
    background: 'var(--dash-green-soft)',
    color: 'var(--chart-success)',
  },
  warning: {
    borderColor: 'color-mix(in srgb, var(--dash-important) 42%, transparent)',
    background: 'var(--dash-important-soft)',
    color: 'var(--dash-black)',
  },
  critical: {
    borderColor: 'color-mix(in srgb, var(--chart-danger) 40%, transparent)',
    background: 'var(--dash-red-soft)',
    color: 'var(--chart-danger)',
  },
  info: {
    borderColor: 'color-mix(in srgb, var(--chart-primary) 36%, transparent)',
    background: 'color-mix(in srgb, var(--chart-primary) 16%, transparent)',
    color: 'var(--chart-primary)',
  },
};

export function CommerceMetricGrid({ children }: { children: ReactNode }) {
  return (
    <Reveal y={14}>
      <section className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </section>
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
      className="souqna-metric-card group relative flex h-[224px] overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/18 hover:shadow-[var(--shadow-card)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, var(--surface-overlay)) 0%, var(--card) 100%)',
      }}
    >
      <CardHeader className="gap-4 px-5 pt-5 pb-2">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-lg border"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
                background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                color: accent,
              }}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <CardTitle className="min-w-0 truncate font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </CardTitle>
          </div>
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${label} details`}
                  >
                    <Info className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : badge ? (
            <Badge
              variant="outline"
              className="shrink-0 px-3 py-1 text-sm"
              style={TONE_BADGE_STYLE[tone]}
            >
              {badge}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 px-5 pb-5">
        <div className="flex w-full items-end justify-between gap-5">
          <div className="min-w-0 self-stretch">
            <div className="text-[2.45rem] font-semibold leading-[1.05] tracking-tight text-foreground tabular-nums">
              {value}
            </div>
            <CardDescription
              className="mt-2 text-base leading-5"
              style={{
                minHeight: '2.5rem',
                maxHeight: '2.5rem',
                overflowWrap: 'normal',
                wordBreak: 'normal',
                hyphens: 'none',
              }}
            >
              {hint ?? ''}
            </CardDescription>
          </div>
          {trend && trend.length > 0 ? (
            <div className="h-16 w-36 shrink-0 opacity-75 transition-opacity group-hover:opacity-95">
              <Sparkline
                data={trend}
                width={144}
                height={64}
                accent={accent}
                ariaLabel={`${label} ${chart === 'bar' ? 'smooth ' : ''}trend`}
              />
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
      <Card className="souqna-dashboard-card overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm">
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
                      className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
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
    <Card className="souqna-dashboard-card border-border/80 bg-card/92 py-0 shadow-sm">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" style={TONE_BADGE_STYLE[tone]}>
            {value}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Progress
          value={Math.max(0, Math.min(100, progress))}
          className="h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--chart-primary)]"
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
