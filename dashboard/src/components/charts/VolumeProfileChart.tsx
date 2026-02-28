import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface VolumeProfileData {
  bins: { price: number; volume: number }[];
  vpoc: number;
  valueAreaHigh: number;
  valueAreaLow: number;
}

interface Props {
  data: VolumeProfileData;
  currentPrice: number;
  currency?: string;
}

export default function VolumeProfileChart({ data, currentPrice, currency = '$' }: Props) {
  const chartData = data.bins
    .filter(b => b.volume > 0)
    .map(b => ({
      price: b.price,
      volume: b.volume,
      label: `${currency}${b.price.toFixed(2)}`,
      inValueArea: b.price >= data.valueAreaLow && b.price <= data.valueAreaHigh,
      isVpoc: Math.abs(b.price - data.vpoc) < (data.bins[1]?.price - data.bins[0]?.price || 1),
    }));

  const height = Math.max(300, chartData.length * 8);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
          <XAxis type="number" hide />
          <YAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => `${currency}${v.toFixed(0)}`}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            width={55}
            reversed
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-surface-secondary border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
                  <p className="font-medium t-primary">{currency}{d.price.toFixed(2)}</p>
                  <p className="t-muted">Volume: {(d.volume / 1e6).toFixed(1)}M</p>
                  {d.isVpoc && <p className="text-amber-400 font-semibold">VPOC</p>}
                  {d.inValueArea && <p className="text-accent-light">Value Area</p>}
                </div>
              );
            }}
          />
          <ReferenceLine
            y={currentPrice}
            stroke="var(--chart-accent)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Now ${currency}${currentPrice.toFixed(2)}`,
              position: 'right',
              fill: 'var(--chart-accent)',
              fontSize: 10,
            }}
          />
          <Bar dataKey="volume" radius={[0, 2, 2, 0]} maxBarSize={12}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.isVpoc
                    ? '#f59e0b'
                    : entry.inValueArea
                      ? 'var(--chart-accent)'
                      : 'var(--text-faint)'
                }
                fillOpacity={entry.isVpoc ? 0.9 : entry.inValueArea ? 0.6 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
