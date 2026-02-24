import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

interface Props {
  score: {
    priceMomentum: number;
    technicalSignals: number;
    newsSentiment: number;
    fundamentals: number;
    volumeTrend: number;
    riskInverse: number;
    composite: number;
  };
}

const DIMENSIONS = [
  { key: 'priceMomentum', label: 'Momentum' },
  { key: 'technicalSignals', label: 'Technical' },
  { key: 'newsSentiment', label: 'Sentiment' },
  { key: 'fundamentals', label: 'Fundamentals' },
  { key: 'volumeTrend', label: 'Volume' },
  { key: 'riskInverse', label: 'Risk (inv.)' },
] as const;

export default function ScoreRadarChart({ score }: Props) {
  const data = DIMENSIONS.map(d => ({
    dimension: d.label,
    value: score[d.key],
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="var(--color-surface-border)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: 'var(--color-t-muted)', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'var(--color-t-faint)', fontSize: 9 }}
          tickCount={5}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-surface-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value}/100`, 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
