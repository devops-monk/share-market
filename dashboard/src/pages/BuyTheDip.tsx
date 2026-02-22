import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

interface DipStock {
  stock: StockRecord;
  matched: string[];
  dipScore: number;
}

function getDipCriteria(stock: StockRecord): string[] {
  const matched: string[] = [];
  if (stock.rsi != null && stock.rsi < 35) matched.push('RSI Oversold');
  if (stock.stochasticK != null && stock.stochasticK < 20) matched.push('Stochastic Oversold');
  if (stock.obvDivergence === 'bullish') matched.push('OBV Bullish Divergence');
  if ((stock.pe != null && stock.pe < 50) || (stock.earningsGrowth != null && stock.earningsGrowth > 0))
    matched.push('Reasonable Fundamentals');
  if (stock.bollingerPercentB != null && stock.bollingerPercentB < 0.1) matched.push('Near Bollinger Lower');
  return matched;
}

export default function BuyTheDip({ stocks }: { stocks: StockRecord[] }) {
  const dipStocks: DipStock[] = stocks
    .map(stock => {
      const matched = getDipCriteria(stock);
      return { stock, matched, dipScore: matched.length };
    })
    .filter(d => d.dipScore >= 2)
    .sort((a, b) => b.dipScore - a.dipScore || (a.stock.rsi ?? 100) - (b.stock.rsi ?? 100));

  if (dipStocks.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold t-primary">Buy the Dip</h1>
          <p className="text-sm t-muted mt-1">Quality stocks that may have dropped too far</p>
        </div>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">☁</div>
          <h3 className="text-lg font-semibold t-secondary mb-1">No dip opportunities right now</h3>
          <p className="t-muted">
            Stocks qualify when 2+ value/reversal signals align — oversold RSI, low stochastic,
            bullish OBV divergence, reasonable fundamentals, or price near the lower Bollinger Band.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold t-primary">Buy the Dip</h1>
          <p className="text-sm t-muted mt-1">Value + reversal candidates with 2+ dip signals</p>
        </div>
        <span className="badge bg-bullish/15 text-bullish ring-1 ring-bullish/30 text-sm">
          {dipStocks.length} match{dipStocks.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {dipStocks.map(({ stock, matched, dipScore }) => (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            className="card p-5 block hover:border-bullish/30 hover:shadow-glow-green transition-all"
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
                  {stock.rsi != null && (
                    <span className="t-muted">
                      RSI <span className={`font-mono ${stock.rsi < 35 ? 'text-bullish' : 't-secondary'}`}>{stock.rsi.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Dip Score</div>
                <div className="text-3xl font-bold font-mono text-bullish">{dipScore}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {matched.map(label => (
                <span
                  key={label}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-bullish/15 text-bullish ring-1 ring-bullish/30"
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
