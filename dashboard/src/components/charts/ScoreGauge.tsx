export default function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 65 ? 'Bullish' : score >= 40 ? 'Neutral' : 'Bearish';

  // SVG arc geometry
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + radius * 0.1; // shift center down slightly

  // Arc from 180deg (left) to 0deg (right) — a semicircle
  const startAngle = 180;
  const endAngle = 0;
  const scoreAngle = startAngle - (score / 100) * (startAngle - endAngle);

  const toXY = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const start = toXY(startAngle);
  const end = toXY(endAngle);
  const scoreEnd = toXY(scoreAngle);

  // Background arc (full semicircle)
  const bgPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${end.x} ${end.y}`;

  // Score arc
  const sweep = score > 50 ? 1 : 0;
  const scorePath = score > 0
    ? `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep} 1 ${scoreEnd.x} ${scoreEnd.y}`
    : '';

  const viewHeight = size * 0.62;
  const fontSize = size * 0.22;
  const labelSize = size * 0.075;
  const textY = cy + size * 0.02;

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={viewHeight} viewBox={`0 0 ${size} ${viewHeight}`}>
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="#1c2333"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Score fill */}
        {scorePath && (
          <path
            d={scorePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${size * 0.04}px ${color}40)`,
            }}
          />
        )}
        {/* Score number */}
        <text
          x={cx}
          y={textY - fontSize * 0.3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          {score}
        </text>
        {/* Label */}
        <text
          x={cx}
          y={textY + fontSize * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={labelSize}
          fontWeight="600"
          letterSpacing="0.08em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
