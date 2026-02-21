import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StockRecord } from '../../types';

export default function PriceChart({ stock }: { stock: StockRecord }) {
  // We don't have full historical in the JSON (stripped for size),
  // but we can show key levels as a static display
  const levels = [
    { label: '52W Low', value: stock.fiftyTwoWeekLow },
    { label: 'SMA200', value: stock.sma200 },
    { label: 'SMA50', value: stock.sma50 },
    { label: 'Current', value: stock.price },
    { label: '52W High', value: stock.fiftyTwoWeekHigh },
  ].filter(l => l.value != null) as { label: string; value: number }[];

  levels.sort((a, b) => a.value - b.value);

  const data = levels.map(l => ({ name: l.label, price: l.value }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={60}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
          />
          <Line type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
