import { useState, useEffect, useMemo } from 'react';

interface Props {
  ticker: string;
}

export default function ScoreHistoryChart({ ticker }: Props) {
  const [history, setHistory] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<30 | 90>(30);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/score-history.json`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data[ticker] ?? null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [ticker]);

  const chartData = useMemo(() => {
    if (!history) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return Object.entries(history)
      .filter(([date]) => date >= cutoffStr)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, score]) => ({ date, score }));
  }, [history, range]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!history || chartData.length < 2) {
    return (
      <div className="text-center py-6">
        <p className="t-muted text-sm">Score history will appear after a few days of data collection.</p>
      </div>
    );
  }

  // Simple SVG line chart
  const width = 600;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scores = chartData.map(d => d.score);
  const minScore = Math.max(0, Math.min(...scores) - 5);
  const maxScore = Math.min(100, Math.max(...scores) + 5);
  const scoreRange = maxScore - minScore || 1;

  const points = chartData.map((d, i) => ({
    x: padding.left + (i / (chartData.length - 1)) * chartW,
    y: padding.top + chartH - ((d.score - minScore) / scoreRange) * chartH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Gradient fill
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const latest = scores[scores.length - 1];
  const first = scores[0];
  const trend = latest - first;
  const trendColor = trend >= 0 ? '#10b981' : '#ef4444';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold t-primary">{latest}</span>
          <span className={`text-xs font-mono ${trend >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)} pts
          </span>
        </div>
        <div className="flex items-center gap-1">
          {([30, 90] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-accent/15 text-accent-light'
                  : 't-muted hover:t-primary hover:bg-surface-hover'
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`scoreGrad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].filter(v => v >= minScore && v <= maxScore).map(v => {
          const y = padding.top + chartH - ((v - minScore) / scoreRange) * chartH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" className="text-surface-border" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={padding.left - 5} y={y + 3} textAnchor="end" className="fill-current t-faint" fontSize="9">{v}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaD} fill={`url(#scoreGrad-${ticker})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={trendColor} strokeWidth="1.5" />
        {/* Date labels */}
        {chartData.filter((_, i) => i === 0 || i === chartData.length - 1).map((d, i) => (
          <text
            key={i}
            x={i === 0 ? padding.left : width - padding.right}
            y={height - 3}
            textAnchor={i === 0 ? 'start' : 'end'}
            className="fill-current t-faint"
            fontSize="8"
          >
            {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>
    </div>
  );
}
