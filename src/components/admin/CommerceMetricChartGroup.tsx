'use client';

import * as React from 'react';
import {
  AlertCircle,
  CreditCard,
  Gauge,
  Layers2,
  LineChart,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DitheredPixelGraph } from '@/components/admin/charts/DitheredPixelGraph';
import { Sparkline } from '@/components/admin/charts/Sparkline';
import { cn } from '@/lib/utils';

export type CommerceChartMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  badge?: string;
  tone: 'success' | 'info' | 'warning' | 'critical' | 'neutral';
  format: 'currency' | 'number' | 'percent';
  series: number[];
  previousSeries: number[];
  icon: 'receipt' | 'gauge' | 'bag' | 'card' | 'alert' | 'cart';
};

type Props = {
  locale: 'en' | 'ar';
  currency: string;
  title: string;
  subtitle: string;
  currentLabel: string;
  previousLabel: string;
  lineLabel: string;
  ditherLabel: string;
  selectLabel: string;
  metrics: CommerceChartMetric[];
};

type ChartPoint = {
  label: string;
  current: number;
  previous: number;
};

const ICONS: Record<CommerceChartMetric['icon'], LucideIcon> = {
  receipt: ReceiptText,
  gauge: Gauge,
  bag: ShoppingBag,
  card: CreditCard,
  alert: AlertCircle,
  cart: ShoppingCart,
};

export function CommerceMetricChartGroup({
  locale,
  currency,
  title,
  subtitle,
  currentLabel,
  previousLabel,
  lineLabel,
  ditherLabel,
  selectLabel,
  metrics,
}: Props) {
  const [activeId, setActiveId] = React.useState(metrics[0]?.id ?? '');
  const [view, setView] = React.useState<'line' | 'dither'>('line');
  const activeMetric = metrics.find((metric) => metric.id === activeId) ?? metrics[0];
  const isRtl = locale === 'ar';
  const gradientId = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    if (!metrics.some((metric) => metric.id === activeId)) {
      setActiveId(metrics[0]?.id ?? '');
    }
  }, [activeId, metrics]);

  const chartData = React.useMemo(
    () => buildChartData(activeMetric?.series ?? [], activeMetric?.previousSeries ?? []),
    [activeMetric?.previousSeries, activeMetric?.series],
  );

  if (!activeMetric) return null;

  const activeAccent = accentForTone(activeMetric.tone);
  const activeStyle = {
    '--metric-accent': activeAccent,
    '--metric-chart-bg': 'var(--surface-elevated, var(--card))',
    '--metric-chart-panel': 'var(--surface-overlay, var(--card))',
    '--metric-chart-sunken': 'var(--surface-sunken, var(--muted))',
    '--metric-chart-ink': 'var(--ink-strong, var(--foreground))',
    '--metric-chart-muted': 'var(--ink-muted, var(--muted-foreground))',
    '--metric-chart-faint': 'var(--ink-faint, var(--muted-foreground))',
    '--metric-tooltip-bg': 'var(--popover, var(--surface-overlay))',
    '--metric-tooltip-ink': 'var(--popover-foreground, var(--ink-strong))',
  } as React.CSSProperties;
  const curveType = 'monotone' as const;

  return (
    <section
      className="souqna-dashboard-card souqna-commerce-chart-group border p-4 text-[color:var(--metric-chart-ink)] shadow-[var(--dash-shadow)] sm:p-5 lg:p-6"
      dir="ltr"
      style={{
        ...activeStyle,
        borderColor:
          'color-mix(in srgb, var(--metric-accent) 24%, var(--surface-rule-strong, var(--border)))',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--metric-chart-bg) 92%, var(--metric-accent) 8%), color-mix(in srgb, var(--metric-chart-panel) 90%, var(--metric-accent) 10%))',
      }}
    >
      <div
        className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[color:color-mix(in_srgb,var(--metric-accent)_78%,var(--metric-chart-ink))]">
            {selectLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[color:var(--metric-chart-ink)] md:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--metric-chart-muted)] md:text-base">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-chart-ink)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-chart-ink)_7%,transparent)] p-1">
          <button
            type="button"
            onClick={() => setView('line')}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[calc(var(--dash-radius)-2px)] px-3 text-sm font-semibold transition',
              view === 'line'
                ? 'bg-[color:var(--metric-chart-ink)] text-[color:var(--metric-chart-bg)] shadow-sm'
                : 'text-[color:var(--metric-chart-muted)] hover:text-[color:var(--metric-chart-ink)]',
            )}
            aria-pressed={view === 'line'}
          >
            <LineChart className="size-4" aria-hidden />
            {lineLabel}
          </button>
          <button
            type="button"
            onClick={() => setView('dither')}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-[calc(var(--dash-radius)-2px)] px-3 text-sm font-semibold transition',
              view === 'dither'
                ? 'bg-[color:var(--metric-chart-ink)] text-[color:var(--metric-chart-bg)] shadow-sm'
                : 'text-[color:var(--metric-chart-muted)] hover:text-[color:var(--metric-chart-ink)]',
            )}
            aria-pressed={view === 'dither'}
          >
            <Layers2 className="size-4" aria-hidden />
            {ditherLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="min-h-[430px] rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-chart-ink)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-chart-panel)_84%,var(--metric-chart-sunken))] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--metric-chart-ink)_7%,transparent)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div dir={isRtl ? 'rtl' : 'ltr'}>
              <p className="text-sm font-medium text-[color:var(--metric-chart-muted)]">
                {activeMetric.label}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span
                  className="text-4xl font-semibold leading-none text-[color:var(--metric-chart-ink)] md:text-5xl"
                  dir="ltr"
                >
                  {activeMetric.value}
                </span>
                <DeltaBadge metric={activeMetric} />
                {activeMetric.badge ? <StatusChip label={activeMetric.badge} /> : null}
              </div>
              <p className="mt-2 text-sm text-[color:var(--metric-chart-muted)]">
                {activeMetric.hint}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-[color:var(--metric-chart-muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-8 rounded-full bg-[color:var(--metric-accent)]" />
                {currentLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-8 rounded-full border-t border-dashed border-[color:var(--metric-chart-faint)]" />
                {previousLabel}
              </span>
            </div>
          </div>

          <div className="h-[320px] min-h-0" dir="ltr">
            {view === 'line' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 16, right: 14, bottom: 8, left: 2 }}>
                  <defs>
                    <linearGradient id={`${gradientId}-current`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--metric-accent)" stopOpacity={0.4} />
                      <stop offset="62%" stopColor="var(--metric-accent)" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="var(--metric-accent)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="color-mix(in srgb, var(--metric-chart-ink) 12%, transparent)"
                    strokeDasharray="5 9"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={14}
                    minTickGap={30}
                    stroke="var(--metric-chart-faint)"
                    tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <RechartsTooltip
                    cursor={{
                      stroke: 'color-mix(in srgb, var(--metric-accent) 58%, transparent)',
                      strokeDasharray: '5 5',
                    }}
                    content={
                      <MetricTooltip
                        metric={activeMetric}
                        currency={currency}
                        currentLabel={currentLabel}
                        previousLabel={previousLabel}
                      />
                    }
                  />
                  <Line
                    type={curveType}
                    dataKey="previous"
                    dot={false}
                    activeDot={false}
                    stroke="var(--metric-chart-faint)"
                    strokeWidth={2}
                    strokeDasharray="5 7"
                  />
                  <Area
                    type={curveType}
                    dataKey="current"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--metric-accent)' }}
                    stroke="var(--metric-accent)"
                    strokeWidth={3}
                    fill={`url(#${gradientId}-current)`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <DitheredPixelGraph
                ariaLabel={`${activeMetric.label} ${currentLabel}`}
                className="h-full rounded-[calc(var(--dash-radius)-2px)]"
                density="normal"
                padding={28}
                showGrid
                showPoints={false}
                series={[
                  {
                    data: activeMetric.previousSeries,
                    color: 'var(--metric-chart-faint)',
                    label: previousLabel,
                    fill: true,
                    dashed: true,
                    pattern: 'hatch',
                  },
                  {
                    data: activeMetric.series,
                    color: 'var(--metric-accent)',
                    label: currentLabel,
                    fill: true,
                    pattern: 'dots',
                  },
                ]}
              />
            )}
          </div>
        </div>

        <div className="grid auto-rows-fr gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
          {metrics.map((metric) => {
            const Icon = ICONS[metric.icon];
            const selected = metric.id === activeMetric.id;
            const accent = accentForTone(metric.tone);
            const style = {
              '--metric-accent': accent,
              background: selected
                ? 'color-mix(in srgb, var(--metric-accent) 12%, transparent)'
                : 'color-mix(in srgb, var(--metric-chart-ink) 4%, transparent)',
              borderColor: selected
                ? 'color-mix(in srgb, var(--metric-accent) 76%, transparent)'
                : 'color-mix(in srgb, var(--metric-chart-ink) 10%, transparent)',
            } as React.CSSProperties;

            return (
              <button
                key={metric.id}
                type="button"
                onClick={() => setActiveId(metric.id)}
                className="group min-h-[112px] rounded-[var(--dash-radius)] border p-3 text-start transition hover:border-[color:color-mix(in_srgb,var(--metric-accent)_58%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--metric-accent)]"
                style={style}
                aria-pressed={selected}
              >
                <div className="flex h-full items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--metric-chart-muted)]">
                        <Icon className="size-4 text-[color:var(--metric-accent)]" aria-hidden />
                        {metric.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {metric.badge ? <StatusChip label={metric.badge} small /> : null}
                        <DeltaBadge metric={metric} small />
                      </span>
                    </div>
                    <span
                      className="truncate text-2xl font-semibold leading-none text-[color:var(--metric-chart-ink)]"
                      dir="ltr"
                    >
                      {metric.value}
                    </span>
                    <span className="line-clamp-1 text-xs text-[color:var(--metric-chart-faint)]">
                      {metric.hint}
                    </span>
                  </div>
                  <div className="h-14 w-24 shrink-0 overflow-hidden opacity-75 transition group-hover:opacity-100">
                    <Sparkline
                      data={metric.series}
                      width={112}
                      height={56}
                      fluid
                      variant="line"
                      accent={accent}
                      ariaLabel={`${metric.label} trend`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricTooltip({
  active,
  payload,
  label,
  metric,
  currency,
  currentLabel,
  previousLabel,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
  label?: string | number;
  metric: CommerceChartMetric;
  currency: string;
  currentLabel: string;
  previousLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((item) => item.dataKey === 'current')?.value ?? 0;
  const previous = payload.find((item) => item.dataKey === 'previous')?.value ?? 0;

  return (
    <div className="rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_12%,transparent)] bg-[color:var(--metric-tooltip-bg)] px-3 py-2 text-xs shadow-lg">
      <p className="font-mono uppercase tracking-[0.18em] text-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_56%,transparent)]">
        Day {label}
      </p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-6 text-[color:var(--metric-tooltip-ink)]">
          <span>{currentLabel}</span>
          <span className="font-semibold" dir="ltr">
            {formatMetricValue(current, metric, currency)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-6 text-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_58%,transparent)]">
          <span>{previousLabel}</span>
          <span className="font-semibold" dir="ltr">
            {formatMetricValue(previous, metric, currency)}
          </span>
        </p>
      </div>
    </div>
  );
}

function DeltaBadge({ metric, small = false }: { metric: CommerceChartMetric; small?: boolean }) {
  const delta = metricDelta(metric);
  const favorable = metric.tone === 'critical' ? delta <= 0 : delta >= 0;
  const color =
    Math.abs(delta) < 0.01
      ? 'var(--metric-chart-muted)'
      : favorable
        ? 'var(--chart-success)'
        : 'var(--chart-danger)';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border font-mono font-semibold leading-none',
        small ? 'px-1.5 py-1 text-[0.62rem]' : 'px-2.5 py-1.5 text-xs',
      )}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
      dir="ltr"
    >
      {formatDelta(delta)}
    </span>
  );
}

function StatusChip({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full border border-[color:color-mix(in_srgb,var(--metric-accent)_36%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-accent)_12%,transparent)] font-mono font-semibold uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--metric-accent)_82%,var(--metric-chart-ink))]',
        small ? 'px-1.5 py-1 text-[0.56rem]' : 'px-2.5 py-1.5 text-[0.62rem]',
      )}
    >
      {label}
    </span>
  );
}

function buildChartData(current: number[], previous: number[]): ChartPoint[] {
  const length = Math.max(current.length, previous.length, 2);
  const currentSeries = normalizeSeries(current, length);
  const previousSeries = normalizeSeries(previous, length);

  return Array.from({ length }, (_, index) => ({
    label: String(index + 1),
    current: currentSeries[index] ?? 0,
    previous: previousSeries[index] ?? 0,
  }));
}

function normalizeSeries(values: number[], length: number): number[] {
  const fallback = values.length === 0 ? [0] : values;
  return Array.from({ length }, (_, index) =>
    Math.max(0, fallback[index] ?? fallback[fallback.length - 1] ?? 0),
  );
}

function metricDelta(metric: CommerceChartMetric): number {
  const current = lastValue(metric.series);
  const previous = lastValue(metric.previousSeries);
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function lastValue(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(0, values[values.length - 1] ?? 0);
}

function formatDelta(value: number): string {
  const abs = Math.abs(value);
  const formatted = Intl.NumberFormat('en-US', {
    maximumFractionDigits: abs > 0 && abs < 10 ? 1 : 0,
  }).format(abs);
  const arrow = value >= 0 ? '▲' : '▼';
  return `${formatted}% ${arrow}`;
}

function formatMetricValue(value: number, metric: CommerceChartMetric, currency: string): string {
  const safeValue = Math.max(0, value);
  if (metric.format === 'currency') {
    return `${currency} ${Intl.NumberFormat('en-US').format(Math.round(safeValue))}`;
  }
  if (metric.format === 'percent') {
    return `${Intl.NumberFormat('en-US', {
      maximumFractionDigits: safeValue > 0 && safeValue < 10 ? 1 : 0,
    }).format(safeValue)}%`;
  }
  return Intl.NumberFormat('en-US').format(Math.round(safeValue));
}

function accentForTone(tone: CommerceChartMetric['tone']): string {
  if (tone === 'critical') return 'var(--chart-danger)';
  if (tone === 'success') {
    return 'color-mix(in srgb, var(--chart-success) 76%, var(--admin-accent) 24%)';
  }
  if (tone === 'info') return 'var(--chart-primary)';
  if (tone === 'warning') return 'var(--chart-primary)';
  return 'var(--chart-secondary, var(--chart-ink))';
}
