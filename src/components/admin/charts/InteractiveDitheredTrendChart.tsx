"use client";

import * as React from 'react';
import { Layers2 } from 'lucide-react';
import { DitheredPixelGraph } from '@/components/admin/charts/DitheredPixelGraph';
import { cn } from '@/lib/utils';

type ChartKey = 'primary' | 'secondary';

type Props = {
  primary: number[];
  secondary: number[];
  primaryLabel: string;
  secondaryLabel: string;
  thirtyDaysAgo: string;
  today: string;
  ariaLabel: string;
};

export function InteractiveDitheredTrendChart({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  thirtyDaysAgo,
  today,
  ariaLabel,
}: Props) {
  const [activeChart, setActiveChart] = React.useState<ChartKey>('primary');
  const [stacked, setStacked] = React.useState(true);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const isRtl = hasRtlText([primaryLabel, secondaryLabel, thirtyDaysAgo, today, ariaLabel]);
  const numberLocale = 'en-US';
  const signalLabel = isRtl ? 'إشارة مرئية' : 'Dither signal';
  const stackedLabel = isRtl ? 'متراكم' : 'stacked';
  const pointLabel = isRtl ? 'النقطة' : 'Point';
  const charts = React.useMemo(
    () => ({
      primary: {
        label: primaryLabel,
        data: primary,
        color: 'var(--chart-primary)',
        total: primary.reduce((sum, value) => sum + value, 0),
      },
      secondary: {
        label: secondaryLabel,
        data: secondary,
        color: 'var(--chart-secondary)',
        total: secondary.reduce((sum, value) => sum + value, 0),
      },
    }),
    [primary, primaryLabel, secondary, secondaryLabel],
  );
  const active = charts[activeChart];
  const inactive = charts[activeChart === 'primary' ? 'secondary' : 'primary'];
  const pointCount = Math.max(primary.length, secondary.length, 1);
  const hoverPct = hoverIndex == null ? 0 : (hoverIndex / Math.max(pointCount - 1, 1)) * 100;
  const hoverPrimary = hoverIndex == null ? null : (primary[hoverIndex] ?? 0);
  const hoverSecondary = hoverIndex == null ? null : (secondary[hoverIndex] ?? 0);
  const graphSeries = React.useMemo(
    () => [
      {
        data: active.data,
        color: active.color,
        label: active.label,
        fill: true,
        pattern: 'dots' as const,
      },
      {
        data: inactive.data,
        color: inactive.color,
        label: inactive.label,
        fill: stacked,
        dashed: true,
        opacity: stacked ? 0.82 : 0.38,
        pattern: 'hatch' as const,
      },
    ],
    [active.color, active.data, active.label, inactive.color, inactive.data, inactive.label, stacked],
  );

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const nextIndex = Math.round((relativeX / Math.max(rect.width, 1)) * Math.max(pointCount - 1, 0));
    setHoverIndex(nextIndex);
  }

  return (
    <div
      className="souqna-dashboard-chart rounded-lg border border-border/80 bg-muted/40"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="grid border-b border-border/80 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {ariaLabel}
          </div>
          <div className="text-xs text-muted-foreground" style={{ unicodeBidi: 'plaintext' }}>
            <bdi dir={isRtl ? 'rtl' : 'ltr'}>{thirtyDaysAgo}</bdi>
            <span aria-hidden> - </span>
            <bdi dir={isRtl ? 'rtl' : 'ltr'}>{today}</bdi>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:min-w-72">
          {(Object.keys(charts) as ChartKey[]).map((key) => {
            const chart = charts[key];
            const activeState = activeChart === key;
            return (
              <button
                key={key}
                type="button"
                data-active={activeState}
                className={cn(
                  'relative z-10 flex min-w-0 flex-col justify-center gap-1 border-t border-border/80 px-4 py-3 text-start transition-colors sm:border-t-0 sm:border-l',
                  'data-[active=true]:bg-muted/55 data-[active=true]:text-foreground',
                  'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
                onClick={() => setActiveChart(key)}
              >
                <span
                  className="truncate text-xs text-muted-foreground"
                  dir="auto"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {chart.label}
                </span>
                <span className="font-mono text-lg font-semibold leading-none tabular-nums sm:text-2xl">
                  {chart.total.toLocaleString(numberLocale)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-[10.5px] text-muted-foreground">
            {signalLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={stacked}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[11px] font-semibold transition-colors',
                stacked
                  ? 'border-foreground/20 bg-foreground text-background'
                  : 'border-border/80 bg-background/60 text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setStacked((value) => !value)}
            >
              <Layers2 className="size-3.5" aria-hidden />
              {stackedLabel}
            </button>
          </div>
        </div>
        <div
          ref={chartRef}
          className="relative h-[240px] w-full touch-none"
          dir="ltr"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <DitheredPixelGraph
            series={graphSeries}
            width={720}
            height={260}
            padding={22}
            density="rich"
            showGrid
            stacked={stacked}
            showPoints
            highlightIndex={hoverIndex}
            ariaLabel={`${ariaLabel}: ${active.label}`}
          />
          {hoverIndex != null ? (
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-foreground/36 shadow-[0_0_18px_color-mix(in_srgb,var(--chart-primary)_36%,transparent)]"
              style={{ left: `${hoverPct}%` }}
              aria-hidden
            >
              <div
                className="absolute top-2 -translate-x-1/2 rounded-md border border-border/80 bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-[0_18px_42px_color-mix(in_srgb,var(--chart-primary)_18%,transparent),var(--shadow-popover)]"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {pointLabel} {(hoverIndex + 1).toLocaleString(numberLocale)}
                </div>
                <div className="grid gap-1 whitespace-nowrap font-mono tabular-nums">
                  <span className="inline-flex items-center gap-2" style={{ unicodeBidi: 'isolate' }}>
                    <span className="size-2 rounded-sm bg-[var(--chart-primary)]" />
                    <bdi dir={isRtl ? 'rtl' : 'ltr'}>{primaryLabel}</bdi>
                    <span aria-hidden>:</span>
                    <bdi dir="ltr">{hoverPrimary?.toLocaleString(numberLocale)}</bdi>
                  </span>
                  <span className="inline-flex items-center gap-2" style={{ unicodeBidi: 'isolate' }}>
                    <span className="size-2 rounded-sm bg-[var(--chart-secondary)]" />
                    <bdi dir={isRtl ? 'rtl' : 'ltr'}>{secondaryLabel}</bdi>
                    <span aria-hidden>:</span>
                    <bdi dir="ltr">{hoverSecondary?.toLocaleString(numberLocale)}</bdi>
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-primary)]" />
            <bdi dir={isRtl ? 'rtl' : 'ltr'}>{primaryLabel}</bdi>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-secondary)]" />
            <bdi dir={isRtl ? 'rtl' : 'ltr'}>{secondaryLabel}</bdi>
          </span>
        </div>
      </div>
    </div>
  );
}

function hasRtlText(values: string[]): boolean {
  return values.some((value) => /[\u0590-\u08ff]/.test(value));
}
