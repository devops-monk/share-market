export function MarketTag({ market }: { market: string }) {
  return (
    <span
      className={`badge ${
        market === 'US'
          ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
          : 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20'
      }`}
    >
      {market}
    </span>
  );
}

export function CapTag({ cap }: { cap: string }) {
  const styles: Record<string, string> = {
    Large: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20',
    Mid: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20',
    Small: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/20',
  };
  return (
    <span className={`badge ${styles[cap] || 'bg-gray-500/15 text-gray-400'}`}>
      {cap}
    </span>
  );
}

export function Trading212Badge() {
  return (
    <span className="badge bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20">
      T212
    </span>
  );
}

export function SignalBadge({ direction, type }: { direction: string; type: string }) {
  return (
    <span
      className={`badge ${
        direction === 'bearish'
          ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
          : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
      }`}
    >
      {direction === 'bearish' ? '↓' : '↑'} {type}
    </span>
  );
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = score >= 65 ? 'text-bullish' : score >= 40 ? 'text-neutral' : 'text-bearish';
  const bg = score >= 65 ? 'bg-bullish/10' : score >= 40 ? 'bg-neutral/10' : 'bg-bearish/10';
  const sizeClass = size === 'lg' ? 'text-2xl px-3 py-1' : size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5';

  return (
    <span className={`font-bold font-mono tabular-nums rounded-md ${color} ${bg} ${sizeClass}`}>
      {score}
    </span>
  );
}

export function ChangePercent({ value }: { value: number }) {
  const color = value >= 0 ? 'text-bullish' : 'text-bearish';
  return (
    <span className={`font-mono tabular-nums font-medium ${color}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

export function PriceDisplay({ value, currency = '$' }: { value: number; currency?: string }) {
  return (
    <span className="font-mono tabular-nums font-medium text-white">
      {currency}{value.toFixed(2)}
    </span>
  );
}
