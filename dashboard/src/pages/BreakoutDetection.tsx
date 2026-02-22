import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

interface BreakoutStock {
  stock: StockRecord;
  matched: string[];
  breakoutScore: number;
}

function getBreakoutCriteria(stock: StockRecord): string[] {
  const matched: string[] = [];
  if (stock.bollingerSqueeze) matched.push('Bollinger Squeeze');
  if (stock.bollingerUpper != null && stock.price > stock.bollingerUpper) matched.push('Above Upper Band');
  if (stock.volumeRatio > 1.5) matched.push('Strong Volume');
  if (stock.obvTrend === 'rising') matched.push('OBV Rising');
  return matched;
}

export default function BreakoutDetection({ stocks }: { stocks: StockRecord[] }) {
  const breakouts: BreakoutStock[] = stocks
    .map(stock => {
      const matched = getBreakoutCriteria(stock);
      return { stock, matched, breakoutScore: matched.length };
    })
    .filter(b => b.breakoutScore >= 2)
    .sort((a, b) => b.breakoutScore - a.breakoutScore || b.stock.volumeRatio - a.stock.volumeRatio);

  if (breakouts.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold t-primary">Breakout Detection</h1>
          <p className="text-sm t-muted mt-1">Stocks poised for a big move after a quiet period</p>
        </div>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">⏸</div>
          <h3 className="text-lg font-semibold t-secondary mb-1">No breakout candidates right now</h3>
          <p className="t-muted">
            Stocks qualify when 2+ breakout signals align — Bollinger squeeze, price above the upper band,
            volume ratio above 1.5x, or rising OBV trend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold t-primary">Breakout Detection</h1>
          <p className="text-sm t-muted mt-1">Stocks with 2+ breakout signals after low-volatility periods</p>
        </div>
        <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30 text-sm">
          {breakouts.length} match{breakouts.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {breakouts.map(({ stock, matched, breakoutScore }) => (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            className="card p-5 block hover:border-accent/30 hover:shadow-glow-blue transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-lg font-bold t-primary">{stock.ticker}</span>
                  <span className="t-tertiary">{stock.name}</span>
                  <MarketTag market={stock.market} />
                  <CapTag cap={stock.capCategory} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <PriceDisplay value={stock.price} market={stock.market} />
                  <ChangePercent value={stock.changePercent} />
                  <span className="t-muted">
                    Vol Ratio <span className={`font-mono ${stock.volumeRatio > 1.5 ? 'text-accent-light' : 't-secondary'}`}>{stock.volumeRatio.toFixed(2)}x</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Breakout Score</div>
                <div className="text-3xl font-bold font-mono text-accent-light">{breakoutScore}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {matched.map(label => (
                <span
                  key={label}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent-light ring-1 ring-accent/30"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
              <span className="text-xs t-muted">Composite Score:</span>
              <ScoreBadge score={stock.score.composite} size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
