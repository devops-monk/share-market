import { useMemo } from 'react';
import type { StockRecord } from '../../types';

interface Props {
  stocks: StockRecord[];
}

export default function SectorHeatWidget({ stocks }: Props) {
  const sectors = useMemo(() => {
    const map = new Map<string, { count: number; avgChange: number; totalChange: number }>();
    for (const s of stocks) {
      const entry = map.get(s.sector) || { count: 0, avgChange: 0, totalChange: 0 };
      entry.count++;
      entry.totalChange += s.changePercent;
      entry.avgChange = entry.totalChange / entry.count;
      map.set(s.sector, entry);
    }
    return [...map.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.avgChange - a.avgChange);
  }, [stocks]);

  return (
    <div className="grid grid-cols-2 gap-1 p-1 overflow-auto h-full">
      {sectors.map(s => {
        const bg = s.avgChange > 0.5
          ? 'bg-bullish/20 border-bullish/30'
          : s.avgChange < -0.5
            ? 'bg-bearish/20 border-bearish/30'
            : 'bg-surface-tertiary/50 border-surface-border';
        return (
          <div key={s.name} className={`p-2 rounded-lg border text-center ${bg}`}>
            <p className="text-[10px] font-medium t-secondary truncate">{s.name}</p>
            <p className={`text-xs font-bold tabular-nums ${s.avgChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {s.avgChange >= 0 ? '+' : ''}{s.avgChange.toFixed(2)}%
            </p>
            <p className="text-[9px] t-muted">{s.count} stocks</p>
          </div>
        );
      })}
    </div>
  );
}
