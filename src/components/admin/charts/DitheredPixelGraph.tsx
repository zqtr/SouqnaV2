'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type DitheredPixelGraphSeries = {
  data: number[];
  color: string;
  label?: string;
  fill?: boolean;
  dashed?: boolean;
  opacity?: number;
  pattern?: 'dots' | 'hatch' | 'ascii';
};

type Props = {
  series: DitheredPixelGraphSeries[];
  width?: number;
  height?: number;
  padding?: number;
  ariaLabel?: string;
  className?: string;
  showGrid?: boolean;
  density?: 'compact' | 'normal' | 'rich';
  stacked?: boolean;
  showPoints?: boolean;
  boil?: boolean;
  highlightIndex?: number | null;
  onHover?: (
    info: { index: number; x: number; align: 'start' | 'middle' | 'end' } | null,
  ) => void;
};

type BarChartProps = {
  data: number[];
  labels?: string[];
  color?: string;
  secondaryColor?: string;
  ariaLabel?: string;
  className?: string;
  boil?: boolean;
};

type Rgb = { r: number; g: number; b: number };
type Point = { x: number; y: number };
type CanvasSize = { width: number; height: number };

const BAYER_8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
] as const;

const LOW_RES_SCALE = 0.5;
const DEFAULT_COLOR: Rgb = { r: 200, g: 164, b: 93 };
const DEFAULT_SECONDARY: Rgb = { r: 217, g: 225, b: 242 };

export function DitheredPixelGraph({
  series,
  width = 720,
  height = 260,
  padding = 22,
  ariaLabel = 'Dithered trend graph',
  className,
  showGrid = false,
  density = 'normal',
  stacked = false,
  showPoints = false,
  boil = false,
  highlightIndex = null,
  onHover,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const size = useElementSize(wrapRef, { width, height });
  const reducedMotion = useReducedMotion();
  const frameRef = React.useRef<number>();
  const stateRef = React.useRef<{
    current: number[][];
    reveal: number;
    lastKey: string;
  }>({ current: [], reveal: 0, lastKey: '' });
  const dataKey = React.useMemo(
    () => `${stacked}:${series.map((item) => item.data.join(',')).join('|')}:${density}`,
    [density, series, stacked],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || size.width <= 0 || size.height <= 0) return;
    const chartCanvas = canvas;

    const visibleSeries = series.filter((item) => item.data.length > 0);
    const safeSeries =
      visibleSeries.length > 0
        ? visibleSeries.slice(0, 2)
        : [{ data: [0, 0], color: 'var(--chart-primary)', fill: true }];
    const targets = normalizeSeries(safeSeries.map((item) => item.data));
    const state = stateRef.current;
    if (state.lastKey !== dataKey || state.current.length !== targets.length) {
      state.current = targets.map((item) => item.map(() => 0));
      state.reveal = reducedMotion ? 1 : 0;
      state.lastKey = dataKey;
    }

    const colors = safeSeries.map((item, index) =>
      resolveColor(wrap, item.color, index === 0 ? DEFAULT_COLOR : DEFAULT_SECONDARY),
    );
    const brightColors = colors.map((color) => mixRgb(color, { r: 255, g: 255, b: 255 }, 0.42));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = { width: size.width, height: size.height };

    function tick(time: number) {
      let dirty = false;
      for (let group = 0; group < targets.length; group += 1) {
        const current = state.current[group] ?? [];
        const target = targets[group] ?? [];
        for (let index = 0; index < target.length; index += 1) {
          const next = target[index] ?? 0;
          if (reducedMotion) {
            if (current[index] !== next) dirty = true;
            current[index] = next;
          } else {
            const value = current[index] ?? 0;
            const eased = value + (next - value) * 0.07;
            current[index] = Math.abs(eased - next) < 0.002 ? next : eased;
            if (Math.abs((current[index] ?? 0) - next) > 0.002) dirty = true;
          }
        }
        state.current[group] = current;
      }

      if (!reducedMotion && state.reveal < 1) {
        state.reveal = Math.min(1, state.reveal + 0.05);
        dirty = true;
      }

      drawLineChart({
        canvas: chartCanvas,
        size: rect,
        dpr,
        padding,
        series: state.current,
        colors,
        brightColors,
        labels: safeSeries.map((item) => item.label ?? ''),
        showGrid,
        showPoints,
        stacked,
        reveal: state.reveal,
        time,
        boil: boil && !reducedMotion,
        highlightIndex,
        density,
      });

      if (dirty || (boil && !reducedMotion)) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    }

    window.cancelAnimationFrame(frameRef.current ?? 0);
    frameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameRef.current ?? 0);
  }, [ariaLabel, boil, dataKey, density, height, highlightIndex, padding, reducedMotion, series, showGrid, showPoints, size.height, size.width, stacked, width]);

  const hoverIndexRef = React.useRef<number | null>(null);
  const handleHoverMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!onHover) return;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pad = Math.max(14, padding);
      const plotLeft = pad;
      const plotWidth = Math.max(1, rect.width - pad * 2);
      const counts = series.map((item) => item.data.length).filter((count) => count > 0);
      const points = counts.length ? Math.max(...counts) : 0;
      if (points < 2) return;
      const localX = Math.min(plotLeft + plotWidth, Math.max(plotLeft, event.clientX - rect.left));
      const index = Math.round(((localX - plotLeft) / plotWidth) * (points - 1));
      // Only re-render the parent when the highlighted day actually changes.
      if (index === hoverIndexRef.current) return;
      hoverIndexRef.current = index;
      const snappedX = plotLeft + (plotWidth * index) / (points - 1);
      const ratio = index / (points - 1);
      const align = ratio > 0.66 ? 'end' : ratio < 0.34 ? 'start' : 'middle';
      onHover({ index, x: snappedX, align });
    },
    [onHover, padding, series],
  );
  const handleHoverLeave = React.useCallback(() => {
    hoverIndexRef.current = null;
    onHover?.(null);
  }, [onHover]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      className={cn('souqna-bayer-chart relative h-full min-h-0 w-full overflow-hidden', className)}
      style={{ minHeight: height }}
      onPointerMove={handleHoverMove}
      onPointerLeave={handleHoverLeave}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

export function DitheredBayerBarChart({
  data,
  labels,
  color = 'var(--chart-primary)',
  secondaryColor = 'var(--chart-secondary)',
  ariaLabel = 'Dithered bar chart',
  className,
  boil = false,
}: BarChartProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const size = useElementSize(wrapRef, { width: 320, height: 120 });
  const reducedMotion = useReducedMotion();
  const frameRef = React.useRef<number>();
  const revealRef = React.useRef(0);
  const currentRef = React.useRef<number[]>([]);
  const key = data.join(',');

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || size.width <= 0 || size.height <= 0) return;
    const chartCanvas = canvas;
    const target = data.length > 0 ? data.map((value) => Math.max(0, value)) : [0];
    if (currentRef.current.length !== target.length) {
      currentRef.current = target.map(() => 0);
      revealRef.current = reducedMotion ? 1 : 0;
    }
    const primary = resolveColor(wrap, color, DEFAULT_COLOR);
    const secondary = resolveColor(wrap, secondaryColor, DEFAULT_SECONDARY);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function tick(time: number) {
      let dirty = false;
      currentRef.current = target.map((value, index) => {
        if (reducedMotion) return value;
        const current = currentRef.current[index] ?? 0;
        const eased = current + (value - current) * 0.07;
        if (Math.abs(eased - value) > 0.002) dirty = true;
        return Math.abs(eased - value) < 0.002 ? value : eased;
      });
      if (!reducedMotion && revealRef.current < 1) {
        revealRef.current = Math.min(1, revealRef.current + 0.05);
        dirty = true;
      }
      drawBarChart({
        canvas: chartCanvas,
        size,
        dpr,
        data: currentRef.current,
        labels,
        primary,
        secondary,
        reveal: revealRef.current,
        boil: boil && !reducedMotion,
        time,
      });
      if (dirty || (boil && !reducedMotion)) frameRef.current = window.requestAnimationFrame(tick);
    }

    window.cancelAnimationFrame(frameRef.current ?? 0);
    frameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameRef.current ?? 0);
  }, [boil, color, data, key, labels, reducedMotion, secondaryColor, size]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      className={cn('souqna-bayer-chart relative h-full w-full overflow-hidden', className)}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

function drawLineChart({
  canvas,
  size,
  dpr,
  padding,
  series,
  colors,
  brightColors,
  labels,
  showGrid,
  showPoints,
  stacked,
  reveal,
  time,
  boil,
  highlightIndex,
  density,
}: {
  canvas: HTMLCanvasElement;
  size: CanvasSize;
  dpr: number;
  padding: number;
  series: number[][];
  colors: Rgb[];
  brightColors: Rgb[];
  labels: string[];
  showGrid: boolean;
  showPoints: boolean;
  stacked: boolean;
  reveal: number;
  time: number;
  boil: boolean;
  highlightIndex: number | null;
  density: Props['density'];
}) {
  prepareCanvas(canvas, size, dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size.width, size.height);

  const pad = Math.max(14, padding);
  const plot = {
    left: pad,
    top: pad,
    width: Math.max(1, size.width - pad * 2),
    height: Math.max(1, size.height - pad * 2.15),
  };
  const revealRight = plot.left + plot.width * reveal;
  const displayed = getDisplaySeries(series, stacked);
  const maxValue = Math.max(...displayed.flat(), 1);
  const lineFns = displayed.map((values) => makeLineSampler(values, plot, maxValue));
  const lowW = Math.max(1, Math.round(size.width * LOW_RES_SCALE));
  const lowH = Math.max(1, Math.round(size.height * LOW_RES_SCALE));
  const low = document.createElement('canvas');
  low.width = lowW;
  low.height = lowH;
  const lowCtx = low.getContext('2d');
  if (!lowCtx) return;
  const image = lowCtx.createImageData(lowW, lowH);
  const frame = Math.floor(time * 0.009);
  const compactBoost = density === 'compact' ? 0.8 : density === 'rich' ? 1.08 : 1;

  for (let py = 0; py < lowH; py += 1) {
    const y = py / LOW_RES_SCALE;
    if (y < plot.top || y > plot.top + plot.height) continue;
    for (let px = 0; px < lowW; px += 1) {
      const x = px / LOW_RES_SCALE;
      if (x < plot.left || x > revealRight) continue;
      const primaryY = lineFns[0]?.(x) ?? plot.top + plot.height;
      const secondaryY = lineFns[1]?.(x) ?? plot.top + plot.height;
      const dPrimary = y - primaryY;
      const dSecondary = y - secondaryY;
      let primaryIntensity = dPrimary > 0 ? clamp01(1 - dPrimary / (plot.height * 1.05)) : 0;
      let secondaryIntensity = dSecondary > 0 ? clamp01(1 - dSecondary / (plot.height * 0.7)) : 0;
      const primaryBand = Math.abs(y - primaryY) < 3.2;
      const secondaryBand = Math.abs(y - secondaryY) < 4.2;
      if (primaryBand) primaryIntensity = Math.max(primaryIntensity, 0.98);
      if (secondaryBand) secondaryIntensity = Math.max(secondaryIntensity, 0.96);
      primaryIntensity *= compactBoost;
      secondaryIntensity *= compactBoost;

      const useSecondary = displayed.length > 1 && secondaryIntensity * 1.12 >= primaryIntensity;
      const intensity = clamp01(useSecondary ? secondaryIntensity : primaryIntensity);
      if (intensity <= 0) continue;
      const th = thresholdAt(px, py, frame, boil);
      if (intensity <= th) continue;
      const color = useSecondary
        ? secondaryBand
          ? brightColors[1] ?? colors[1] ?? DEFAULT_SECONDARY
          : colors[1] ?? DEFAULT_SECONDARY
        : primaryBand
          ? brightColors[0] ?? colors[0] ?? DEFAULT_COLOR
          : colors[0] ?? DEFAULT_COLOR;
      setPixel(image.data, (py * lowW + px) * 4, color, Math.round(230 * Math.min(1, intensity + 0.12)));
    }
  }

  lowCtx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, size.width, size.height);
  ctx.restore();

  drawCrispGrid(ctx, plot, showGrid);
  displayed.forEach((values, index) => {
    const color = brightColors[index] ?? colors[index] ?? DEFAULT_COLOR;
    const allPoints = pointsForValues(values, plot, maxValue);
    const points = allPoints.filter((point) => point.x <= revealRight + 0.5);
    if (points.length === 0) return;
    ctx.save();
    ctx.shadowColor = rgb(color, 0.46);
    ctx.shadowBlur = index === 0 ? 12 : 10;
    ctx.strokeStyle = rgb(color, index === 0 ? 0.98 : 0.88);
    ctx.lineWidth = index === 0 ? 2.2 : 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (index > 0) ctx.setLineDash([5, 6]);
    strokeSmoothPath(ctx, points);
    ctx.restore();

    if (showPoints) {
      ctx.save();
      ctx.fillStyle = rgb(color, index === 0 ? 0.86 : 0.62);
      for (const point of points) {
        ctx.fillRect(Math.round(point.x) - 1.5, Math.round(point.y) - 1.5, 3, 3);
      }
      ctx.restore();
    }

    if (highlightIndex != null) {
      drawHoverLineGlow(
        ctx,
        lineFns[index] ?? (() => plot.top + plot.height),
        allPoints,
        highlightIndex,
        revealRight,
        color,
        index === 0 ? 1 : 0.72,
      );
    }
  });
  drawLineLabels(ctx, plot, labels);
}

function drawBarChart({
  canvas,
  size,
  dpr,
  data,
  labels,
  primary,
  secondary,
  reveal,
  boil,
  time,
}: {
  canvas: HTMLCanvasElement;
  size: CanvasSize;
  dpr: number;
  data: number[];
  labels?: string[];
  primary: Rgb;
  secondary: Rgb;
  reveal: number;
  boil: boolean;
  time: number;
}) {
  prepareCanvas(canvas, size, dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size.width, size.height);
  const plot = { left: 12, top: 10, width: size.width - 24, height: size.height - 28 };
  const baseline = plot.top + plot.height;
  const maxValue = Math.max(...data, 1);
  const lowW = Math.max(1, Math.round(size.width * LOW_RES_SCALE));
  const lowH = Math.max(1, Math.round(size.height * LOW_RES_SCALE));
  const low = document.createElement('canvas');
  low.width = lowW;
  low.height = lowH;
  const lowCtx = low.getContext('2d');
  if (!lowCtx) return;
  const image = lowCtx.createImageData(lowW, lowH);
  const frame = Math.floor(time * 0.009);
  const slot = plot.width / Math.max(data.length, 1);
  const barW = slot * 0.56;

  for (let index = 0; index < data.length; index += 1) {
    const h = (Math.max(0, data[index] ?? 0) / maxValue) * plot.height * reveal;
    const left = plot.left + index * slot + (slot - barW) / 2;
    const right = left + barW;
    const top = baseline - h;
    for (let py = 0; py < lowH; py += 1) {
      const y = py / LOW_RES_SCALE;
      if (y < top || y > baseline) continue;
      for (let px = 0; px < lowW; px += 1) {
        const x = px / LOW_RES_SCALE;
        if (x < left || x > right) continue;
        const frac = clamp01((baseline - y) / Math.max(h, 1));
        let density = 0.14 + 0.86 * (1 - frac);
        const mix = clamp01(1 - (1 - frac) * 1.25);
        let color = mixRgb(primary, secondary, mix);
        if (frac > 0.93) {
          color = mixRgb(color, mixRgb(secondary, { r: 255, g: 255, b: 255 }, 0.45), (frac - 0.93) / 0.07);
          density = 1;
        }
        if (density <= thresholdAt(px, py, frame, boil)) continue;
        setPixel(image.data, (py * lowW + px) * 4, color, 232);
      }
    }
  }

  lowCtx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, size.width, size.height);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  crispLine(ctx, plot.left, baseline, plot.left + plot.width, baseline);
  drawBarLabels(ctx, plot, labels);
}

function useElementSize(ref: React.RefObject<HTMLElement>, fallback: CanvasSize): CanvasSize {
  const [size, setSize] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.round(rect.width || fallback.width)),
        height: Math.max(1, Math.round(rect.height || fallback.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback.height, fallback.width, ref]);
  return size;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function prepareCanvas(canvas: HTMLCanvasElement, size: CanvasSize, dpr: number) {
  const nextWidth = Math.max(1, Math.round(size.width * dpr));
  const nextHeight = Math.max(1, Math.round(size.height * dpr));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function normalizeSeries(series: number[][]): number[][] {
  const length = Math.max(...series.map((item) => item.length), 2);
  return series.map((item) => {
    const fallback = item.length === 0 ? [0, 0] : item.length === 1 ? [item[0] ?? 0, item[0] ?? 0] : item;
    return Array.from({ length }, (_, index) => Math.max(0, fallback[index] ?? fallback[fallback.length - 1] ?? 0));
  });
}

function getDisplaySeries(series: number[][], stacked: boolean): number[][] {
  if (!stacked || series.length < 2) return series;
  const primary = series[0] ?? [];
  const secondary = series[1] ?? [];
  return [
    primary,
    primary.map((value, index) => value + (secondary[index] ?? 0)),
  ];
}

function pointsForValues(values: number[], plot: { left: number; top: number; width: number; height: number }, maxValue: number): Point[] {
  return values.map((value, index) => ({
    x: plot.left + (plot.width * index) / Math.max(values.length - 1, 1),
    y: plot.top + plot.height - (Math.max(0, value) / maxValue) * plot.height,
  }));
}

function makeLineSampler(values: number[], plot: { left: number; top: number; width: number; height: number }, maxValue: number) {
  const points = pointsForValues(values, plot, maxValue);
  const ys = points.map((point) => point.y);
  const tangents = buildMono(ys);
  return (x: number) => {
    if (points.length === 0) return plot.top + plot.height;
    if (points.length === 1 || x <= points[0]!.x) return points[0]!.y;
    const u = ((x - plot.left) / Math.max(plot.width, 1)) * (points.length - 1);
    return monoAt(u, ys, tangents);
  };
}

function strokeSmoothPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    ctx.lineTo(points[0]!.x + 0.01, points[0]!.y);
    ctx.stroke();
    return;
  }

  const ys = points.map((point) => point.y);
  const tangents = buildMono(ys);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const width = Math.max(last.x - first.x, 1);
  const steps = Math.max(points.length * 8, Math.ceil(width / 3));

  ctx.beginPath();
  for (let step = 0; step <= steps; step += 1) {
    const x = first.x + (width * step) / steps;
    const u = ((x - first.x) / width) * (points.length - 1);
    const y = monoAt(u, ys, tangents);
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawHoverLineGlow(
  ctx: CanvasRenderingContext2D,
  lineAtX: (x: number) => number,
  points: Point[],
  highlightIndex: number,
  revealRight: number,
  color: Rgb,
  alphaScale: number,
) {
  if (points.length === 0) return;

  const index = Math.max(0, Math.min(points.length - 1, Math.round(highlightIndex)));
  const current = points[index];
  if (!current || current.x > revealRight + 0.5) return;

  const previous = points[Math.max(0, index - 1)] ?? current;
  const next = points[Math.min(points.length - 1, index + 1)] ?? current;
  const fromX = index === 0 ? current.x : previous.x + (current.x - previous.x) * 0.28;
  const toX = index === points.length - 1 ? current.x : current.x + (next.x - current.x) * 0.72;
  const endX = Math.min(toX, revealRight);
  if (endX - fromX < 3) return;

  const highlight = mixRgb(color, { r: 255, g: 255, b: 255 }, 0.58);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.shadowColor = rgb(highlight, 0.46 * alphaScale);
  ctx.shadowBlur = 18;
  ctx.lineWidth = 8;
  ctx.strokeStyle = rgb(highlight, 0.16 * alphaScale);
  drawSampledPath(ctx, lineAtX, fromX, endX, Math.max(6, Math.ceil((endX - fromX) / 4)));
  ctx.stroke();

  ctx.shadowBlur = 5;
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = rgb(highlight, 0.58 * alphaScale);
  drawSampledPath(ctx, lineAtX, fromX, endX, 14);
  ctx.stroke();

  const pointY = lineAtX(current.x);
  ctx.beginPath();
  ctx.arc(current.x, pointY, 4.4, 0, Math.PI * 2);
  ctx.fillStyle = rgb(highlight, 0.78 * alphaScale);
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = rgb(color, 0.92 * alphaScale);
  ctx.stroke();
  ctx.restore();
}

function drawSampledPath(
  ctx: CanvasRenderingContext2D,
  lineAtX: (x: number) => number,
  fromX: number,
  toX: number,
  steps: number,
) {
  ctx.beginPath();
  for (let step = 0; step <= steps; step += 1) {
    const x = fromX + ((toX - fromX) * step) / Math.max(1, steps);
    const y = lineAtX(x);
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
}

function buildMono(ys: number[]): number[] {
  const n = ys.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const d = new Array<number>(n - 1);
  const m = new Array<number>(n).fill(0);
  for (let index = 0; index < n - 1; index += 1) {
    d[index] = (ys[index + 1] ?? 0) - (ys[index] ?? 0);
  }

  m[0] = d[0] ?? 0;
  m[n - 1] = d[n - 2] ?? 0;
  for (let index = 1; index < n - 1; index += 1) {
    const previous = d[index - 1] ?? 0;
    const next = d[index] ?? 0;
    m[index] = previous * next <= 0 ? 0 : (previous + next) / 2;
  }

  for (let index = 0; index < n - 1; index += 1) {
    const delta = d[index] ?? 0;
    if (delta === 0) {
      m[index] = 0;
      m[index + 1] = 0;
      continue;
    }
    const a = (m[index] ?? 0) / delta;
    const b = (m[index + 1] ?? 0) / delta;
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      m[index] = (m[index] ?? 0) * t;
      m[index + 1] = (m[index + 1] ?? 0) * t;
    }
  }

  return m;
}

function monoAt(u: number, ys: number[], m: number[]): number {
  const n = ys.length;
  if (n === 0) return 0;
  if (n === 1) return ys[0] ?? 0;

  const bounded = Math.max(0, Math.min(n - 1, u));
  let index = Math.floor(bounded);
  if (index >= n - 1) index = n - 2;
  const t = bounded - index;
  const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
  const h10 = t * (1 - t) * (1 - t);
  const h01 = t * t * (3 - 2 * t);
  const h11 = t * t * (t - 1);
  return (
    h00 * (ys[index] ?? 0) +
    h10 * (m[index] ?? 0) +
    h01 * (ys[index + 1] ?? 0) +
    h11 * (m[index + 1] ?? 0)
  );
}

function drawCrispGrid(ctx: CanvasRenderingContext2D, plot: { left: number; top: number; width: number; height: number }, showGrid: boolean) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  if (showGrid) {
    ctx.setLineDash([3, 7]);
    for (const ratio of [0.25, 0.5, 0.75]) {
      const y = plot.top + plot.height * ratio;
      crispLine(ctx, plot.left, y, plot.left + plot.width, y);
    }
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  crispLine(ctx, plot.left, plot.top + plot.height, plot.left + plot.width, plot.top + plot.height);
  ctx.restore();
}

function drawLineLabels(ctx: CanvasRenderingContext2D, plot: { left: number; top: number; width: number; height: number }, labels: string[]) {
  ctx.save();
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(labels.filter(Boolean).join(' / '), plot.left, plot.top + plot.height - 7);
  ctx.restore();
}

function drawBarLabels(ctx: CanvasRenderingContext2D, plot: { left: number; top: number; width: number; height: number }, labels?: string[]) {
  if (!labels?.length) return;
  ctx.save();
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.46)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const slot = plot.width / labels.length;
  labels.forEach((label, index) => {
    ctx.fillText(label, plot.left + slot * index + slot / 2, plot.top + plot.height + 7);
  });
  ctx.restore();
}

function crispLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
}

function thresholdAt(px: number, py: number, frame: number, boil: boolean): number {
  let threshold = ((BAYER_8[py & 7]?.[px & 7] ?? 0) + 0.5) / 64;
  if (boil) threshold = clamp01(threshold + (hashPixel(px, py, frame) - 0.5) * 0.12);
  return threshold;
}

function hashPixel(x: number, y: number, frame: number): number {
  let value = x * 374761393 + y * 668265263 + frame * 2147483647;
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function resolveColor(root: HTMLElement, input: string, fallback: Rgb): Rgb {
  const doc = root.ownerDocument;
  const probe = doc.createElement('span');
  probe.style.color = input;
  probe.style.display = 'none';
  root.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return parseRgb(value) ?? fallback;
}

function parseRgb(value: string): Rgb | null {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (!match) return null;
  const [r, g, b] = match[1]!.split(/,\s*/).map((part) => Number.parseFloat(part));
  if (![r, g, b].every((item) => Number.isFinite(item))) return null;
  return { r: r!, g: g!, b: b! };
}

function setPixel(data: Uint8ClampedArray, offset: number, color: Rgb, alpha: number) {
  data[offset] = color.r;
  data[offset + 1] = color.g;
  data[offset + 2] = color.b;
  data[offset + 3] = alpha;
}

function rgb(color: Rgb, alpha = 1): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const amount = clamp01(t);
  return {
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
