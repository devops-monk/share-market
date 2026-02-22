import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, SignalBadge, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

export default function BearishAlerts({ alerts }: { alerts: StockRecord[] }) {
  if (alerts.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold t-primary">Bearish Alerts</h1>
          <p className="text-sm t-muted mt-1">Stocks with strong bearish signals</p>
        </div>
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-lg font-semibold text-bullish mb-1">All Clear</h3>
          <p className="t-muted">No stocks have triggered strong bearish signals at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold t-primary">Bearish Alerts</h1>
          <p className="text-sm t-muted mt-1">Stocks with cumulative bearish score &ge; 4</p>
        </div>
        <span className="badge bg-bearish/15 text-bearish ring-1 ring-bearish/30 text-sm">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card p-4 bg-bearish/5 border-bearish/15">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium t-secondary select-none">
            <span className="text-xs t-muted group-open:rotate-90 transition-transform">&#9654;</span>
            How does this work?
          </summary>
          <div className="mt-3 text-sm t-muted space-y-2">
            <p>
              Each stock is checked for bearish technical signals — things like RSI overbought (&gt;70),
              bearish MACD crossovers, death crosses (SMA50 below SMA200), and declining OBV.
              Each signal adds to a cumulative <strong className="t-secondary">Bearish Score</strong>.
            </p>
            <p>
              Stocks appear here when their bearish score reaches <strong className="t-secondary">4 or higher</strong>,
              meaning multiple danger signals are firing at the same time. A higher score means more reasons for caution.
              The red badges show exactly which signals triggered.
            </p>
          </div>
        </details>
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
                      RSI <span className={`font-mono ${stock.rsi > 70 ? 'text-bearish' : 't-secondary'}`}>{stock.rsi.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Bearish Score</div>
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
              <span className="text-xs t-muted">Composite Score:</span>
              <ScoreBadge score={stock.score.composite} size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
