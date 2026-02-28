import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../../types';

interface Props {
  stocks: StockRecord[];
}

export default function SignalsSummaryWidget({ stocks }: Props) {
  const { bullishCount, bearishCount, topBullish, topBearish } = useMemo(() => {
    const bull = stocks.filter(s => s.bullishScore >= 3).sort((a, b) => b.bullishScore - a.bullishScore);
    const bear = stocks.filter(s => s.bearishScore >= 3).sort((a, b) => b.bearishScore - a.bearishScore);
    return {
      bullishCount: bull.length,
      bearishCount: bear.length,
      topBullish: bull.slice(0, 3),
      topBearish: bear.slice(0, 3),
    };
  }, [stocks]);

  return (
    <div className="p-2 text-xs overflow-auto h-full">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 rounded-lg bg-bullish/10 border border-bullish/20">
          <p className="text-lg font-bold text-bullish">{bullishCount}</p>
          <p className="text-[10px] t-muted">Bullish</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bearish/10 border border-bearish/20">
          <p className="text-lg font-bold text-bearish">{bearishCount}</p>
          <p className="text-[10px] t-muted">Bearish</p>
        </div>
      </div>
      {topBullish.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold text-bullish uppercase mb-1">Top Bullish</p>
          {topBullish.map(s => (
            <Link key={s.ticker} to={`/stock/${s.ticker}`} className="block py-0.5 text-accent-light hover:underline">
              {s.ticker} ({s.bullishScore} signals)
            </Link>
          ))}
        </div>
      )}
      {topBearish.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-bearish uppercase mb-1">Top Bearish</p>
          {topBearish.map(s => (
            <Link key={s.ticker} to={`/stock/${s.ticker}`} className="block py-0.5 text-accent-light hover:underline">
              {s.ticker} ({s.bearishScore} signals)
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
