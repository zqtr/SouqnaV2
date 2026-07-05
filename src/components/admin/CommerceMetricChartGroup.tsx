'use client';

import * as React from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  Gauge,
  Layers2,
  LineChart,
  Minus,
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
import {
  DitheredPixelGraph,
  type DitheredPixelGraphSeries,
} from '@/components/admin/charts/DitheredPixelGraph';
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

/* ── Recording / replay support ─────────────────────────────────────────
   Count-up numbers and a staggered entrance so the dashboard can be
   screen-recorded cleanly. Everything replays when the surrounding subtree
   is remounted via a key. Honors prefers-reduced-motion. */

const RECORDING_STYLES = `
  @media (prefers-reduced-motion: no-preference) {
    .souqna-rec-fade {
      animation: souqnaRecFade 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .souqna-rec-stagger > * {
      animation: souqnaRecFade 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .souqna-rec-stagger > *:nth-child(1) { animation-delay: 140ms; }
    .souqna-rec-stagger > *:nth-child(2) { animation-delay: 220ms; }
    .souqna-rec-stagger > *:nth-child(3) { animation-delay: 300ms; }
    .souqna-rec-stagger > *:nth-child(4) { animation-delay: 380ms; }
    .souqna-rec-stagger > *:nth-child(5) { animation-delay: 460ms; }
    .souqna-rec-stagger > *:nth-child(6) { animation-delay: 540ms; }
    .souqna-rec-stagger > *:nth-child(7) { animation-delay: 620ms; }
  }
  @keyframes souqnaRecFade {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
`;

const AR_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const FA_INDIC = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const NUM_TOKEN = /[\d٠-٩۰-۹][\d٠-٩۰-۹.,٫٬]*/;

function toLatinDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function scriptOf(token: string): 'latin' | 'arab' | 'pers' {
  if (/[٠-٩]/.test(token)) return 'arab';
  if (/[۰-۹]/.test(token)) return 'pers';
  return 'latin';
}

function toScript(latin: string, script: 'latin' | 'arab' | 'pers'): string {
  if (script === 'arab') return latin.replace(/\d/g, (d) => AR_INDIC[Number(d)] ?? d);
  if (script === 'pers') return latin.replace(/\d/g, (d) => FA_INDIC[Number(d)] ?? d);
  return latin;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Animates the first numeric token in `text` from 0 to its value while
 *  preserving currency symbols, %, arrows, and digit script. Replays on
 *  mount (remount the subtree to replay) and whenever `text` changes. */
function CountUpText({ text, duration = 1200 }: { text: string; duration?: number }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = React.useState(text);

  React.useEffect(() => {
    const match = text.match(NUM_TOKEN);
    if (!match) {
      setDisplay(text);
      return;
    }
    const token = match[0];
    const script = scriptOf(token);
    const normalized = toLatinDigits(token).replace(/[,٬]/g, '').replace(/٫/g, '.');
    const target = Number(normalized);
    if (!Number.isFinite(target) || reduced) {
      setDisplay(text);
      return;
    }
    const decimals = normalized.includes('.') ? (normalized.split('.')[1]?.length ?? 0) : 0;
    const fmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const formatted = toScript(fmt.format(target * eased), script);
      setDisplay(text.replace(token, formatted));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, reduced]);

  return <>{display}</>;
}

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
  const [replayKey, setReplayKey] = React.useState(0);
  const [ditherHover, setDitherHover] = React.useState<{
    index: number;
    x: number;
    align: 'start' | 'middle' | 'end';
  } | null>(null);
  React.useEffect(() => {
    setDitherHover(null);
  }, [activeId, view]);

  // Recording shortcut: Cmd/Ctrl + V replays the entrance animation (no visible button).
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'v') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setReplayKey((key) => key + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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

  // Stable identity so hover re-renders never restart the canvas animation.
  const ditherSeries = React.useMemo<DitheredPixelGraphSeries[]>(
    () => [
      {
        data: activeMetric?.previousSeries ?? [],
        color: 'var(--metric-chart-faint)',
        fill: true,
        dashed: true,
        pattern: 'hatch',
      },
      {
        data: activeMetric?.series ?? [],
        color: 'var(--metric-accent)',
        fill: true,
        pattern: 'dots',
      },
    ],
    [activeMetric?.previousSeries, activeMetric?.series, previousLabel, currentLabel],
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
      <style dangerouslySetInnerHTML={{ __html: RECORDING_STYLES }} />
      <div
        className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="min-w-0">
          <p className="text-[0.8rem] font-medium capitalize text-[color:var(--metric-chart-muted)]">
            {selectLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[color:var(--metric-chart-ink)] md:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--metric-chart-muted)] md:text-base">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
          <div className="flex items-center gap-2 rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-chart-ink)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-chart-ink)_7%,transparent)] p-1">
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
      </div>

      <div key={replayKey} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="souqna-rec-fade flex flex-col min-h-[430px] rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-chart-ink)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-chart-panel)_84%,var(--metric-chart-sunken))] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--metric-chart-ink)_7%,transparent)] sm:p-5">
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
                  <CountUpText text={activeMetric.value} />
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

          <div className="flex-1 min-h-0" dir="ltr">
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
                    isAnimationActive
                    animationBegin={140}
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Area
                    type={curveType}
                    dataKey="current"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--metric-accent)' }}
                    stroke="var(--metric-accent)"
                    strokeWidth={3}
                    fill={`url(#${gradientId}-current)`}
                    isAnimationActive
                    animationBegin={140}
                    animationDuration={1300}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="relative h-full">
                <DitheredPixelGraph
                  ariaLabel={`${activeMetric.label} ${currentLabel}`}
                  className="h-full rounded-[calc(var(--dash-radius)-2px)]"
                  density="normal"
                  padding={28}
                  showGrid
                  showPoints={false}
                  onHover={setDitherHover}
                  series={ditherSeries}
                />
                {ditherHover ? (
                  <>
                    <span
                      className="pointer-events-none absolute inset-y-2 z-10 w-px"
                      style={{
                        left: ditherHover.x,
                        background: 'color-mix(in srgb, var(--metric-accent) 42%, transparent)',
                      }}
                    />
                    <div
                      className="pointer-events-none absolute top-2 z-20 whitespace-nowrap"
                      style={{
                        left: ditherHover.x,
                        width: 'max-content',
                        transform:
                          ditherHover.align === 'end'
                            ? 'translateX(calc(-100% - 10px))'
                            : ditherHover.align === 'start'
                              ? 'translateX(10px)'
                              : 'translateX(-50%)',
                      }}
                    >
                      <MetricTooltipCard
                        label={`Day ${ditherHover.index + 1}`}
                        current={activeMetric.series[ditherHover.index] ?? 0}
                        previous={activeMetric.previousSeries[ditherHover.index] ?? 0}
                        metric={activeMetric}
                        currency={currency}
                        currentLabel={currentLabel}
                        previousLabel={previousLabel}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="souqna-rec-stagger grid auto-rows-fr gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
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
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[color:var(--metric-chart-muted)]">
                      <Icon className="size-4 shrink-0 text-[color:var(--metric-accent)]" aria-hidden />
                      <span className="truncate">{metric.label}</span>
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-2xl font-semibold leading-none text-[color:var(--metric-chart-ink)]"
                        dir="ltr"
                      >
                        <CountUpText text={metric.value} />
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {metric.badge ? <StatusChip label={metric.badge} small /> : null}
                        <DeltaBadge metric={metric} small />
                      </span>
                    </div>
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
    <MetricTooltipCard
      label={`Day ${label}`}
      current={current}
      previous={previous}
      metric={metric}
      currency={currency}
      currentLabel={currentLabel}
      previousLabel={previousLabel}
    />
  );
}

function MetricTooltipCard({
  label,
  current,
  previous,
  metric,
  currency,
  currentLabel,
  previousLabel,
}: {
  label: React.ReactNode;
  current: number;
  previous: number;
  metric: CommerceChartMetric;
  currency: string;
  currentLabel: string;
  previousLabel: string;
}) {
  return (
    <div className="min-w-[176px] whitespace-nowrap rounded-[var(--dash-radius)] border border-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_12%,transparent)] bg-[color:var(--metric-tooltip-bg)] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_56%,transparent)]">
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-6 text-[color:var(--metric-tooltip-ink)]">
          <span>{currentLabel}</span>
          <span className="font-semibold tabular-nums" dir="ltr">
            {formatMetricValue(current, metric, currency)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-6 text-[color:color-mix(in_srgb,var(--metric-tooltip-ink)_58%,transparent)]">
          <span>{previousLabel}</span>
          <span className="font-semibold tabular-nums" dir="ltr">
            {formatMetricValue(previous, metric, currency)}
          </span>
        </p>
      </div>
    </div>
  );
}

function DeltaBadge({ metric, small = false }: { metric: CommerceChartMetric; small?: boolean }) {
  const delta = metricDelta(metric);
  const flat = Math.abs(delta) < 0.01;
  const favorable = metric.tone === 'critical' ? delta <= 0 : delta >= 0;
  const color = flat
    ? 'var(--metric-chart-muted)'
    : favorable
      ? 'var(--metric-chart-ink)'
      : 'var(--chart-danger)';
  const Arrow = flat ? Minus : delta > 0 ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold leading-none tabular-nums',
        small ? 'px-1.5 py-1 text-[0.62rem]' : 'px-2.5 py-1.5 text-xs',
      )}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
      dir="ltr"
    >
      <Arrow className={small ? 'size-3' : 'size-3.5'} strokeWidth={2.5} aria-hidden />
      {formatDelta(delta)}
    </span>
  );
}

function StatusChip({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--metric-accent)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--metric-accent)_9%,transparent)] font-medium capitalize leading-none text-[color:color-mix(in_srgb,var(--metric-accent)_76%,var(--metric-chart-ink))]',
        small ? 'px-2 py-1 text-[0.62rem]' : 'px-2.5 py-1.5 text-xs',
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
  return `${formatted}%`;
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
  // Monochrome chart: everything reads in the ink tone. Critical stays red so
  // "needs action" metrics still signal, but nothing is green anymore.
  if (tone === 'critical') return 'var(--chart-danger)';
  return 'var(--metric-chart-ink)';
}
