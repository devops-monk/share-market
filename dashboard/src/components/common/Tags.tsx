export function MarketTag({ market }: { market: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        market === 'US'
          ? 'bg-blue-900/50 text-blue-300'
          : 'bg-purple-900/50 text-purple-300'
      }`}
    >
      {market}
    </span>
  );
}

export function CapTag({ cap }: { cap: string }) {
  const styles: Record<string, string> = {
    Large: 'bg-emerald-900/50 text-emerald-300',
    Mid: 'bg-amber-900/50 text-amber-300',
    Small: 'bg-red-900/50 text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[cap] || 'bg-gray-700 text-gray-300'}`}>
      {cap}
    </span>
  );
}

export function Trading212Badge() {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-900/50 text-cyan-300">
      T212
    </span>
  );
}

export function SignalBadge({ direction, type }: { direction: string; type: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        direction === 'bearish'
          ? 'bg-red-900/50 text-red-300'
          : 'bg-green-900/50 text-green-300'
      }`}
    >
      {type}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 65 ? 'text-bullish' : score >= 40 ? 'text-neutral' : 'text-bearish';
  return <span className={`font-bold ${color}`}>{score}</span>;
}
