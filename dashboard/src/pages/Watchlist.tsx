import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, ChangePercent, MarketTag, CapTag } from '../components/common/Tags';
import { currencySymbol } from '../lib/format';
import InfoTooltip from '../components/common/InfoTooltip';
import { TIPS } from '../lib/tooltips';

/* ─── WATCHLIST HOOK ─── */
const STORAGE_KEY = 'sm-watchlist';

function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWatchlist(tickers: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(readWatchlist);

  // Sync to localStorage on every change
  useEffect(() => {
    writeWatchlist(watchlist);
  }, [watchlist]);

  const addTicker = useCallback((ticker: string) => {
    setWatchlist(prev => {
      if (prev.includes(ticker)) return prev;
      return [...prev, ticker];
    });
  }, []);

  const removeTicker = useCallback((ticker: string) => {
    setWatchlist(prev => prev.filter(t => t !== ticker));
  }, []);

  const isWatched = useCallback(
    (ticker: string) => watchlist.includes(ticker),
    [watchlist],
  );

  return { watchlist, addTicker, removeTicker, isWatched };
}

/* ─── WATCHLIST PAGE ─── */
export default function Watchlist({ stocks }: { stocks: StockRecord[] }) {
  const { watchlist, addTicker, removeTicker } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const watchedStocks = useMemo(
    () => watchlist
      .map(t => stocks.find(s => s.ticker === t))
      .filter(Boolean) as StockRecord[],
    [watchlist, stocks],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return stocks
      .filter(s =>
        !watchlist.includes(s.ticker) &&
        (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [searchQuery, stocks, watchlist]);

  const handleAdd = (ticker: string) => {
    addTicker(ticker);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Watchlist</h1>
        <p className="text-sm t-muted mt-1">Track your favourite stocks in one place</p>
      </div>

      {/* Search to add */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search ticker or name to add..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="input-field w-64"
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-surface-secondary border border-surface-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {searchResults.map(s => (
                  <button
                    key={s.ticker}
                    onMouseDown={() => handleAdd(s.ticker)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2"
                  >
                    <span className="font-semibold text-accent-light text-sm">{s.ticker}</span>
                    <span className="t-muted text-xs truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
            {watchedStocks.length} watched
          </span>
        </div>
      </div>

      {/* Empty state */}
      {watchedStocks.length === 0 && (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">No stocks in your watchlist. Use the search above to add stocks.</p>
        </div>
      )}

      {/* Watchlist table */}
      {watchedStocks.length > 0 && (
        <div className="card-flat overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-3 text-left table-header">Ticker</th>
                  <th className="px-4 py-3 text-left table-header">Name</th>
                  <th className="px-4 py-3 text-left table-header"><InfoTooltip text={TIPS['Market']}>Market</InfoTooltip></th>
                  <th className="px-4 py-3 text-right table-header"><InfoTooltip text={TIPS['Price']}>Price</InfoTooltip></th>
                  <th className="px-4 py-3 text-right table-header"><InfoTooltip text={TIPS['Change']}>Change</InfoTooltip></th>
                  <th className="px-4 py-3 text-center table-header"><InfoTooltip text={TIPS['Score']}>Score</InfoTooltip></th>
                  <th className="px-4 py-3 text-right table-header"><InfoTooltip text={TIPS['RS %ile']}>RS %ile</InfoTooltip></th>
                  <th className="px-4 py-3 text-left table-header"><InfoTooltip text={TIPS['Style']}>Style</InfoTooltip></th>
                  <th className="px-4 py-3 text-right table-header"><InfoTooltip text={TIPS['Data %']}>Data</InfoTooltip></th>
                  <th className="px-4 py-3 text-center table-header w-10"></th>
                </tr>
              </thead>
              <tbody>
                {watchedStocks.map(stock => {
                  const cur = currencySymbol(stock.market);
                  const dcColor = stock.dataCompleteness >= 80
                    ? 'text-bullish'
                    : stock.dataCompleteness >= 50
                      ? 'text-neutral'
                      : 'text-bearish';

                  return (
                    <tr
                      key={stock.ticker}
                      className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <Link to={`/stock/${stock.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
                          {stock.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="t-secondary truncate max-w-[160px] block">{stock.name}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <MarketTag market={stock.market} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono tabular-nums font-medium t-primary">
                          {cur}{stock.price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <ChangePercent value={stock.changePercent} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ScoreBadge score={stock.score.composite} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono tabular-nums t-primary">{stock.rsPercentile}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="t-secondary text-xs">{stock.styleClassification}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono tabular-nums text-xs ${dcColor}`}>
                          {stock.dataCompleteness.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => removeTicker(stock.ticker)}
                          className="t-muted hover:text-bearish transition-colors text-sm font-bold px-1"
                          title="Remove from watchlist"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
