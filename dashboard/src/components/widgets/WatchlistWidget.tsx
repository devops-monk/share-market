import { Link } from 'react-router-dom';
import type { StockRecord } from '../../types';
import { ChangePercent, ScoreBadge } from '../common/Tags';

interface Props {
  stocks: StockRecord[];
}

export default function WatchlistWidget({ stocks }: Props) {
  const watchlist: string[] = JSON.parse(localStorage.getItem('watchlist') || '[]');
  const watched = stocks.filter(s => watchlist.includes(s.ticker));

  if (watched.length === 0) {
    return <p className="text-xs t-muted p-2">No stocks in watchlist. Add some from the Screener.</p>;
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-surface-border">
            <th className="text-left py-1.5 px-2 table-header">Ticker</th>
            <th className="text-right py-1.5 px-2 table-header">Price</th>
            <th className="text-right py-1.5 px-2 table-header">Chg</th>
            <th className="text-right py-1.5 px-2 table-header">Score</th>
          </tr>
        </thead>
        <tbody>
          {watched.map(s => (
            <tr key={s.ticker} className="border-b border-surface-border/30 hover:bg-surface-hover/30">
              <td className="py-1.5 px-2">
                <Link to={`/stock/${s.ticker}`} className="font-medium text-accent-light hover:underline">{s.ticker}</Link>
              </td>
              <td className="text-right py-1.5 px-2 font-mono tabular-nums t-primary">${s.price.toFixed(2)}</td>
              <td className="text-right py-1.5 px-2"><ChangePercent value={s.changePercent} /></td>
              <td className="text-right py-1.5 px-2"><ScoreBadge score={s.score.composite} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
