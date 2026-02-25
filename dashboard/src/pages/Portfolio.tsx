import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, ChangePercent, MarketTag } from '../components/common/Tags';
import InfoTooltip from '../components/common/InfoTooltip';
import CorrelationHeatmap from '../components/charts/CorrelationHeatmap';
import { useOhlcvData } from '../hooks/useOhlcvData';
import { computeCorrelationMatrix } from '../lib/correlation';

/* ─── TYPES ─── */
interface Holding {
  ticker: string;
  shares: number;
  buyPrice: number;
  addedAt: string; // ISO date
}

const STORAGE_KEY = 'sm-portfolio';

function readHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeHoldings(h: Holding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
}

/* ─── PIE CHART (SVG) ─── */
function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  const cx = 80, cy = 80, r = 70;
  let cumAngle = -Math.PI / 2;
  const paths: JSX.Element[] = [];

  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    paths.push(
      <path
        key={slice.label}
        d={`M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
        fill={slice.color}
        stroke="var(--surface)"
        strokeWidth="2"
      >
        <title>{slice.label}: {((slice.value / total) * 100).toFixed(1)}%</title>
      </path>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160} viewBox="0 0 160 160">{paths}</svg>
      <div className="space-y-1.5">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="t-secondary">{s.label}</span>
            <span className="font-mono t-muted">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const COLORS = ['#3b82f6','#16a34a','#d97706','#dc2626','#0284c7','#0d9488','#c2410c','#9333ea','#0891b2','#7c3aed'];

/* ─── COMPONENT ─── */
export default function Portfolio({ stocks }: { stocks: StockRecord[] }) {
  const [holdings, setHoldings] = useState<Holding[]>(readHoldings);
  const [showAdd, setShowAdd] = useState(false);
  const [addTicker, setAddTicker] = useState('');
  const [addShares, setAddShares] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => { writeHoldings(holdings); }, [holdings]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return stocks
      .filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, stocks]);

  const selectTicker = (ticker: string) => {
    setAddTicker(ticker);
    setSearchQuery('');
    setShowDropdown(false);
    // Auto-fill current price
    const s = stocks.find(st => st.ticker === ticker);
    if (s) setAddPrice(s.price.toFixed(2));
  };

  const addHolding = useCallback(() => {
    const shares = parseFloat(addShares);
    const price = parseFloat(addPrice);
    if (!addTicker || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0) return;

    setHoldings(prev => [...prev, {
      ticker: addTicker.toUpperCase(),
      shares,
      buyPrice: price,
      addedAt: new Date().toISOString(),
    }]);
    setAddTicker('');
    setAddShares('');
    setAddPrice('');
    setShowAdd(false);
  }, [addTicker, addShares, addPrice]);

  const removeHolding = (idx: number) => {
    setHoldings(prev => prev.filter((_, i) => i !== idx));
  };

  // Merge holdings by ticker
  const portfolio = useMemo(() => {
    const map = new Map<string, { holdings: Holding[]; stock: StockRecord | undefined }>();
    for (const h of holdings) {
      if (!map.has(h.ticker)) map.set(h.ticker, { holdings: [], stock: stocks.find(s => s.ticker === h.ticker) });
      map.get(h.ticker)!.holdings.push(h);
    }
    return [...map.entries()].map(([ticker, { holdings: hs, stock }]) => {
      const totalShares = hs.reduce((a, h) => a + h.shares, 0);
      const totalCost = hs.reduce((a, h) => a + h.shares * h.buyPrice, 0);
      const avgCost = totalCost / totalShares;
      const currentPrice = stock?.price ?? avgCost;
      const currentValue = totalShares * currentPrice;
      const pnl = currentValue - totalCost;
      const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      return { ticker, stock, totalShares, avgCost, totalCost, currentValue, pnl, pnlPct };
    });
  }, [holdings, stocks]);

  const totalValue = portfolio.reduce((a, p) => a + p.currentValue, 0);
  const totalCost = portfolio.reduce((a, p) => a + p.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const avgScore = portfolio.length > 0
    ? Math.round(portfolio.filter(p => p.stock).reduce((a, p) => a + (p.stock?.score.composite ?? 0), 0) / portfolio.filter(p => p.stock).length)
    : 0;

  const portfolioTickers = useMemo(() => portfolio.map(p => p.ticker), [portfolio]);
  const { data: ohlcvData, loading: ohlcvLoading } = useOhlcvData(portfolioTickers);

  const correlationData = useMemo(() => {
    if (portfolioTickers.length < 2 || ohlcvData.size < 2) return null;
    const availableTickers = portfolioTickers.filter(t => ohlcvData.has(t));
    if (availableTickers.length < 2) return null;
    const matrix = computeCorrelationMatrix(ohlcvData, availableTickers);
    return { tickers: availableTickers, matrix };
  }, [portfolioTickers, ohlcvData]);

  const pieSlices = portfolio.map((p, i) => ({
    label: p.ticker,
    value: p.currentValue,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-primary">Portfolio Tracker</h1>
          <p className="text-sm t-muted mt-1">Track your holdings, P&L, and allocation</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
        >
          + Add Holding
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Add Holding</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
              <label className="text-xs t-muted block mb-1">Ticker</label>
              <input
                type="text"
                value={addTicker || searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setAddTicker(''); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="AAPL"
                className="input-field w-32"
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-surface-secondary border border-surface-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {searchResults.map(s => (
                    <button
                      key={s.ticker}
                      onMouseDown={() => selectTicker(s.ticker)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2"
                    >
                      <span className="font-semibold text-accent-light text-sm">{s.ticker}</span>
                      <span className="t-muted text-xs truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs t-muted block mb-1">Shares</label>
              <input type="number" value={addShares} onChange={e => setAddShares(e.target.value)} placeholder="100" className="input-field w-24" min="0" step="any" />
            </div>
            <div>
              <label className="text-xs t-muted block mb-1">Buy Price</label>
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="150.00" className="input-field w-28" min="0" step="0.01" />
            </div>
            <button onClick={addHolding} className="badge bg-bullish/20 text-bullish ring-1 ring-bullish/30 hover:bg-bullish/30 transition-colors cursor-pointer text-xs px-4 py-2">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {holdings.length === 0 && (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">No holdings yet. Click "Add Holding" to start tracking your portfolio.</p>
        </div>
      )}

      {holdings.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card border-t-2 border-t-accent">
              <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-bold t-primary mt-1 font-mono tabular-nums">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs t-muted mt-1">{portfolio.length} position{portfolio.length !== 1 ? 's' : ''}</p>
            </div>
            <div className={`stat-card border-t-2 ${totalPnl >= 0 ? 'border-t-bullish' : 'border-t-bearish'}`}>
              <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Total P&L</p>
              <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${totalPnlPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
              </p>
            </div>
            <div className="stat-card border-t-2 border-t-accent">
              <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Total Cost</p>
              <p className="text-2xl font-bold t-primary mt-1 font-mono tabular-nums">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={`stat-card border-t-2 ${avgScore >= 50 ? 'border-t-bullish' : 'border-t-bearish'}`}>
              <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
                <InfoTooltip text="Weighted average composite score of your holdings">Avg Score</InfoTooltip>
              </p>
              <p className="text-2xl font-bold t-primary mt-1 font-mono tabular-nums">{avgScore}</p>
              <p className="text-xs t-muted mt-1">{avgScore >= 60 ? 'Healthy' : avgScore >= 40 ? 'Mixed' : 'Weak'}</p>
            </div>
          </div>

          {/* Allocation pie + Holdings table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pie chart */}
            <div className="card p-5">
              <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Allocation</h2>
              <PieChart slices={pieSlices} />
            </div>

            {/* Holdings table */}
            <div className="card-flat overflow-hidden lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="px-4 py-3 text-left table-header">Ticker</th>
                      <th className="px-4 py-3 text-right table-header">Shares</th>
                      <th className="px-4 py-3 text-right table-header">Avg Cost</th>
                      <th className="px-4 py-3 text-right table-header">Price</th>
                      <th className="px-4 py-3 text-right table-header">Value</th>
                      <th className="px-4 py-3 text-right table-header">P&L</th>
                      <th className="px-4 py-3 text-center table-header">Score</th>
                      <th className="px-4 py-3 text-center table-header w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((p, i) => (
                      <tr key={p.ticker} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link to={`/stock/${p.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
                            {p.ticker}
                          </Link>
                          {p.stock && <span className="text-xs t-muted ml-2">{p.stock.name.slice(0, 20)}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{p.totalShares}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums t-secondary">${p.avgCost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">${(p.stock?.price ?? p.avgCost).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">${p.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-mono tabular-nums ${p.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                            {p.pnl >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {p.stock ? <ScoreBadge score={p.stock.score.composite} /> : <span className="t-faint">--</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              const idx = holdings.findIndex(h => h.ticker === p.ticker);
                              if (idx >= 0) removeHolding(idx);
                            }}
                            className="t-muted hover:text-bearish transition-colors text-sm font-bold px-1"
                            title="Remove"
                          >
                            x
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Correlation Matrix */}
          {correlationData && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Correlation Matrix</h2>
              <p className="text-xs t-muted mb-4">
                Shows how your holdings move together. Values near +1 mean stocks move in sync (less diversification), near 0 means independent, near -1 means inverse (good hedge).
              </p>
              <CorrelationHeatmap tickers={correlationData.tickers} matrix={correlationData.matrix} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
