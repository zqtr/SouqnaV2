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
};

type Point = { x: number; y: number };

const DENSITY = {
  compact: { columns: 30, rows: 10, ascii: false },
  normal: { columns: 54, rows: 16, ascii: true },
  rich: { columns: 74, rows: 22, ascii: true },
} as const;

export function DitheredPixelGraph({
  series,
  width = 320,
  height = 120,
  padding = 10,
  ariaLabel = 'Dithered trend graph',
  className,
  showGrid = false,
  density = 'normal',
  stacked = false,
  showPoints = false,
}: Props) {
  const visibleSeries = series.filter((item) => item.data.length > 0);
  const safeSeries = visibleSeries.length > 0 ? visibleSeries : [{ data: [0, 0], color: 'currentColor' }];
  const maxValue = stacked
    ? Math.max(
        ...sumSeries(safeSeries).map((value) => value),
        1,
      )
    : Math.max(...safeSeries.flatMap((item) => item.data), 1);
  const id = `dither-${hashString(
    `${ariaLabel}:${width}:${height}:${stacked}:${safeSeries.map((item) => item.data.join('.')).join('|')}`,
  )}`;
  const baseline = height - padding;
  const densityConfig = DENSITY[density];
  const cumulativeData = getCumulativeSeries(safeSeries);

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('souqna-dither-pixel-graph block h-full w-full overflow-visible', className)}
    >
      <title>{ariaLabel}</title>
      <defs>
        {safeSeries.map((item, index) => {
          const displayData = stacked ? (cumulativeData[index] ?? item.data) : item.data;
          const points = getPoints(displayData, width, height, padding, maxValue);
          const stepped = getSteppedPoints(points);
          const lowerData = stacked && index > 0 ? (cumulativeData[index - 1] ?? []) : [];
          const lowerPoints =
            stacked && lowerData.length > 0
              ? getSteppedPoints(getPoints(lowerData, width, height, padding, maxValue))
              : undefined;
          const clipPoints = lowerPoints
            ? getBandPoints(stepped, lowerPoints)
            : getAreaPoints(stepped, baseline);

          return (
            <g key={`defs-${index}`}>
              <linearGradient id={`${id}-fill-${index}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity="0.58" />
                <stop offset="48%" stopColor={item.color} stopOpacity="0.24" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.03" />
              </linearGradient>
              <pattern
                id={`${id}-hatch-${index}`}
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="7" height="7" fill="transparent" />
                <rect width="2.2" height="7" fill={item.color} opacity="0.58" />
              </pattern>
              <clipPath id={`${id}-clip-${index}`}>
                <polygon points={clipPoints} />
              </clipPath>
            </g>
          );
        })}
      </defs>

      {showGrid ? (
        <g className="souqna-dither-grid">
          {[0.25, 0.5, 0.75].map((line) => (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={padding + (height - padding * 2) * line}
              y2={padding + (height - padding * 2) * line}
              stroke="currentColor"
              strokeDasharray="3 7"
              strokeOpacity="0.2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}

      {safeSeries.map((item, index) => {
        const displayData = stacked ? (cumulativeData[index] ?? item.data) : item.data;
        const lowerData = stacked && index > 0 ? (cumulativeData[index - 1] ?? []) : [];
        const points = getPoints(displayData, width, height, padding, maxValue);
        const lowerPoints =
          stacked && lowerData.length > 0
            ? getSteppedPoints(getPoints(lowerData, width, height, padding, maxValue))
            : undefined;
        const stepped = getSteppedPoints(points);
        const areaPoints = lowerPoints ? getBandPoints(stepped, lowerPoints) : getAreaPoints(stepped, baseline);
        const ditherPixels = getDitherPixels({
          topPoints: points,
          lowerPoints,
          width,
          height,
          padding,
          baseline,
          columns: densityConfig.columns,
          rows: densityConfig.rows,
        });
        const asciiPixels = densityConfig.ascii
          ? getAsciiPixels({
              topPoints: points,
              lowerPoints,
              width,
              height,
              padding,
              baseline,
              columns: densityConfig.columns,
              rows: densityConfig.rows,
            })
          : [];
        const shouldFill = item.fill !== false;
        const opacity = item.opacity ?? (index === 0 ? 1 : 0.72);
        const pattern = item.pattern ?? (index === 0 ? 'dots' : 'hatch');

        return (
          <g key={`${item.label ?? 'series'}-${index}`} opacity={opacity} style={{ color: item.color }}>
            {shouldFill ? (
              <polygon
                className="souqna-dither-fill"
                points={areaPoints}
                fill={`url(#${id}-fill-${index})`}
              />
            ) : null}
            {shouldFill && pattern === 'hatch' ? (
              <rect
                className="souqna-dither-hatch"
                x={padding}
                y={padding}
                width={width - padding * 2}
                height={height - padding * 2}
                fill={`url(#${id}-hatch-${index})`}
                clipPath={`url(#${id}-clip-${index})`}
              />
            ) : null}
            {shouldFill ? (
              <g className="souqna-dither-pixels" fill={item.color}>
                {ditherPixels.map((pixel) => (
                  <rect
                    key={pixel.key}
                    x={pixel.x}
                    y={pixel.y}
                    width={pixel.size}
                    height={pixel.size}
                    opacity={pixel.opacity}
                    shapeRendering="crispEdges"
                  />
                ))}
              </g>
            ) : null}
            {shouldFill && asciiPixels.length > 0 ? (
              <g
                className="souqna-dither-ascii"
                fill={item.color}
                fontFamily="var(--font-mono)"
                fontSize={Math.max(5, Math.min(8, width / 80))}
                opacity="0.42"
              >
                {asciiPixels.map((pixel) => (
                  <text key={pixel.key} x={pixel.x} y={pixel.y}>
                    {pixel.glyph}
                  </text>
                ))}
              </g>
            ) : null}
            <polyline
              className="souqna-dither-glow"
              points={pointsToString(stepped)}
              fill="none"
              stroke={item.color}
              strokeWidth={density === 'compact' ? 5 : 9}
              strokeOpacity={density === 'compact' ? 0.22 : 0.18}
              strokeLinejoin="miter"
              strokeLinecap="square"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              className="souqna-dither-line"
              points={pointsToString(stepped)}
              fill="none"
              stroke={item.color}
              strokeWidth={density === 'compact' ? 2 : 3}
              strokeDasharray={item.dashed ? '9 7' : undefined}
              strokeLinejoin="miter"
              strokeLinecap="square"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
            />
            {showPoints ? (
              <g className="souqna-dither-points" fill={item.color}>
                {points.map((point, pointIndex) => (
                  <rect
                    key={`${pointIndex}-${point.x}`}
                    x={point.x - 1.8}
                    y={point.y - 1.8}
                    width="3.6"
                    height="3.6"
                    rx="0.8"
                    opacity={density === 'compact' ? 0.45 : 0.78}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function getPoints(
  data: number[],
  width: number,
  height: number,
  padding: number,
  maxValue: number,
): Point[] {
  const values = data.length > 0 ? data : [0, 0];
  const plotted = values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : values;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const scale = Math.max(maxValue, 1);

  return plotted.map((rawValue, index) => ({
    x: padding + (usableWidth * index) / Math.max(plotted.length - 1, 1),
    y: height - padding - (Math.max(0, rawValue) / scale) * usableHeight,
  }));
}

function getSteppedPoints(points: Point[]): Point[] {
  if (points.length <= 1) return points;
  const stepped: Point[] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const next = points[index]!;
    stepped.push({ x: next.x, y: previous.y }, next);
  }
  return stepped;
}

function getAreaPoints(points: Point[], baseline: number): string {
  const first = points[0] ?? { x: 0, y: baseline };
  const last = points[points.length - 1] ?? first;
  return [
    pointsToString(points),
    `${last.x.toFixed(2)},${baseline.toFixed(2)}`,
    `${first.x.toFixed(2)},${baseline.toFixed(2)}`,
  ].join(' ');
}

function getBandPoints(topPoints: Point[], lowerPoints: Point[]): string {
  return [pointsToString(topPoints), pointsToString([...lowerPoints].reverse())].join(' ');
}

function pointsToString(points: Point[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

function getDitherPixels({
  topPoints,
  lowerPoints,
  width,
  height,
  padding,
  baseline,
  columns,
  rows,
}: {
  topPoints: Point[];
  lowerPoints?: Point[];
  width: number;
  height: number;
  padding: number;
  baseline: number;
  columns: number;
  rows: number;
}) {
  const pixels: Array<{ key: string; x: number; y: number; size: number; opacity: number }> = [];
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const cellWidth = usableWidth / Math.max(columns - 1, 1);
  const cellHeight = usableHeight / Math.max(rows - 1, 1);
  const size = Math.max(0.9, Math.min(cellWidth, cellHeight) * 0.24);

  for (let col = 0; col < columns; col += 1) {
    const x = padding + col * cellWidth;
    const lineY = yAtX(topPoints, x);
    const lowerY = lowerPoints ? yAtX(lowerPoints, x) : baseline;
    const depth = Math.max(1, lowerY - lineY);
    for (let row = 0; row < rows; row += 1) {
      const y = padding + row * cellHeight;
      if (y < lineY || y > lowerY) continue;
      const ratio = (y - lineY) / depth;
      const skipLevel = ratio < 0.2 ? 0 : ratio < 0.46 ? 1 : ratio < 0.68 ? 2 : 3;
      if (((col * 17 + row * 29) % 5) < skipLevel) continue;
      pixels.push({
        key: `${col}-${row}`,
        x: Number((x - size / 2).toFixed(2)),
        y: Number((y - size / 2).toFixed(2)),
        size: Number(size.toFixed(2)),
        opacity: Number(Math.max(0.1, 0.68 - ratio * 0.5).toFixed(2)),
      });
    }
  }

  return pixels;
}

function getAsciiPixels({
  topPoints,
  lowerPoints,
  width,
  height,
  padding,
  baseline,
  columns,
  rows,
}: {
  topPoints: Point[];
  lowerPoints?: Point[];
  width: number;
  height: number;
  padding: number;
  baseline: number;
  columns: number;
  rows: number;
}) {
  const pixels: Array<{ key: string; x: number; y: number; glyph: string }> = [];
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const cellWidth = usableWidth / Math.max(columns - 1, 1);
  const cellHeight = usableHeight / Math.max(rows - 1, 1);

  for (let col = 1; col < columns; col += 6) {
    const x = padding + col * cellWidth;
    const lineY = yAtX(topPoints, x);
    const lowerY = lowerPoints ? yAtX(lowerPoints, x) : baseline;
    const depth = Math.max(1, lowerY - lineY);
    for (let row = 1; row < rows; row += 4) {
      const y = padding + row * cellHeight;
      if (y < lineY || y > lowerY) continue;
      if ((col * 11 + row * 7) % 4 !== 0) continue;
      const ratio = (y - lineY) / depth;
      const glyph = ratio < 0.26 ? '#' : ratio < 0.58 ? '+' : '.';
      pixels.push({
        key: `${col}-${row}`,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        glyph,
      });
    }
  }

  return pixels;
}

function getCumulativeSeries(series: DitheredPixelGraphSeries[]): number[][] {
  const length = Math.max(...series.map((item) => item.data.length), 0);
  const totals = Array.from({ length }, () => 0);

  return series.map((item) =>
    Array.from({ length }, (_, index) => {
      const nextTotal = (totals[index] ?? 0) + (item.data[index] ?? 0);
      totals[index] = nextTotal;
      return nextTotal;
    }),
  );
}

function sumSeries(series: DitheredPixelGraphSeries[]): number[] {
  const length = Math.max(...series.map((item) => item.data.length), 0);
  return Array.from({ length }, (_, index) =>
    series.reduce((sum, item) => sum + Math.max(0, item.data[index] ?? 0), 0),
  );
}

function yAtX(points: Point[], x: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0]!.y;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const next = points[index]!;
    if (x <= next.x) return previous.y;
  }
  return points[points.length - 1]!.y;
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
