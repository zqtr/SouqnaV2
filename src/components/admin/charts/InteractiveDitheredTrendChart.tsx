"use client";

import * as React from 'react';
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

  return (
    <div className="souqna-dashboard-chart rounded-lg border border-border/80 bg-muted/40">
      <div className="grid border-b border-border/80 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {ariaLabel}
          </div>
          <div className="text-xs text-muted-foreground">
            {thirtyDaysAgo} - {today}
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
                <span className="truncate text-xs text-muted-foreground">{chart.label}</span>
                <span className="font-mono text-lg font-semibold leading-none tabular-nums sm:text-2xl">
                  {chart.total.toLocaleString('en-US')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-3">
        <div className="h-[240px] w-full">
          <DitheredPixelGraph
            series={[
              {
                data: active.data,
                color: active.color,
                label: active.label,
                fill: true,
              },
              {
                data: inactive.data,
                color: inactive.color,
                label: inactive.label,
                fill: false,
                dashed: true,
                opacity: 0.38,
              },
            ]}
            width={720}
            height={260}
            padding={22}
            density="rich"
            showGrid
            ariaLabel={`${ariaLabel}: ${active.label}`}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-primary)]" />
            {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--chart-secondary)]" />
            {secondaryLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
