import type { LucideIcon } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MiniBarChart } from '@/components/admin/charts/MiniBarChart';
import { Sparkline } from '@/components/admin/charts/Sparkline';
import { cn } from '@/lib/utils';

export type AnalyticsMetricTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'premium';

const TONE_ACCENT: Record<AnalyticsMetricTone, string> = {
  neutral: 'var(--admin-accent)',
  success: '#2f9e6d',
  warning: '#c9a961',
  critical: 'var(--color-maroon)',
  info: '#3b82f6',
  premium: 'var(--color-gold-deep)',
};

const TONE_BADGE: Record<AnalyticsMetricTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  premium: 'border-[color:color-mix(in_srgb,var(--color-gold-deep)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--color-gold)_18%,transparent)] text-[color:var(--color-maroon)]',
};

export function MetricCard({
  label,
  value,
  hint,
  badge,
  tone = 'neutral',
  trend,
  chart = 'sparkline',
  icon: Icon = BarChart3,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  badge?: string;
  tone?: AnalyticsMetricTone;
  trend?: number[];
  chart?: 'sparkline' | 'bar';
  icon?: LucideIcon;
  className?: string;
}) {
  const accent = TONE_ACCENT[tone];
  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/80 bg-card/92 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/18 hover:shadow-[var(--shadow-card)]',
        className,
      )}
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
          {badge ? (
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
