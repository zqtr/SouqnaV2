/**
 * Vertical-bar counterpart to `Sparkline`. Same hand-rolled spirit —
 * one polyline per data point, no chart library. Used on the dashboard
 * home for the 30-day orders trend, where a discrete bar reads more
 * accurately than an interpolated line for a low-cardinality series.
 */
type Props = {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  ariaLabel?: string;
};

export function MiniBarChart({
  data,
  width = 120,
  height = 32,
  accent = 'var(--admin-accent)',
  ariaLabel,
}: Props) {
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const len = data.length || 1;
  const max = Math.max(...(data.length ? data : [0]));
  const hasActivity = max > 0;
  const barGap = 1.6;
  const barW = Math.max(1, (innerW - barGap * (len - 1)) / len);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? 'Orders by day'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={height - pad - 0.5}
        y2={height - pad - 0.5}
        stroke={accent}
        strokeOpacity={0.18}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {data.map((v, i) => {
        const norm = max > 0 ? v / max : 0;
        const h = v > 0 ? Math.max(3, norm * innerH * 0.72) : 1;
        const x = pad + i * (barW + barGap);
        const y = pad + innerH - h;
        return (
          <rect
            key={i}
            x={x.toFixed(2)}
            y={y.toFixed(2)}
            width={barW.toFixed(2)}
            height={h.toFixed(2)}
            fill={accent}
            fillOpacity={v > 0 ? 0.46 : hasActivity ? 0.08 : 0.14}
            rx={1}
          />
        );
      })}
    </svg>
  );
}
