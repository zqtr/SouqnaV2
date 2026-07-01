'use client';

import * as React from 'react';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  ariaLabel?: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type SparkPoint = {
  x: number;
  y: number;
  index: number;
  value: number;
};

const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24,
  36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6,
  54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21,
];

const FALLBACK_ACCENT: Rgb = { r: 184, g: 154, b: 82 };

export function Sparkline({
  data,
  width = 120,
  height = 32,
  accent = '#B89A52',
  ariaLabel,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const serializedData = React.useMemo(
    () => data.map((value) => sanitizeMetric(value)).join(','),
    [data],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const values = serializedData
      ? serializedData.split(',').map((value) => sanitizeMetric(Number(value)))
      : [];
    const accentColor = resolveColor(canvas, accent) ?? FALLBACK_ACCENT;
    drawSparkline(canvas, values, width, height, accentColor);
  }, [accent, height, serializedData, width]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel ?? 'Trend over time'}
      width={width}
      height={height}
      style={{ display: 'block', width, height }}
    />
  );
}

function drawSparkline(
  canvas: HTMLCanvasElement,
  rawValues: number[],
  width: number,
  height: number,
  accent: Rgb,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  const values = rawValues.length > 0 ? rawValues.map(sanitizeMetric) : [0];
  const nonZero = values
    .map((value, index) => ({ value, index }))
    .filter((point) => point.value > 0);
  const padX = 3;
  const padTop = 4;
  const padBottom = 5;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padTop - padBottom);
  const baselineY = height - padBottom;
  const peakH = innerH * 0.78;
  const maxValue = Math.max(...values, 1);
  const pointAt = (index: number): SparkPoint => {
    const value = values[index] ?? 0;
    return {
      x: xForIndex(index, values.length, padX, innerW, width),
      y: yForValue(value, maxValue, baselineY, peakH, padTop),
      index,
      value,
    };
  };

  drawBaseline(ctx, padX, width - padX, baselineY, accent);

  if (nonZero.length === 0) return;

  if (nonZero.length === 1) {
    const point = pointAt(nonZero[0]!.index);
    drawDot(ctx, point, accent);
    return;
  }

  if (nonZero.length <= 3) {
    const firstIndex = nonZero[0]!.index;
    const lastIndex = nonZero[nonZero.length - 1]!.index;
    const sparsePoints = values
      .slice(firstIndex, lastIndex + 1)
      .map((_, offset) => pointAt(firstIndex + offset));
    const lineAtX = makeLinearSampler(sparsePoints, baselineY, padTop);
    drawDitherFill(ctx, width, height, accent, baselineY, lineAtX, {
      fromX: sparsePoints[0]!.x,
      toX: sparsePoints[sparsePoints.length - 1]!.x,
    });
    drawPolyline(ctx, sparsePoints, accent);
    drawDots(
      ctx,
      sparsePoints.filter((point) => point.value > 0),
      accent,
    );
    return;
  }

  const allPoints = values.map((_, index) => pointAt(index));
  const lineAtX = makeMonotoneSampler(
    allPoints.map((point) => point.y),
    padX,
    innerW,
    baselineY,
    padTop,
  );
  drawDitherFill(ctx, width, height, accent, baselineY, lineAtX, {
    fromX: padX,
    toX: width - padX,
  });
  drawSampledLine(ctx, lineAtX, padX, width - padX, accent);
}

function drawBaseline(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  toX: number,
  y: number,
  accent: Rgb,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, y + 0.5);
  ctx.lineTo(toX, y + 0.5);
  ctx.strokeStyle = rgba(accent, 0.18);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawDitherFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: Rgb,
  baselineY: number,
  lineAtX: (x: number) => number,
  bounds: { fromX: number; toX: number },
) {
  const lowW = Math.max(1, Math.round(width * 0.48));
  const lowH = Math.max(1, Math.round(height * 0.48));
  const buffer = document.createElement('canvas');
  buffer.width = lowW;
  buffer.height = lowH;
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) return;

  const image = bufferCtx.createImageData(lowW, lowH);
  for (let py = 0; py < lowH; py += 1) {
    for (let px = 0; px < lowW; px += 1) {
      const x = ((px + 0.5) / lowW) * width;
      const y = ((py + 0.5) / lowH) * height;
      if (x < bounds.fromX || x > bounds.toX) continue;

      const lineY = clamp(lineAtX(x), 0, baselineY);
      if (lineY >= baselineY - 0.5 || y < lineY || y > baselineY) continue;

      const fillHeight = Math.max(1, baselineY - lineY);
      const depth = clamp01((baselineY - y) / fillHeight);
      const density = 0.1 + depth * 0.34;
      const threshold = (BAYER_8[(py % 8) * 8 + (px % 8)]! + 0.5) / 64;
      if (threshold > density) continue;

      const offset = (py * lowW + px) * 4;
      image.data[offset] = accent.r;
      image.data[offset + 1] = accent.g;
      image.data[offset + 2] = accent.b;
      image.data[offset + 3] = Math.round(42 + depth * 60);
    }
  }

  bufferCtx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0, width, height);
  ctx.restore();
}

function drawPolyline(ctx: CanvasRenderingContext2D, points: SparkPoint[], accent: Rgb) {
  if (points.length === 0) return;
  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.strokeStyle = rgba(accent, 0.92);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawSampledLine(
  ctx: CanvasRenderingContext2D,
  lineAtX: (x: number) => number,
  fromX: number,
  toX: number,
  accent: Rgb,
) {
  ctx.save();
  ctx.beginPath();
  const steps = Math.max(8, Math.ceil(toX - fromX));
  for (let step = 0; step <= steps; step += 1) {
    const x = fromX + ((toX - fromX) * step) / steps;
    const y = lineAtX(x);
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = rgba(accent, 0.9);
  ctx.lineWidth = 1.65;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawDots(ctx: CanvasRenderingContext2D, points: SparkPoint[], accent: Rgb) {
  points.forEach((point) => drawDot(ctx, point, accent));
}

function drawDot(ctx: CanvasRenderingContext2D, point: SparkPoint, accent: Rgb) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 2.25, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mixRgb(accent, { r: 245, g: 239, b: 227 }, 0.22), 0.96);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(accent, 0.76);
  ctx.stroke();
  ctx.restore();
}

function makeLinearSampler(points: SparkPoint[], baselineY: number, padTop: number) {
  return (x: number) => {
    if (points.length === 0) return baselineY;
    if (x <= points[0]!.x) return points[0]!.y;
    if (x >= points[points.length - 1]!.x) return points[points.length - 1]!.y;

    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index]!;
      const next = points[index + 1]!;
      if (x < current.x || x > next.x) continue;
      const span = Math.max(1, next.x - current.x);
      const t = (x - current.x) / span;
      return clamp(lerp(current.y, next.y, t), padTop, baselineY);
    }

    return baselineY;
  };
}

function makeMonotoneSampler(
  ys: number[],
  padX: number,
  innerW: number,
  baselineY: number,
  padTop: number,
) {
  const slopes = buildMono(ys);
  return (x: number) => {
    const u = ((clamp(x, padX, padX + innerW) - padX) / innerW) * (ys.length - 1);
    return clamp(monoAt(u, ys, slopes), padTop, baselineY);
  };
}

function buildMono(ys: number[]) {
  const n = ys.length;
  const d: number[] = [];
  const m = new Array<number>(n).fill(0);
  if (n <= 1) return m;

  for (let i = 0; i < n - 1; i += 1) d[i] = ys[i + 1]! - ys[i]!;
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      m[i] = m[i]! * t;
      m[i + 1] = m[i + 1]! * t;
    }
  }
  return m;
}

function monoAt(u: number, ys: number[], m: number[]) {
  const n = ys.length;
  if (n === 0) return 0;
  if (n === 1) return ys[0]!;
  const bounded = clamp(u, 0, n - 1);
  let i = Math.floor(bounded);
  if (i >= n - 1) i = n - 2;
  const t = bounded - i;
  const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
  const h10 = t * (1 - t) * (1 - t);
  const h01 = t * t * (3 - 2 * t);
  const h11 = t * t * (t - 1);
  return h00 * ys[i]! + h10 * m[i]! + h01 * ys[i + 1]! + h11 * m[i + 1]!;
}

function xForIndex(index: number, len: number, padX: number, innerW: number, width: number) {
  if (len <= 1) return width / 2;
  return padX + (index / (len - 1)) * innerW;
}

function yForValue(
  value: number,
  maxValue: number,
  baselineY: number,
  peakH: number,
  padTop: number,
) {
  return clamp(
    baselineY - (sanitizeMetric(value) / Math.max(1, maxValue)) * peakH,
    padTop,
    baselineY,
  );
}

function sanitizeMetric(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function resolveColor(element: HTMLElement, color: string): Rgb | null {
  const direct = parseColor(color);
  if (direct) return direct;

  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.color = color;
  (element.parentElement ?? document.body).appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return parseColor(resolved);
}

function parseColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1]!;
    const full =
      raw.length === 3
        ? raw
            .split('')
            .map((part) => `${part}${part}`)
            .join('')
        : raw;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = value.match(/rgba?\(([^)]+)\)/i);
  if (!rgb) return null;
  const parts = rgb[1]!
    .split(/[, ]+/)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (parts.length < 3) return null;
  return {
    r: clamp(Math.round(parts[0]!), 0, 255),
    g: clamp(Math.round(parts[1]!), 0, 255),
    b: clamp(Math.round(parts[2]!), 0, 255),
  };
}

function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  return {
    r: Math.round(lerp(a.r, b.r, amount)),
    g: Math.round(lerp(a.g, b.g, amount)),
    b: Math.round(lerp(a.b, b.b, amount)),
  };
}

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}
