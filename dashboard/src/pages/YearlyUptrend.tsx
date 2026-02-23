import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

type SortKey = 'pctBelow' | 'uptrendYears' | 'score' | 'return1y' | 'strength';
type BucketFilter = 'all' | '5' | '10' | '15' | '20' | '25';

interface UptrendStock {
  stock: StockRecord;
  pctBelow: number;
  nearestResistance: { price: number; strength: number };
  nearestSupport: { price: number; strength: number } | null;
  bucket: string; // "5-10%", "10-15%", etc.
  qualitySignals: string[];
}

function getBucket(pct: number): string {
  if (pct < 5) return '0-5%';
  if (pct < 10) return '5-10%';
  if (pct < 15) return '10-15%';
  if (pct < 20) return '15-20%';
  if (pct < 25) return '20-25%';
  return '25%+';
}

function getQualitySignals(stock: StockRecord): string[] {
  const signals: string[] = [];

  // SMA alignment (trend health)
  if (stock.sma50 != null && stock.sma200 != null && stock.sma50 > stock.sma200) {
    signals.push('Golden Cross (SMA50 > SMA200)');
  }

  // SMA200 trending up
  if (stock.sma200Slope != null && stock.sma200Slope > 0) {
    signals.push('SMA200 Trending Up');
  }

  // RSI in healthy zone (not overbought, not deeply oversold)
  if (stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 55) {
    signals.push(`Healthy RSI (${stock.rsi.toFixed(0)})`);
  }

  // Volume not indicating panic
  if (stock.obvTrend === 'rising' || stock.obvTrend === 'flat') {
    signals.push('Volume Healthy (OBV OK)');
  }

  // Good fundamentals
  if (stock.returnOnEquity != null && stock.returnOnEquity > 0.12) {
    signals.push(`Strong ROE (${(stock.returnOnEquity * 100).toFixed(0)}%)`);
  }

  if (stock.earningsGrowth != null && stock.earningsGrowth > 0) {
    signals.push('Positive Earnings Growth');
  }

  // Piotroski quality
  if (stock.piotroskiScore != null && stock.piotroskiScore >= 6) {
    signals.push(`Piotroski ${stock.piotroskiScore}/9`);
  }

  // Accumulation
  if (stock.accDistRating === 'A' || stock.accDistRating === 'B') {
    signals.push(`Accumulation (${stock.accDistRating})`);
  }

  return signals;
}

export default function YearlyUptrend({ stocks }: { stocks: StockRecord[] }) {
  const [minYears, setMinYears] = useState(2);
  const [sortBy, setSortBy] = useState<SortKey>('pctBelow');
  const [marketFilter, setMarketFilter] = useState<'all' | 'US' | 'UK'>('all');
  const [capFilter, setCapFilter] = useState<'all' | 'Large' | 'Mid' | 'Small'>('all');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');

  const uptrendStocks = useMemo(() => {
    const results: UptrendStock[] = [];

    for (const stock of stocks) {
      // Must have multi-year uptrend
      if (stock.yearlyUptrendYears < minYears) continue;
      // Must have resistance data
      if (stock.pctBelowResistance == null || stock.pctBelowResistance <= 0) continue;

      // Market filter
      if (marketFilter !== 'all' && stock.market !== marketFilter) continue;
      // Cap filter
      if (capFilter !== 'all' && stock.capCategory !== capFilter) continue;

      const sr = stock.supportResistance ?? [];
      const resistances = sr.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);
      const supports = sr.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);

      if (resistances.length === 0) continue;

      const pctBelow = stock.pctBelowResistance;
      const bucket = getBucket(pctBelow);

      // Bucket filter
      if (bucketFilter !== 'all') {
        const minBucket = parseInt(bucketFilter);
        if (pctBelow < minBucket) continue;
      }

      results.push({
        stock,
        pctBelow,
        nearestResistance: resistances[0],
        nearestSupport: supports[0] ?? null,
        bucket,
        qualitySignals: getQualitySignals(stock),
      });
    }

    results.sort((a, b) => {
      switch (sortBy) {
        case 'pctBelow':
          return b.pctBelow - a.pctBelow; // highest discount first
        case 'uptrendYears':
          return b.stock.yearlyUptrendYears - a.stock.yearlyUptrendYears || b.pctBelow - a.pctBelow;
        case 'score':
          return b.stock.score.composite - a.stock.score.composite;
        case 'return1y':
          return b.stock.priceReturn1y - a.stock.priceReturn1y;
        case 'strength':
          return b.nearestResistance.strength - a.nearestResistance.strength || b.pctBelow - a.pctBelow;
        default:
          return 0;
      }
    });

    return results;
  }, [stocks, minYears, sortBy, marketFilter, capFilter, bucketFilter]);

  // Bucket summary counts
  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20-25%': 0, '25%+': 0 };
    for (const stock of stocks) {
      if (stock.yearlyUptrendYears < minYears) continue;
      if (stock.pctBelowResistance == null || stock.pctBelowResistance <= 0) continue;
      if (marketFilter !== 'all' && stock.market !== marketFilter) continue;
      if (capFilter !== 'all' && stock.capCategory !== capFilter) continue;
      const bucket = getBucket(stock.pctBelowResistance);
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
    return counts;
  }, [stocks, minYears, marketFilter, capFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold t-primary">Yearly Uptrend</h1>
          <p className="text-sm t-muted mt-1">Multi-year uptrending stocks currently below resistance — buy the discount</p>
        </div>
        <span className="badge bg-bullish/15 text-bullish ring-1 ring-bullish/30 text-sm">
          {uptrendStocks.length} match{uptrendStocks.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* How it works */}
      <div className="card p-4 bg-bullish/5 border-bullish/15">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium t-secondary select-none">
            <span className="text-xs t-muted group-open:rotate-90 transition-transform">&#9654;</span>
            How does this work?
          </summary>
          <div className="mt-3 text-sm t-muted space-y-2">
            <p>
              This screen finds stocks with a <strong className="t-secondary">proven multi-year uptrend</strong> that
              are currently trading <strong className="t-secondary">below their resistance level</strong>. The idea is
              simple: if a stock has been going up consistently for 2-3 years, a pullback to below resistance is a
              potential buying opportunity — you're getting a "discount" on a strong stock.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><strong className="t-secondary">Yearly Uptrend</strong> — Stock must have positive returns in each of the last 2-3 years consecutively</li>
              <li><strong className="t-secondary">Below Resistance</strong> — Current price is below the nearest resistance level (a price ceiling where selling pressure historically appears)</li>
              <li><strong className="t-secondary">% Below Resistance</strong> — How much discount you're getting from resistance. Higher % = bigger pullback = potentially better entry</li>
              <li><strong className="t-secondary">Bucket Filters</strong> — Filter by discount range: 5%, 10%, 15%, 20%, 25%+ below resistance</li>
            </ul>
            <p className="mt-2">
              <strong className="t-secondary">Quality signals</strong> are extra confirmation: golden cross, healthy RSI,
              volume trends, and fundamental quality (ROE, Piotroski, earnings growth). More signals = higher confidence.
            </p>
            <p className="text-xs mt-2 pt-2 border-t border-surface-border">
              <strong>Strategy tip:</strong> Look for stocks 10-20% below resistance with 3-year uptrend and multiple quality signals.
              Set up an <strong>Uptrend Below Resistance</strong> alert in Alert Settings to get notified via Telegram when new candidates appear.
              Always check the Stock Detail page for candlestick confirmation before buying.
            </p>
          </div>
        </details>
      </div>

      {/* Bucket summary bar */}
      <div className="card p-4">
        <div className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Discount Distribution</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(bucketCounts).map(([bucket, count]) => (
            <button
              key={bucket}
              onClick={() => {
                const num = parseInt(bucket);
                setBucketFilter(isNaN(num) ? (bucket.startsWith('25') ? '25' : 'all') : num.toString() as BucketFilter);
              }}
              className={`p-3 rounded-lg text-center transition-all border ${
                count > 0 ? 'cursor-pointer hover:border-bullish/30' : 'opacity-40'
              } ${
                bucketFilter !== 'all' && bucket.startsWith(bucketFilter)
                  ? 'bg-bullish/10 border-bullish/30'
                  : 'bg-surface-tertiary border-surface-border'
              }`}
            >
              <div className="text-lg font-bold font-mono t-primary">{count}</div>
              <div className="text-xs t-muted mt-0.5">{bucket}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium t-muted">Min Uptrend:</label>
          <div className="flex gap-1">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setMinYears(n)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  minYears === n
                    ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {n}yr{n > 1 ? 's' : ''}
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
                    ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/30'
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
                    ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/30'
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
          <label className="text-xs font-medium t-muted">Min Discount:</label>
          <div className="flex gap-1">
            {([['all', 'Any'], ['5', '5%+'], ['10', '10%+'], ['15', '15%+'], ['20', '20%+']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setBucketFilter(val as BucketFilter)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  bucketFilter === val
                    ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {label}
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
            <option value="pctBelow">Biggest Discount</option>
            <option value="uptrendYears">Uptrend Years</option>
            <option value="score">Composite Score</option>
            <option value="return1y">1Y Return</option>
            <option value="strength">Resistance Strength</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {uptrendStocks.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">&#128200;</div>
          <h3 className="text-lg font-semibold t-secondary mb-1">No uptrend discount candidates found</h3>
          <p className="t-muted text-sm">
            Stocks qualify when they have {minYears}+ years of consecutive positive returns and are currently below resistance.
            Try lowering the minimum uptrend years or discount threshold.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {uptrendStocks.map(({ stock, pctBelow, nearestResistance, nearestSupport, bucket, qualitySignals }) => (
            <Link
              key={stock.ticker}
              to={`/stock/${stock.ticker}`}
              className="card p-5 block hover:border-bullish/30 hover:shadow-glow-green transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-lg font-bold t-primary">{stock.ticker}</span>
                    <span className="t-tertiary text-sm">{stock.name}</span>
                    <MarketTag market={stock.market} />
                    <CapTag cap={stock.capCategory} />
                    {/* Uptrend badge */}
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-bullish/15 text-bullish ring-1 ring-bullish/30">
                      {stock.yearlyUptrendYears}yr uptrend
                    </span>
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
                  <div className="text-xs font-medium t-muted uppercase tracking-wider mb-1">Below Resistance</div>
                  <div className={`text-3xl font-bold font-mono ${
                    pctBelow >= 15 ? 'text-bullish' : pctBelow >= 10 ? 'text-accent-light' : 't-secondary'
                  }`}>
                    {pctBelow.toFixed(1)}%
                  </div>
                  <div className="text-xs t-muted mt-0.5">{bucket}</div>
                </div>
              </div>

              {/* Price levels */}
              <div className="flex flex-wrap gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-bearish" />
                  <span className="t-muted">Resistance:</span>
                  <span className="font-mono font-medium t-primary">
                    {stock.market === 'UK' ? '\u00a3' : '$'}{nearestResistance.price.toFixed(2)}
                  </span>
                  <span className="t-muted">({nearestResistance.strength} touches)</span>
                </div>
                {nearestSupport && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-bullish" />
                    <span className="t-muted">Support:</span>
                    <span className="font-mono font-medium t-primary">
                      {stock.market === 'UK' ? '\u00a3' : '$'}{nearestSupport.price.toFixed(2)}
                    </span>
                    <span className="t-muted">({nearestSupport.strength} touches)</span>
                  </div>
                )}
              </div>

              {/* Yearly returns */}
              <div className="flex flex-wrap gap-3 mb-3">
                {stock.yearlyReturns.map((ret, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="t-muted">Year {i + 1}:</span>
                    <span className={`font-mono font-medium ${ret > 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {ret >= 0 ? '+' : ''}{(ret * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="t-muted">3Y Total:</span>
                  <span className={`font-mono font-medium ${stock.priceReturn3y > 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {stock.priceReturn3y >= 0 ? '+' : ''}{(stock.priceReturn3y * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Quality signals */}
              {qualitySignals.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {qualitySignals.map(label => (
                    <span
                      key={label}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-bullish/10 text-bullish ring-1 ring-bullish/20"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-4 pt-3 border-t border-surface-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs t-muted">Composite:</span>
                  <ScoreBadge score={stock.score.composite} size="sm" />
                </div>
                {stock.sector && (
                  <span className="text-xs t-muted">{stock.sector}</span>
                )}
                {stock.minerviniChecks.passed >= 5 && (
                  <span className="text-xs t-muted">
                    Minervini {stock.minerviniChecks.passed}/8
                  </span>
                )}
                {stock.piotroskiScore != null && stock.piotroskiScore >= 5 && (
                  <span className="text-xs t-muted">
                    Piotroski {stock.piotroskiScore}/9
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