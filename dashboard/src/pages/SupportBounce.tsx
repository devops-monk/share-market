import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';
import { currencySymbol } from '../lib/format';

interface BounceStock {
  stock: StockRecord;
  matched: string[];
  bounceScore: number;
  nearestSupport: { price: number; strength: number } | null;
  nearestResistance: { price: number; strength: number } | null;
  distanceToSupport: number; // percentage distance to nearest support
}

type SortKey = 'bounceScore' | 'distanceToSupport' | 'supportStrength' | 'score' | 'rsi';

function getBounceCriteria(stock: StockRecord): {
  matched: string[];
  nearestSupport: { price: number; strength: number } | null;
  nearestResistance: { price: number; strength: number } | null;
  distanceToSupport: number;
} {
  const matched: string[] = [];
  const sr = stock.supportResistance ?? [];

  const supports = sr.filter(l => l.type === 'support').sort((a, b) => b.price - a.price); // closest first
  const resistances = sr.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price); // closest first

  const nearestSupport = supports[0] ?? null;
  const nearestResistance = resistances[0] ?? null;

  if (!nearestSupport) return { matched, nearestSupport, nearestResistance, distanceToSupport: 999 };

  const distanceToSupport = ((stock.price - nearestSupport.price) / stock.price) * 100;

  // 1. Price near strong support (within 4% of a support level)
  if (distanceToSupport >= 0 && distanceToSupport <= 4) {
    matched.push(`Near Support (${distanceToSupport.toFixed(1)}% away)`);
  }

  // 2. Support has good strength (tested multiple times)
  if (nearestSupport.strength >= 3) {
    matched.push(`Strong Support (${nearestSupport.strength} touches)`);
  }

  // 3. Uptrend intact: SMA50 > SMA200 (golden cross)
  if (stock.sma50 != null && stock.sma200 != null && stock.sma50 > stock.sma200) {
    matched.push('Uptrend (SMA50 > SMA200)');
  }

  // 4. RSI in healthy pullback zone (30-50) — not broken, not overbought
  if (stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 50) {
    matched.push(`Healthy Pullback (RSI ${stock.rsi.toFixed(0)})`);
  }

  // 5. Volume not spiking on decline (no panic selling) or OBV still healthy
  if (stock.obvTrend === 'rising' || stock.obvTrend === 'flat') {
    matched.push('No Panic Selling (OBV OK)');
  }

  // 6. Reasonable fundamentals
  if ((stock.pe != null && stock.pe > 0 && stock.pe < 40) || (stock.earningsGrowth != null && stock.earningsGrowth > 0)) {
    matched.push('Reasonable Fundamentals');
  }

  // 7. Previously was near resistance (price pulled back — 52wk range shows it was higher)
  if (stock.fiftyTwoWeekRangePercent > 40 && stock.fiftyTwoWeekRangePercent < 85) {
    matched.push('Pulled Back from Higher Levels');
  }

  return { matched, nearestSupport, nearestResistance, distanceToSupport };
}

export default function SupportBounce({ stocks }: { stocks: StockRecord[] }) {
  const [minScore, setMinScore] = useState(3);
  const [sortBy, setSortBy] = useState<SortKey>('bounceScore');
  const [marketFilter, setMarketFilter] = useState<'all' | 'US' | 'UK'>('all');
  const [capFilter, setCapFilter] = useState<'all' | 'Large' | 'Mid' | 'Small'>('all');

  const bounceStocks: BounceStock[] = stocks
    .map(stock => {
      const { matched, nearestSupport, nearestResistance, distanceToSupport } = getBounceCriteria(stock);
      return { stock, matched, bounceScore: matched.length, nearestSupport, nearestResistance, distanceToSupport };
    })
    .filter(d => d.bounceScore >= minScore)
    .filter(d => marketFilter === 'all' || d.stock.market === marketFilter)
    .filter(d => capFilter === 'all' || d.stock.capCategory === capFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'bounceScore':
          return b.bounceScore - a.bounceScore || a.distanceToSupport - b.distanceToSupport;
        case 'distanceToSupport':
          return a.distanceToSupport - b.distanceToSupport;
        case 'supportStrength':
          return (b.nearestSupport?.strength ?? 0) - (a.nearestSupport?.strength ?? 0);
        case 'score':
          return b.stock.score.composite - a.stock.score.composite;
        case 'rsi':
          return (a.stock.rsi ?? 100) - (b.stock.rsi ?? 100);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold t-primary">Support Bounce</h1>
          <p className="text-sm t-muted mt-1">Stocks pulling back to support — potential bounce candidates</p>
        </div>
        <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30 text-sm">
          {bounceStocks.length} match{bounceStocks.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* How it works */}
      <div className="card p-4 bg-accent/5 border-accent/15">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium t-secondary select-none">
            <span className="text-xs t-muted group-open:rotate-90 transition-transform">&#9654;</span>
            How does this work?
          </summary>
          <div className="mt-3 text-sm t-muted space-y-2">
            <p>
              This page finds stocks that have pulled back from higher prices and are now near a
              <strong className="t-secondary"> support level</strong> — a price zone where buyers have historically stepped in.
              These are potential bounce-buy opportunities.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><strong className="t-secondary">Near Support</strong> — Price within 4% of a tested support level</li>
              <li><strong className="t-secondary">Strong Support</strong> — Support level tested 3+ times (more reliable)</li>
              <li><strong className="t-secondary">Uptrend Intact</strong> — SMA50 still above SMA200, so the longer-term trend is bullish</li>
              <li><strong className="t-secondary">Healthy Pullback</strong> — RSI between 30-50, not in free-fall but cooled off</li>
              <li><strong className="t-secondary">No Panic Selling</strong> — OBV (volume trend) is flat or rising, meaning smart money isn't exiting</li>
              <li><strong className="t-secondary">Reasonable Fundamentals</strong> — P/E under 40 or positive earnings growth</li>
              <li><strong className="t-secondary">Pulled Back from Higher Levels</strong> — Was trading at higher levels recently (40-85% of 52-week range)</li>
            </ul>
            <p>
              The <strong className="t-secondary">Bounce Score</strong> (1-7) counts how many conditions match.
              Higher score = stronger setup. Look for stocks with 4+ matching criteria for the best opportunities.
            </p>
            <p className="text-xs mt-2 pt-2 border-t border-surface-border">
              <strong>Strategy tip:</strong> Combine this with the Stock Detail page to check the candlestick chart
              and confirm that price is actually bouncing off support before buying. Look for bullish candlestick patterns
              (hammer, engulfing) at the support level for extra confirmation.
            </p>
          </div>
        </details>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium t-muted">Min Score:</label>
          <div className="flex gap-1">
            {[2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setMinScore(n)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  minScore === n
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-surface-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium t-muted">Market:</label>
          <div className="flex gap-1">
            {(['all', 'US', 'UK'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  marketFilter === m
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {m === 'all' ? 'All' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-surface-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium t-muted">Cap:</label>
          <div className="flex gap-1">
            {(['all', 'Large', 'Mid', 'Small'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCapFilter(c)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  capFilter === c
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-5 bg-surface-border" />

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium t-muted">Sort:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="text-xs bg-surface-tertiary border border-surface-border rounded-md px-2 py-1 t-secondary"
          >
            <option value="bounceScore">Bounce Score</option>
            <option value="distanceToSupport">Closest to Support</option>
            <option value="supportStrength">Support Strength</option>
            <option value="score">Composite Score</option>
            <option value="rsi">Lowest RSI</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {bounceStocks.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">&#9974;</div>
          <h3 className="text-lg font-semibold t-secondary mb-1">No support bounce candidates right now</h3>
          <p className="t-muted text-sm">
            Stocks qualify when {minScore}+ support-bounce signals align. Try lowering the minimum score
            or check back after a market pullback when more stocks reach support levels.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bounceStocks.map(({ stock, matched, bounceScore, nearestSupport, nearestResistance, distanceToSupport }) => (
            <Link
              key={stock.ticker}
              to={`/stock/${stock.ticker}`}
              className="card p-5 block hover:border-accent/30 hover:shadow-glow-blue transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-lg font-bold t-primary">{stock.ticker}</span>
                    <span className="t-tertiary text-sm">{stock.name}</span>
                    <MarketTag market={stock.market} />
                    <CapTag cap={stock.capCategory} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <PriceDisplay value={stock.price} market={stock.market} />
                    <ChangePercent value={stock.changePercent} />
                    {stock.rsi != null && (
                      <span className="t-muted">
                        RSI{' '}
                        <span className={`font-mono ${stock.rsi < 40 ? 'text-bullish' : stock.rsi > 70 ? 'text-bearish' : 't-secondary'}`}>
                          {stock.rsi.toFixed(1)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Bounce Score</div>
                  <div className={`text-3xl font-bold font-mono ${bounceScore >= 5 ? 'text-bullish' : bounceScore >= 4 ? 'text-accent-light' : 't-secondary'}`}>
                    {bounceScore}
                  </div>
                </div>
              </div>

              {/* Support / Resistance levels */}
              <div className="flex flex-wrap gap-4 mb-3 text-xs">
                {nearestSupport && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-bullish" />
                    <span className="t-muted">Support:</span>
                    <span className="font-mono font-medium t-primary">
                      {currencySymbol(stock.market)}{nearestSupport.price.toFixed(2)}
                    </span>
                    <span className="t-muted">({nearestSupport.strength} touches)</span>
                    <span className="font-mono text-bullish">{distanceToSupport.toFixed(1)}% away</span>
                  </div>
                )}
                {nearestResistance && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-bearish" />
                    <span className="t-muted">Resistance:</span>
                    <span className="font-mono font-medium t-primary">
                      {currencySymbol(stock.market)}{nearestResistance.price.toFixed(2)}
                    </span>
                    <span className="t-muted">({nearestResistance.strength} touches)</span>
                  </div>
                )}
                {nearestSupport && nearestResistance && (
                  <div className="flex items-center gap-1.5">
                    <span className="t-muted">Risk/Reward:</span>
                    <span className="font-mono font-medium text-accent-light">
                      1:{((nearestResistance.price - stock.price) / (stock.price - nearestSupport.price || 0.01)).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Matched criteria tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {matched.map(label => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent-light ring-1 ring-accent/20"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 pt-3 border-t border-surface-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs t-muted">Composite:</span>
                  <ScoreBadge score={stock.score.composite} size="sm" />
                </div>
                {stock.sector && (
                  <span className="text-xs t-muted">{stock.sector}</span>
                )}
                {stock.sectorRank != null && stock.sectorCount != null && (
                  <span className="text-xs t-muted">
                    Sector Rank: {stock.sectorRank}/{stock.sectorCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}