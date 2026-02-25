export default function SentimentBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.1
    ? 'var(--chart-bullish, #16a34a)'
    : score < -0.1
    ? 'var(--chart-bearish, #dc2626)'
    : 'var(--chart-neutral, #d97706)';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums min-w-[40px] text-right" style={{ color }}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </span>
    </div>
  );
}
