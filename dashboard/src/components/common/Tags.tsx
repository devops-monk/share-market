export function MarketTag({ market }: { market: string }) {
  return (
    <span
      className={`badge ${
        market === 'US'
          ? 'bg-sky-600/12 text-sky-500 dark:text-sky-400 ring-1 ring-sky-600/20'
          : 'bg-slate-500/12 text-slate-500 dark:text-slate-400 ring-1 ring-slate-500/20'
      }`}
    >
      {market}
    </span>
  );
}

export function CapTag({ cap }: { cap: string }) {
  const styles: Record<string, string> = {
    Large: 'bg-teal-600/12 text-teal-600 dark:text-teal-400 ring-1 ring-teal-600/20',
    Mid: 'bg-amber-600/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-600/20',
    Small: 'bg-rose-600/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-600/20',
  };
  return (
    <span className={`badge ${styles[cap] || 'bg-gray-500/12 text-gray-500 dark:text-gray-400'}`}>
      {cap}
    </span>
  );
}

export function Trading212Badge() {
  return (
    <span className="badge bg-cyan-600/12 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-600/20">
      T212
    </span>
  );
}

export function SignalBadge({ direction, type }: { direction: string; type: string }) {
  return (
    <span
      className={`badge ${
        direction === 'bearish'
          ? 'bg-red-600/12 text-red-600 dark:text-red-400 ring-1 ring-red-600/20'
          : 'bg-green-600/12 text-green-600 dark:text-green-400 ring-1 ring-green-600/20'
      }`}
    >
      {direction === 'bearish' ? '\u2193' : '\u2191'} {type}
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

export function PriceDisplay({ value, market }: { value: number; market?: 'US' | 'UK' | string }) {
  const currency = market === 'UK' ? '\u00a3' : '$';
  return (
    <span className="font-mono tabular-nums font-medium t-primary">
      {currency}{value.toFixed(2)}
    </span>
  );
}
