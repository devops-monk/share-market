import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord, TradeReview } from '../../types';
import { usePaperTrading, STRATEGY_TAGS, EMOTIONAL_STATES } from '../../hooks/usePaperTrading';
import { ScoreBadge } from '../common/Tags';
import TradeJournalAnalytics from './TradeJournalAnalytics';

export default function PaperTradingTab({ stocks }: { stocks: StockRecord[] }) {
  const {
    cash, totalEquity, positionsValue,
    openPositions, closedTrades, metrics,
    executeTrade, closePosition, resetPortfolio,
    reviews, addReview, journalAnalytics,
  } = usePaperTrading(stocks);

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeTicker, setTradeTicker] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [tradePrice, setTradePrice] = useState('');
  const [tradeNotes, setTradeNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetCapital, setResetCapital] = useState('100000');
  const [subTab, setSubTab] = useState<'trades' | 'analytics'>('trades');

  // N26: Journal fields
  const [journalOpen, setJournalOpen] = useState(false);
  const [tradeStrategy, setTradeStrategy] = useState('');
  const [tradeEmotion, setTradeEmotion] = useState('');
  const [tradeReasoning, setTradeReasoning] = useState('');

  // N26: Review modal state
  const [reviewingTradeId, setReviewingTradeId] = useState<string | null>(null);
  const [reviewLessons, setReviewLessons] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(3);
  const [reviewWouldRepeat, setReviewWouldRepeat] = useState(true);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return stocks
      .filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, stocks]);

  const selectTicker = (ticker: string) => {
    setTradeTicker(ticker);
    setSearchQuery('');
    setShowDropdown(false);
    const s = stocks.find(st => st.ticker === ticker);
    if (s) setTradePrice(s.price.toFixed(2));
  };

  const handleTrade = () => {
    const shares = parseFloat(tradeShares);
    const price = parseFloat(tradePrice);
    if (!tradeTicker || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0) return;
    executeTrade(tradeTicker, tradeType, shares, price, tradeNotes || undefined, {
      strategy: tradeStrategy || undefined,
      emotionalState: tradeEmotion || undefined,
      entryReasoning: tradeType === 'buy' ? (tradeReasoning || undefined) : undefined,
      exitReasoning: tradeType === 'sell' ? (tradeReasoning || undefined) : undefined,
    });
    setTradeTicker(''); setTradeShares(''); setTradePrice(''); setTradeNotes('');
    setTradeStrategy(''); setTradeEmotion(''); setTradeReasoning('');
    setShowTradeForm(false); setJournalOpen(false);
  };

  const handleReset = () => {
    const cap = parseFloat(resetCapital);
    if (isNaN(cap) || cap <= 0) return;
    resetPortfolio(cap);
    setShowReset(false);
  };

  const handleSubmitReview = () => {
    if (!reviewingTradeId) return;
    const trade = closedTrades.find(t => t.sellTradeId === reviewingTradeId);
    if (!trade) return;
    addReview({
      tradeId: reviewingTradeId,
      ticker: trade.ticker,
      lessonsLearned: reviewLessons,
      rating: Math.min(5, Math.max(1, reviewRating)) as TradeReview['rating'],
      wouldRepeat: reviewWouldRepeat,
    });
    setReviewingTradeId(null);
    setReviewLessons(''); setReviewRating(3); setReviewWouldRepeat(true);
  };

  const pnlColor = (v: number) => v >= 0 ? 'text-bullish' : 'text-bearish';
  const pnlSign = (v: number) => v >= 0 ? '+' : '';

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Total Equity</p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">
            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Cash</p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">
            ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Positions</p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">
            ${positionsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs t-muted mt-1">{openPositions.length} open</p>
        </div>
        <div className={`stat-card border-t-2 ${metrics.totalPnl >= 0 ? 'border-t-bullish' : 'border-t-bearish'}`}>
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Total P&L</p>
          <p className={`text-xl font-bold mt-1 font-mono tabular-nums ${pnlColor(metrics.totalPnl)}`}>
            {pnlSign(metrics.totalPnl)}${Math.abs(metrics.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-1 ${pnlColor(metrics.totalPnlPct)}`}>
            {pnlSign(metrics.totalPnlPct)}{metrics.totalPnlPct.toFixed(2)}%
          </p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Win Rate</p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">
            {metrics.totalTrades > 0 ? `${metrics.winRate.toFixed(0)}%` : '--'}
          </p>
          <p className="text-xs t-muted mt-1">{metrics.winCount}W / {metrics.lossCount}L</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowTradeForm(v => !v)}
          className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
        >
          + New Trade
        </button>
        <button
          onClick={() => setShowReset(v => !v)}
          className="badge bg-surface-hover t-muted ring-1 ring-surface-border hover:t-secondary transition-colors cursor-pointer text-xs px-3 py-1.5"
        >
          Reset Portfolio
        </button>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setSubTab('trades')}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${subTab === 'trades' ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30' : 'bg-surface-hover t-muted hover:t-secondary'}`}
          >Trades</button>
          <button
            onClick={() => setSubTab('analytics')}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${subTab === 'analytics' ? 'bg-accent/20 text-accent-light ring-1 ring-accent/30' : 'bg-surface-hover t-muted hover:t-secondary'}`}
          >Journal Analytics</button>
        </div>
      </div>

      {/* Reset form */}
      {showReset && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Reset Paper Portfolio</h3>
          <p className="text-xs t-muted mb-3">This will clear all trades and positions. Enter new starting capital:</p>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs t-muted block mb-1">Starting Capital ($)</label>
              <input type="number" value={resetCapital} onChange={e => setResetCapital(e.target.value)} className="input-field w-36" min="1000" step="1000" />
            </div>
            <button onClick={handleReset} className="badge bg-bearish/20 text-bearish ring-1 ring-bearish/30 hover:bg-bearish/30 transition-colors cursor-pointer text-xs px-4 py-2">
              Reset
            </button>
            <button onClick={() => setShowReset(false)} className="badge bg-surface-hover t-muted ring-1 ring-surface-border hover:t-secondary transition-colors cursor-pointer text-xs px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Trade form */}
      {showTradeForm && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Execute Trade</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex gap-2">
              <button
                onClick={() => setTradeType('buy')}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  tradeType === 'buy' ? 'bg-bullish/20 text-bullish ring-1 ring-bullish/30' : 'bg-surface-hover t-muted hover:t-secondary'
                }`}
              >Buy</button>
              <button
                onClick={() => setTradeType('sell')}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  tradeType === 'sell' ? 'bg-bearish/20 text-bearish ring-1 ring-bearish/30' : 'bg-surface-hover t-muted hover:t-secondary'
                }`}
              >Sell</button>
            </div>
            <div className="relative">
              <label className="text-xs t-muted block mb-1">Ticker</label>
              <input
                type="text"
                value={tradeTicker || searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setTradeTicker(''); setShowDropdown(true); }}
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
                      <span className="ml-auto font-mono text-xs t-secondary">${s.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs t-muted block mb-1">Shares</label>
              <input type="number" value={tradeShares} onChange={e => setTradeShares(e.target.value)} placeholder="100" className="input-field w-24" min="1" step="1" />
            </div>
            <div>
              <label className="text-xs t-muted block mb-1">Price ($)</label>
              <input type="number" value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="150.00" className="input-field w-28" min="0.01" step="0.01" />
            </div>
            <div>
              <label className="text-xs t-muted block mb-1">Notes</label>
              <input type="text" value={tradeNotes} onChange={e => setTradeNotes(e.target.value)} placeholder="Optional" className="input-field w-36" />
            </div>
            <button onClick={handleTrade} className={`badge ${tradeType === 'buy' ? 'bg-bullish/20 text-bullish ring-1 ring-bullish/30 hover:bg-bullish/30' : 'bg-bearish/20 text-bearish ring-1 ring-bearish/30 hover:bg-bearish/30'} transition-colors cursor-pointer text-xs px-4 py-2`}>
              {tradeType === 'buy' ? 'Buy' : 'Sell'}
            </button>
          </div>

          {/* Journal Details (collapsible) */}
          <div className="mt-3 border-t border-surface-border pt-3">
            <button onClick={() => setJournalOpen(v => !v)} className="text-xs t-muted hover:t-secondary transition-colors flex items-center gap-1">
              <svg className={`w-3 h-3 transition-transform ${journalOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Journal Details
            </button>
            {journalOpen && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs t-muted block mb-1">Strategy</label>
                  <select value={tradeStrategy} onChange={e => setTradeStrategy(e.target.value)} className="input-field w-full">
                    <option value="">-- Select --</option>
                    {STRATEGY_TAGS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs t-muted block mb-1">Emotional State</label>
                  <select value={tradeEmotion} onChange={e => setTradeEmotion(e.target.value)} className="input-field w-full">
                    <option value="">-- Select --</option>
                    {EMOTIONAL_STATES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs t-muted block mb-1">{tradeType === 'buy' ? 'Entry' : 'Exit'} Reasoning</label>
                  <textarea value={tradeReasoning} onChange={e => setTradeReasoning(e.target.value)} placeholder="Why this trade?" className="input-field w-full h-16 resize-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'analytics' && <TradeJournalAnalytics analytics={journalAnalytics} />}

      {subTab === 'trades' && (
        <>
          {/* Open Positions */}
          {openPositions.length > 0 && (
            <div className="card-flat overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Open Positions</h3>
              </div>
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
                      <th className="px-4 py-3 text-center table-header w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map(p => {
                      const stock = stocks.find(s => s.ticker === p.ticker);
                      return (
                        <tr key={p.ticker} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <Link to={`/stock/${p.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
                              {p.ticker}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{p.shares}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-secondary">${p.avgCost.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">${p.currentPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">${p.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-mono tabular-nums ${pnlColor(p.pnl)}`}>
                              {pnlSign(p.pnl)}{p.pnlPct.toFixed(1)}%
                            </span>
                            <span className={`block text-xs ${pnlColor(p.pnl)}`}>
                              {pnlSign(p.pnl)}${Math.abs(p.pnl).toFixed(0)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {stock ? <ScoreBadge score={stock.score.composite} /> : <span className="t-faint">--</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => closePosition(p.ticker, p.currentPrice)}
                              className="text-xs px-2 py-1 rounded bg-bearish/10 text-bearish hover:bg-bearish/20 transition-colors"
                            >
                              Close
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

          {/* Performance Metrics */}
          {metrics.totalTrades > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs t-muted mb-1">Profit Factor</p>
                  <p className="font-semibold font-mono t-primary">{metrics.profitFactor === Infinity ? 'INF' : metrics.profitFactor.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs t-muted mb-1">Avg Win</p>
                  <p className="font-semibold font-mono text-bullish">${metrics.avgWin.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs t-muted mb-1">Avg Loss</p>
                  <p className="font-semibold font-mono text-bearish">${metrics.avgLoss.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs t-muted mb-1">Max Drawdown</p>
                  <p className="font-semibold font-mono text-bearish">{metrics.maxDrawdown.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Closed Trades History */}
          {closedTrades.length > 0 && (
            <div className="card-flat overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Closed Trades</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="px-4 py-3 text-left table-header">Ticker</th>
                      <th className="px-4 py-3 text-right table-header">Shares</th>
                      <th className="px-4 py-3 text-right table-header">Buy</th>
                      <th className="px-4 py-3 text-right table-header">Sell</th>
                      <th className="px-4 py-3 text-right table-header">P&L</th>
                      <th className="px-4 py-3 text-left table-header">Strategy</th>
                      <th className="px-4 py-3 text-right table-header">Date</th>
                      <th className="px-4 py-3 text-center table-header w-16">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...closedTrades].reverse().map((t, i) => {
                      const hasReview = reviews.some(r => r.tradeId === t.sellTradeId);
                      return (
                        <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-accent-light">{t.ticker}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{t.shares}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-secondary">${t.buyPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">${t.sellPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-mono tabular-nums ${pnlColor(t.pnl)}`}>
                              {pnlSign(t.pnl)}${Math.abs(t.pnl).toFixed(2)} ({pnlSign(t.pnlPct)}{t.pnlPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-left">
                            {t.strategy && (
                              <span className="badge bg-accent/10 text-accent-light text-[10px]">{t.strategy}</span>
                            )}
                            {t.emotionalState && (
                              <span className="badge bg-surface-hover t-muted text-[10px] ml-1">{t.emotionalState}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs t-muted">
                            {new Date(t.sellDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {t.sellTradeId && (
                              <button
                                onClick={() => {
                                  setReviewingTradeId(t.sellTradeId!);
                                  const existing = reviews.find(r => r.tradeId === t.sellTradeId);
                                  if (existing) {
                                    setReviewLessons(existing.lessonsLearned);
                                    setReviewRating(existing.rating);
                                    setReviewWouldRepeat(existing.wouldRepeat);
                                  }
                                }}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  hasReview ? 'bg-bullish/10 text-bullish hover:bg-bullish/20' : 'bg-accent/10 text-accent-light hover:bg-accent/20'
                                }`}
                              >
                                {hasReview ? 'Reviewed' : 'Review'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Modal */}
          {reviewingTradeId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setReviewingTradeId(null)}>
              <div className="card p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-semibold t-primary mb-4">Trade Review</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs t-muted block mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setReviewRating(n)}
                          className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                            n <= reviewRating ? 'bg-accent/20 text-accent-light' : 'bg-surface-hover t-muted'
                          }`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs t-muted block mb-1">Lessons Learned</label>
                    <textarea value={reviewLessons} onChange={e => setReviewLessons(e.target.value)} className="input-field w-full h-20 resize-none" placeholder="What did you learn from this trade?" />
                  </div>
                  <div>
                    <label className="text-xs t-muted block mb-1">Would you repeat this trade?</label>
                    <div className="flex gap-2">
                      <button onClick={() => setReviewWouldRepeat(true)} className={`text-xs px-3 py-1.5 rounded ${reviewWouldRepeat ? 'bg-bullish/20 text-bullish' : 'bg-surface-hover t-muted'}`}>Yes</button>
                      <button onClick={() => setReviewWouldRepeat(false)} className={`text-xs px-3 py-1.5 rounded ${!reviewWouldRepeat ? 'bg-bearish/20 text-bearish' : 'bg-surface-hover t-muted'}`}>No</button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSubmitReview} className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-4 py-2">
                      Save Review
                    </button>
                    <button onClick={() => setReviewingTradeId(null)} className="badge bg-surface-hover t-muted ring-1 ring-surface-border hover:t-secondary transition-colors cursor-pointer text-xs px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {openPositions.length === 0 && closedTrades.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-lg font-semibold t-primary mb-2">Ready to practice trading!</p>
              <p className="t-muted text-sm mb-4">You have <strong className="text-bullish">${cash.toLocaleString()}</strong> in virtual cash. Click "New Trade" to get started.</p>
              <div className="text-xs t-muted max-w-lg mx-auto text-left space-y-2">
                <p className="font-semibold t-secondary text-center mb-2">How Paper Trading Works:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-surface-hover">
                    <p className="font-semibold t-secondary mb-1">1. Buy a stock</p>
                    <p>Click "New Trade" &rarr; select Buy &rarr; search for a stock &rarr; enter how many shares.</p>
                  </div>
                  <div className="p-2 rounded bg-surface-hover">
                    <p className="font-semibold t-secondary mb-1">2. Watch it move</p>
                    <p>Your positions update with real market prices. See if your pick goes up or down.</p>
                  </div>
                  <div className="p-2 rounded bg-surface-hover">
                    <p className="font-semibold t-secondary mb-1">3. Close when ready</p>
                    <p>Click "Close" on any position to sell and lock in your profit (or loss).</p>
                  </div>
                  <div className="p-2 rounded bg-surface-hover">
                    <p className="font-semibold t-secondary mb-1">4. Journal & learn</p>
                    <p>Review each trade — what worked, what didn't. Track patterns in your decisions.</p>
                  </div>
                </div>
                <p className="text-center italic mt-2">No real money is involved. It's all practice!</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
