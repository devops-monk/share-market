import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, SignalBadge, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

export default function BearishAlerts({ alerts }: { alerts: StockRecord[] }) {
  if (alerts.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Bearish Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">Stocks with strong bearish signals</p>
        </div>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-lg font-semibold text-bullish mb-1">All Clear</h3>
          <p className="text-gray-500">No stocks have triggered strong bearish signals at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Bearish Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">Stocks with cumulative bearish score &ge; 4</p>
        </div>
        <span className="badge bg-bearish/15 text-bearish ring-1 ring-bearish/30 text-sm">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map(stock => (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            className="card p-5 block hover:border-bearish/30 hover:shadow-glow-red transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-lg font-bold text-white">{stock.ticker}</span>
                  <span className="text-gray-400">{stock.name}</span>
                  <MarketTag market={stock.market} />
                  <CapTag cap={stock.capCategory} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <PriceDisplay value={stock.price} />
                  <ChangePercent value={stock.changePercent} />
                  {stock.rsi != null && (
                    <span className="text-gray-500">
                      RSI <span className={`font-mono ${stock.rsi > 70 ? 'text-bearish' : 'text-gray-300'}`}>{stock.rsi.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bearish Score</div>
                <div className="text-3xl font-bold font-mono text-bearish">{stock.bearishScore}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {stock.signals
                .filter(s => s.direction === 'bearish')
                .map((s, i) => (
                  <SignalBadge key={i} direction={s.direction} type={s.type} />
                ))}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-surface-border">
              <span className="text-xs text-gray-500">Composite Score:</span>
              <ScoreBadge score={stock.score.composite} size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
