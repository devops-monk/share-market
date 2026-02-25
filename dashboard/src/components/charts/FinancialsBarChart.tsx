import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { FinancialYear } from '../../hooks/useStockData';

function formatLargeNum(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

export default function FinancialsBarChart({ data }: { data: FinancialYear[] }) {
  // Sort oldest to newest
  const sorted = [...data].sort((a, b) => a.y.localeCompare(b.y));

  const chartData = sorted.map(d => ({
    year: d.y,
    Revenue: d.rev,
    'Net Income': d.ni,
    'Gross Profit': d.gp,
    'Operating Income': d.oi,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, var(--surface-border))" />
        <XAxis
          dataKey="year"
          tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--surface-border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatLargeNum}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--surface-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatLargeNum(value), undefined]}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        <Bar dataKey="Revenue" fill="var(--chart-accent, #3b82f6)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Gross Profit" fill="var(--chart-bullish, #16a34a)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Operating Income" fill="var(--chart-neutral, #d97706)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="Net Income" fill="var(--chart-accent-light, #60a5fa)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
