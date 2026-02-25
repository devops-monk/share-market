import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  data: number[][]; // OHLCV candles
  color?: string;
}

export default function MiniSparkline({ data, color = 'var(--chart-accent, #3b82f6)' }: Props) {
  // Show ~126 trading days (6 months) of close prices
  const recent = data.slice(-126);
  const chartData = recent.map(c => ({ close: c[4] }));

  if (chartData.length < 2) return null;

  // Determine trend color: green if up, red if down
  const first = chartData[0].close;
  const last = chartData[chartData.length - 1].close;
  const trendColor = last >= first
    ? 'var(--chart-bullish, #16a34a)'
    : 'var(--chart-bearish, #dc2626)';

  const finalColor = color === 'auto' ? trendColor : color;

  return (
    <div style={{ width: 200, height: 60 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-${finalColor.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={finalColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={finalColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="close"
            stroke={finalColor}
            strokeWidth={1.5}
            fill={`url(#spark-${finalColor.replace(/[^a-z0-9]/gi, '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
