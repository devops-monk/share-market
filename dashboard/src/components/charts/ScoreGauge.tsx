export default function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 65 ? 'Bullish' : score >= 40 ? 'Neutral' : 'Bearish';

  // Use a fixed viewBox for clean math, scale via width/height
  const vw = 200;
  const vh = 130;
  const cx = 100;
  const cy = 105;       // arc center near bottom
  const r = 80;          // radius
  const sw = 14;         // stroke width

  // Arc endpoints (180° = left, 0° = right)
  const x1 = cx - r;    // 20
  const x2 = cx + r;    // 180
  const y1 = cy;        // both endpoints at cy
  // Arc peak is at (cx, cy - r) = (100, 25)

  // Background arc (full semicircle from left to right)
  const bgArc = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y1}`;

  // Score arc — sweep from left
  const scoreAngle = Math.PI - (score / 100) * Math.PI; // π (left) to 0 (right)
  const sx = cx + r * Math.cos(scoreAngle);
  const sy = cy - r * Math.sin(scoreAngle);
  const largeArc = score > 50 ? 1 : 0;
  const scoreArc = score > 0
    ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`
    : '';

  // Text positioning — centered inside the semicircle
  const numberY = cy - 24;
  const labelY = cy - 4;

  // Scale to requested size
  const displayH = (vh / vw) * size;

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={displayH} viewBox={`0 0 ${vw} ${vh}`}>
        {/* Background track */}
        <path
          d={bgArc}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Score fill */}
        {scoreArc && (
          <path
            d={scoreArc}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        )}
        {/* Score number */}
        <text
          x={cx}
          y={numberY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="38"
          fontWeight="bold"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          {score}
        </text>
        {/* Label */}
        <text
          x={cx}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="12"
          fontWeight="600"
          letterSpacing="0.1em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
