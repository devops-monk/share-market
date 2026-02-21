export default function SentimentBar({ score }: { score: number }) {
  // score is -1 to 1, map to 0-100%
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.1 ? '#22c55e' : score < -0.1 ? '#ef4444' : '#f59e0b';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs" style={{ color }}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </span>
    </div>
  );
}
