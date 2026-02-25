import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import MiniSparkline from '../components/charts/MiniSparkline';
import { useOhlcvData } from '../hooks/useOhlcvData';
import InfoTooltip from '../components/common/InfoTooltip';
import { TIPS } from '../lib/tooltips';

/* ─── METRIC DEFINITIONS ─── */
interface MetricDef {
  label: string;
  getValue: (s: StockRecord) => number | string | null | undefined;
  format?: (v: number) => string;
  /** 'higher' = green for highest, 'lower' = green for lowest, 'none' = no highlight */
  bestDirection: 'higher' | 'lower' | 'none';
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pct2 = (v: number) => `${v.toFixed(2)}%`;
const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const f0 = (v: number) => v.toFixed(0);

const METRIC_GROUPS: { title: string; metrics: MetricDef[] }[] = [
  {
    title: 'Price & Momentum',
    metrics: [
      { label: 'Price', getValue: s => s.price, format: f2, bestDirection: 'none' },
      { label: 'Change %', getValue: s => s.changePercent, format: pct2, bestDirection: 'higher' },
      { label: 'Composite Score', getValue: s => s.score.composite, format: f0, bestDirection: 'higher' },
      { label: 'RS Percentile', getValue: s => s.rsPercentile, format: f0, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Valuation',
    metrics: [
      { label: 'P/E', getValue: s => s.pe, format: f1, bestDirection: 'lower' },
      { label: 'Forward P/E', getValue: s => s.forwardPe, format: f1, bestDirection: 'lower' },
      { label: 'PEG Ratio', getValue: s => s.pegRatio, format: f2, bestDirection: 'lower' },
      { label: 'P/B', getValue: s => s.priceToBook, format: f2, bestDirection: 'lower' },
    ],
  },
  {
    title: 'Profitability',
    metrics: [
      { label: 'ROE', getValue: s => s.returnOnEquity, format: pct, bestDirection: 'higher' },
      { label: 'ROA', getValue: s => s.returnOnAssets, format: pct, bestDirection: 'higher' },
      { label: 'Gross Margin', getValue: s => s.grossMargins, format: pct, bestDirection: 'higher' },
      { label: 'Operating Margin', getValue: s => s.operatingMargins, format: pct, bestDirection: 'higher' },
      { label: 'Profit Margin', getValue: s => s.profitMargins, format: pct, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Financial Health',
    metrics: [
      { label: 'Debt/Equity', getValue: s => s.debtToEquity, format: f2, bestDirection: 'lower' },
      { label: 'Current Ratio', getValue: s => s.currentRatio, format: f2, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Technical Indicators',
    metrics: [
      { label: 'RSI', getValue: s => s.rsi, format: f1, bestDirection: 'none' },
      { label: 'SMA 50 vs Price', getValue: s => s.sma50 != null ? ((s.price - s.sma50) / s.sma50) * 100 : null, format: pct2, bestDirection: 'higher' },
      { label: 'SMA 200 vs Price', getValue: s => s.sma200 != null ? ((s.price - s.sma200) / s.sma200) * 100 : null, format: pct2, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Risk & Volatility',
    metrics: [
      { label: 'Beta', getValue: s => s.beta, format: f2, bestDirection: 'lower' },
      { label: 'Volatility', getValue: s => s.volatility, format: pct, bestDirection: 'lower' },
      { label: 'Dividend Yield', getValue: s => s.dividendYield, format: pct, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Signals & Scores',
    metrics: [
      { label: 'Bearish Score', getValue: s => s.bearishScore, format: f0, bestDirection: 'lower' },
      { label: 'Bullish Score', getValue: s => s.bullishScore, format: f0, bestDirection: 'higher' },
    ],
  },
  {
    title: 'Classification',
    metrics: [
      { label: 'Data Completeness', getValue: s => s.dataCompleteness, format: (v: number) => `${v.toFixed(0)}%`, bestDirection: 'higher' },
      { label: 'Style', getValue: s => s.styleClassification, bestDirection: 'none' },
      { label: 'Minervini Checks', getValue: s => s.minerviniChecks.passed, format: (v: number) => `${v}/8`, bestDirection: 'higher' },
    ],
  },
];

/* ─── HELPERS ─── */
function findBestIndex(values: (number | null)[], direction: 'higher' | 'lower'): number | null {
  let bestIdx: number | null = null;
  let bestVal: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    if (bestVal == null) {
      bestVal = v;
      bestIdx = i;
    } else if (direction === 'higher' && v > bestVal) {
      bestVal = v;
      bestIdx = i;
    } else if (direction === 'lower' && v < bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/* ─── COMPONENT ─── */
export default function StockComparison({ stocks }: { stocks: StockRecord[] }) {
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: ohlcvData } = useOhlcvData(selectedTickers);

  const selectedStocks = useMemo(
    () => selectedTickers.map(t => stocks.find(s => s.ticker === t)).filter(Boolean) as StockRecord[],
    [selectedTickers, stocks],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return stocks
      .filter(s =>
        !selectedTickers.includes(s.ticker) &&
        (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [searchQuery, stocks, selectedTickers]);

  const addStock = (ticker: string) => {
    if (selectedTickers.length >= 4) return;
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers(prev => [...prev, ticker]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeStock = (ticker: string) => {
    setSelectedTickers(prev => prev.filter(t => t !== ticker));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Stock Comparison</h1>
        <p className="text-sm t-muted mt-1">Compare up to 4 stocks side by side</p>
      </div>

      {/* Search & chips */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="input-field w-60"
              disabled={selectedTickers.length >= 4}
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-surface-secondary border border-surface-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {searchResults.map(s => (
                  <button
                    key={s.ticker}
                    onMouseDown={() => addStock(s.ticker)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2"
                  >
                    <span className="font-semibold text-accent-light text-sm">{s.ticker}</span>
                    <span className="t-muted text-xs truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected chips */}
          {selectedTickers.map(ticker => (
            <span
              key={ticker}
              className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 flex items-center gap-1.5 px-2.5 py-1"
            >
              {ticker}
              <button
                onClick={() => removeStock(ticker)}
                className="hover:text-bearish transition-colors text-xs font-bold ml-0.5"
              >
                x
              </button>
            </span>
          ))}

          {selectedTickers.length > 0 && (
            <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
              {selectedTickers.length}/4 selected
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {selectedStocks.length === 0 && (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">Search and select 2-4 stocks above to begin comparing.</p>
        </div>
      )}

      {/* Comparison content */}
      {selectedStocks.length >= 1 && (
        <>
          {/* Stock headers with gauges */}
          <div className="card-flat overflow-hidden">
            <div className="grid gap-0" style={{ gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)` }}>
              {/* Empty top-left cell */}
              <div className="p-4 border-b border-r border-surface-border" />
              {selectedStocks.map(stock => (
                <div key={stock.ticker} className="p-4 border-b border-r border-surface-border last:border-r-0 text-center">
                  <Link to={`/stock/${stock.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors text-lg">
                    {stock.ticker}
                  </Link>
                  <p className="t-muted text-xs mt-0.5 truncate">{stock.name}</p>
                  <div className="flex justify-center mt-2">
                    <ScoreGauge score={stock.score.composite} size={90} />
                  </div>
                  {ohlcvData.has(stock.ticker) && (
                    <div className="flex justify-center mt-2">
                      <MiniSparkline data={ohlcvData.get(stock.ticker)!} color="auto" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Metric rows */}
            {METRIC_GROUPS.map(group => (
              <div key={group.title}>
                {/* Group header */}
                <div
                  className="grid gap-0"
                  style={{ gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)` }}
                >
                  <div
                    className="px-4 py-2 bg-surface-tertiary/50 border-b border-r border-surface-border text-xs font-semibold t-tertiary uppercase tracking-wider"
                    style={{ gridColumn: `1 / -1` }}
                  >
                    {group.title}
                  </div>
                </div>

                {group.metrics.map(metric => {
                  const rawValues = selectedStocks.map(s => {
                    const v = metric.getValue(s);
                    return typeof v === 'number' ? v : null;
                  });

                  const bestIdx = metric.bestDirection !== 'none'
                    ? findBestIndex(rawValues, metric.bestDirection)
                    : null;

                  return (
                    <div
                      key={metric.label}
                      className="grid gap-0"
                      style={{ gridTemplateColumns: `180px repeat(${selectedStocks.length}, 1fr)` }}
                    >
                      {/* Label cell */}
                      <div className="px-4 py-2.5 border-b border-r border-surface-border text-sm t-tertiary flex items-center">
                        <InfoTooltip text={TIPS[metric.label] ?? ''}>{metric.label}</InfoTooltip>
                      </div>

                      {/* Value cells */}
                      {selectedStocks.map((stock, idx) => {
                        const raw = metric.getValue(stock);
                        const isNumeric = typeof raw === 'number';
                        const isBest = bestIdx === idx && isNumeric;

                        let display: string;
                        if (raw == null) {
                          display = '--';
                        } else if (typeof raw === 'string') {
                          display = raw;
                        } else if (metric.format) {
                          display = metric.format(raw);
                        } else {
                          display = String(raw);
                        }

                        let colorClass = 't-primary';
                        if (raw == null) colorClass = 't-faint';
                        else if (isBest && selectedStocks.length >= 2) colorClass = 'text-bullish font-bold';

                        return (
                          <div
                            key={stock.ticker}
                            className={`px-4 py-2.5 border-b border-r border-surface-border last:border-r-0 text-center font-mono tabular-nums text-sm ${isBest && selectedStocks.length >= 2 ? 'bg-bullish/5' : ''}`}
                          >
                            <span className={colorClass}>{display}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
