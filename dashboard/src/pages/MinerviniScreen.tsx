import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, MarketTag, CapTag } from '../components/common/Tags';
import { currencySymbol } from '../lib/format';

const CHECK_LABELS: { key: keyof StockRecord['minerviniChecks']; label: string }[] = [
  { key: 'priceAbove150and200', label: 'Price above 150 & 200 SMA' },
  { key: 'sma150Above200', label: '150 SMA above 200 SMA' },
  { key: 'sma200Trending', label: '200 SMA trending up (1 month+)' },
  { key: 'sma50Above150and200', label: '50 SMA above 150 & 200 SMA' },
  { key: 'priceAbove50', label: 'Price above 50 SMA' },
  { key: 'price30PctAboveLow', label: 'Price 30%+ above 52-week low' },
  { key: 'priceWithin25PctOfHigh', label: 'Price within 25% of 52-week high' },
  { key: 'rsAbove70', label: 'RS Percentile above 70' },
];

export default function MinerviniScreen({ stocks }: { stocks: StockRecord[] }) {
  const [minPassed, setMinPassed] = useState(6);

  const filtered = useMemo(() => {
    return stocks
      .filter(s => s.minerviniChecks.passed >= minPassed)
      .sort((a, b) => {
        if (b.minerviniChecks.passed !== a.minerviniChecks.passed) {
          return b.minerviniChecks.passed - a.minerviniChecks.passed;
        }
        return b.rsPercentile - a.rsPercentile;
      });
  }, [stocks, minPassed]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Minervini Trend Template</h1>
        <p className="text-sm t-muted mt-1">
          Stocks passing Mark Minervini's SEPA trend criteria
        </p>
      </div>

      {/* Explanation */}
      <div className="card p-4 bg-accent/5 border-accent/15">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium t-secondary select-none">
            <span className="text-xs t-muted group-open:rotate-90 transition-transform">&#9654;</span>
            What is the Minervini Trend Template?
          </summary>
          <div className="mt-3 text-sm t-muted space-y-2">
            <p>
              Mark Minervini's <strong className="t-secondary">SEPA (Specific Entry Point Analysis)</strong> strategy
              identifies stocks in a confirmed Stage 2 uptrend -- the phase where stocks make their biggest gains.
              The trend template uses 8 criteria based on moving averages, price positioning, and relative strength.
            </p>
            <p>
              Stocks passing <strong className="t-secondary">all 8 checks</strong> are in a textbook uptrend.
              Those with 6-7 checks are approaching or transitioning into Stage 2. Stocks with fewer than 6
              are typically not in the ideal buying zone.
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              {CHECK_LABELS.map(c => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ol>
          </div>
        </details>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm t-muted">Minimum checks passed:</span>
          <div className="flex items-center gap-1.5">
            {[5, 6, 7, 8].map(n => (
              <button
                key={n}
                onClick={() => setMinPassed(n)}
                className={`min-w-[36px] h-8 rounded-md text-sm font-medium transition-colors ${
                  minPassed === n
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                    : 't-tertiary hover:t-primary hover:bg-surface-hover'
                }`}
              >
                {n}/8
              </button>
            ))}
          </div>
          <span className="ml-auto badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
            {filtered.length} stock{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">--</div>
          <h3 className="text-lg font-semibold t-secondary mb-1">No stocks match</h3>
          <p className="t-muted">
            Try lowering the minimum checks to see more results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(stock => {
            const checks = stock.minerviniChecks;
            const changeColor = stock.changePercent >= 0 ? 'text-bullish' : 'text-bearish';

            return (
              <Link
                key={stock.ticker}
                to={`/stock/${stock.ticker}`}
                className="card p-5 block hover:border-accent/30 hover:shadow-glow-blue transition-all"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-lg font-bold t-primary">{stock.ticker}</span>
                      <span className="t-tertiary">{stock.name}</span>
                      <MarketTag market={stock.market} />
                      <CapTag cap={stock.capCategory} />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono tabular-nums font-medium t-primary">
                        {currencySymbol(stock.market)}{stock.price.toFixed(2)}
                      </span>
                      <span className={`font-mono tabular-nums font-medium ${changeColor}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                      <span className="t-muted">
                        RS <span className={`font-mono font-semibold ${
                          stock.rsPercentile >= 70 ? 'text-bullish' : stock.rsPercentile >= 40 ? 'text-neutral' : 'text-bearish'
                        }`}>{stock.rsPercentile}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Checks</div>
                      <div className={`text-3xl font-bold font-mono ${
                        checks.passed === 8 ? 'text-bullish' : checks.passed >= 6 ? 'text-neutral' : 'text-bearish'
                      }`}>
                        {checks.passed}<span className="text-lg t-faint">/8</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
                  {CHECK_LABELS.map(({ key, label }) => {
                    const passed = key === 'passed' ? false : checks[key] as boolean;
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className={`text-base leading-none ${passed ? 'text-bullish' : 'text-bearish'}`}>
                          {passed ? '\u2713' : '\u2717'}
                        </span>
                        <span className={passed ? 't-secondary' : 't-faint'}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                  <span className="text-xs t-muted">Composite Score:</span>
                  <ScoreBadge score={stock.score.composite} size="sm" />
                  {stock.rsi != null && (
                    <>
                      <span className="text-xs t-muted ml-2">RSI:</span>
                      <span className={`text-xs font-mono tabular-nums ${
                        stock.rsi > 70 ? 'text-bearish' : stock.rsi < 30 ? 'text-bullish' : 't-secondary'
                      }`}>
                        {stock.rsi.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
