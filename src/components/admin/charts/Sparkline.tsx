/**
 * Lightweight inline SVG sparkline. Hand-rolled so the dashboard home
 * page can show 30-day trends without pulling in a chart library.
 *
 * Renders a smooth 1.5 px curve with a faint area fill underneath. Empty
 * data and all-zero data both render a flat baseline (no crash, no
 * misleading curve). Padding leaves a few px on every edge so the line
 * never clips against the container border.
 */
type Props = {
  data: number[];
  width?: number;
  height?: number;
  accent?: string;
  ariaLabel?: string;
};

export function Sparkline({
  data,
  width = 120,
  height = 32,
  accent = 'var(--admin-accent)',
  ariaLabel,
}: Props) {
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const len = data.length;
  const baselineY = pad + innerH;
  const safeData = len > 0 ? data : [0];
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;

  const points = safeData.map((v, i) => {
    const x = pad + (len <= 1 ? innerW / 2 : (i / (len - 1)) * innerW);
    const y = pad + innerH - ((v - min) / range) * (innerH * 0.72);
    return { x, y };
  });
  const linePath = smoothPath(points);
  const areaPath =
    safeData.length > 0
      ? `${linePath} L ${(pad + innerW).toFixed(2)},${baselineY.toFixed(2)} L ${pad.toFixed(2)},${baselineY.toFixed(2)} Z`
      : '';

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? 'Trend over time'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {areaPath ? (
        <path d={areaPath} fill={accent} fillOpacity={0.07} stroke="none" />
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeOpacity={0.68}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0]!;
    return `M ${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }

  const commands = [`M ${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const previous = points[index - 1] ?? current;
    const following = points[index + 2] ?? next;
    const controlScale = 0.18;
    const cp1x = current.x + (next.x - previous.x) * controlScale;
    const cp1y = current.y + (next.y - previous.y) * controlScale;
    const cp2x = next.x - (following.x - current.x) * controlScale;
    const cp2y = next.y - (following.y - current.y) * controlScale;
    commands.push(
      `C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`,
    );
  }

  return commands.join(' ');
}
