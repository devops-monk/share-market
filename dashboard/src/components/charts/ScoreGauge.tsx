import { PieChart, Pie, Cell } from 'recharts';

export default function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const data = [
    { value: score },
    { value: 100 - score },
  ];
  const color = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const bgColor = '#1c2333';
  const label = score >= 65 ? 'Bullish' : score >= 40 ? 'Neutral' : 'Bearish';

  return (
    <div className="relative inline-flex items-center justify-center">
      <PieChart width={size} height={size * 0.65}>
        <Pie
          data={data}
          cx={size / 2}
          cy={size * 0.55}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.30}
          outerRadius={size * 0.40}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={color} />
          <Cell fill={bgColor} />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: size * 0.05 }}>
        <span className="text-3xl font-bold font-mono tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}
