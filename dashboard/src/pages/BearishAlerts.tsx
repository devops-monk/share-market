import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, SignalBadge, ScoreBadge } from '../components/common/Tags';

export default function BearishAlerts({ alerts }: { alerts: StockRecord[] }) {
  if (alerts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Bearish Alerts</h1>
        <div className="bg-surface-secondary rounded-lg p-8 text-center text-gray-400">
          No bearish alerts at the moment. All clear!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Bearish Alerts</h1>
        <span className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded text-sm font-medium">
          {alerts.length} stocks
        </span>
      </div>
      <p className="text-sm text-gray-400">
        Stocks with strong bearish signals (score &ge; 4). Consider caution or review before investing.
      </p>

      <div className="grid gap-3">
        {alerts.map(stock => (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            className="bg-surface-secondary rounded-lg p-4 hover:bg-surface-tertiary transition-colors block"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{stock.ticker}</span>
                  <span className="text-gray-400">{stock.name}</span>
                  <MarketTag market={stock.market} />
                  <CapTag cap={stock.capCategory} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-300">${stock.price.toFixed(2)}</span>
                  <span className={stock.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                  {stock.rsi != null && (
                    <span className="text-gray-400">RSI: {stock.rsi.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Bearish Score</div>
                <span className="text-2xl font-bold text-bearish">{stock.bearishScore}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {stock.signals
                .filter(s => s.direction === 'bearish')
                .map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <SignalBadge direction={s.direction} type={s.type} />
                    <span className="text-xs text-gray-500">{s.description}</span>
                  </div>
                ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Composite Score:</span>
              <ScoreBadge score={stock.score.composite} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
