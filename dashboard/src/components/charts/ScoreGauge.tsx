import { PieChart, Pie, Cell } from 'recharts';

export default function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const data = [
    { value: score },
    { value: 100 - score },
  ];
  const color = score >= 65 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.32}
          outerRadius={size * 0.42}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={color} />
          <Cell fill="#374151" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: size * 0.15 }}>
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}
