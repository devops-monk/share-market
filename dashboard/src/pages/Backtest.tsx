import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, MarketTag, ChangePercent } from '../components/common/Tags';
import { currencySymbol } from '../lib/format';
import InfoTooltip from '../components/common/InfoTooltip';

/* ─── TYPES ─── */
type ScoreHistory = Record<string, Record<string, number>>; // ticker -> date -> score

interface BacktestResult {
  stock: StockRecord;
  entryScore: number;
  currentScore: number;
  scoreDelta: number;
  return3m: number;
  return1y: number;
}

/* ─── STRATEGY DEFINITIONS ─── */
interface Strategy {
  key: string;
  label: string;
  description: string;
  filter: (s: StockRecord) => boolean;
}

const STRATEGIES: Strategy[] = [
  {
    key: 'highScore',
    label: 'High Composite Score (70+)',
    description: 'Buy stocks with composite score >= 70. Tests whether high-scored stocks outperform.',
    filter: s => s.score.composite >= 70,
  },
  {
    key: 'momentum',
    label: 'Momentum Leaders (RS 80+)',
    description: 'Buy stocks with RS Percentile >= 80. Tests relative strength momentum strategy.',
    filter: s => s.rsPercentile >= 80,
  },
  {
    key: 'minervini',
    label: 'Minervini SEPA (6+ checks)',
    description: 'Buy stocks passing 6+ Minervini trend template checks.',
    filter: s => s.minerviniChecks.passed >= 6,
  },
  {
    key: 'valueGrowth',
    label: 'Value + Growth (PE<20, EG>15%)',
    description: 'Buy stocks with P/E < 20 and earnings growth > 15%. Tests GARP approach.',
    filter: s => s.pe != null && s.pe > 0 && s.pe < 20 && s.earningsGrowth != null && s.earningsGrowth > 0.15,
  },
  {
    key: 'piotroski',
    label: 'Piotroski Strong (7+)',
    description: 'Buy stocks with Piotroski F-Score >= 7. Tests fundamental quality strategy.',
    filter: s => (s.piotroskiScore ?? 0) >= 7,
  },
  {
    key: 'buffett',
    label: 'Buffett Quality (4+)',
    description: 'Buy stocks with Buffett Score >= 4. Tests quality investing approach.',
    filter: s => (s.buffettScore ?? 0) >= 4,
  },
  {
    key: 'oversold',
    label: 'Oversold Bounce (RSI<35)',
    description: 'Buy stocks with RSI < 35. Tests mean-reversion / buy-the-dip strategy.',
    filter: s => s.rsi != null && s.rsi < 35,
  },
  {
    key: 'breakout',
    label: 'Breakout (52W High + Volume)',
    description: 'Buy stocks near 52-week high (>90%) with above-average volume. Tests breakout strategy.',
    filter: s => s.fiftyTwoWeekRangePercent >= 90 && s.volumeRatio >= 1.3,
  },
];

/* ─── COMPONENT ─── */
export default function Backtest({ stocks, scoreHistory }: { stocks: StockRecord[]; scoreHistory: ScoreHistory | null }) {
  const [selectedStrategy, setSelectedStrategy] = useState('highScore');
  const [sortBy, setSortBy] = useState<'return3m' | 'return1y' | 'scoreDelta' | 'currentScore'>('return3m');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const strategy = STRATEGIES.find(s => s.key === selectedStrategy) ?? STRATEGIES[0];

  const results = useMemo(() => {
    const filtered = stocks.filter(strategy.filter);

    return filtered.map(s => {
      // Get historical score if available
      const history = scoreHistory?.[s.ticker];
      const dates = history ? Object.keys(history).sort() : [];
      const entryScore = dates.length > 0 ? history![dates[0]] : s.score.composite;

      return {
        stock: s,
        entryScore,
        currentScore: s.score.composite,
        scoreDelta: s.score.composite - entryScore,
        return3m: s.priceReturn3m * 100,
        return1y: s.priceReturn1y * 100,
      };
    }).sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      return mul * (a[sortBy] - b[sortBy]);
    });
  }, [stocks, scoreHistory, strategy, sortBy, sortDir]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const avg3m = results.reduce((a, r) => a + r.return3m, 0) / results.length;
    const avg1y = results.reduce((a, r) => a + r.return1y, 0) / results.length;
    const avgScore = results.reduce((a, r) => a + r.currentScore, 0) / results.length;
    const winRate3m = (results.filter(r => r.return3m > 0).length / results.length) * 100;
    const winRate1y = (results.filter(r => r.return1y > 0).length / results.length) * 100;
    const best3m = Math.max(...results.map(r => r.return3m));
    const worst3m = Math.min(...results.map(r => r.return3m));
    const median3m = [...results.map(r => r.return3m)].sort((a, b) => a - b)[Math.floor(results.length / 2)];
    return { avg3m, avg1y, avgScore, winRate3m, winRate1y, best3m, worst3m, median3m };
  }, [results]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const sortIcon = (col: typeof sortBy) =>
    sortBy === col ? (sortDir === 'desc' ? ' v' : ' ^') : '';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Strategy Backtest</h1>
        <p className="text-sm t-muted mt-1">
          Test how different stock-picking strategies perform using real return data.
          Select a strategy to see which stocks it would pick and their actual returns.
        </p>
      </div>

      {/* Strategy description */}
      <div className="card p-4">
        <p className="text-xs t-secondary leading-relaxed">
          <strong className="t-primary">How it works:</strong> Each strategy applies a filter to today's universe of stocks.
          We then measure the actual 3-month and 1-year price returns for those stocks. This is a <em>snapshot backtest</em> —
          it shows how stocks currently meeting each criterion have performed historically.
          A positive average return with high win rate suggests the strategy identifies outperformers.
        </p>
      </div>

      {/* Strategy selector */}
      <div className="card p-4">
        <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Select Strategy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {STRATEGIES.map(s => (
            <button
              key={s.key}
              onClick={() => setSelectedStrategy(s.key)}
              className={`text-left p-3 rounded-lg border transition-all ${
                selectedStrategy === s.key
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-surface-border hover:border-accent/20 hover:bg-surface-hover/50'
              }`}
            >
              <span className={`text-sm font-medium block ${selectedStrategy === s.key ? 'text-accent-light' : 't-primary'}`}>
                {s.label}
              </span>
              <span className="text-xs t-muted mt-1 block">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-t-2 border-t-accent">
            <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Stocks Selected</p>
            <p className="text-2xl font-bold t-primary mt-1 font-mono tabular-nums">{results.length}</p>
            <p className="text-xs t-muted mt-1">Avg Score: {stats.avgScore.toFixed(0)}</p>
          </div>
          <div className={`stat-card border-t-2 ${stats.avg3m >= 0 ? 'border-t-bullish' : 'border-t-bearish'}`}>
            <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
              <InfoTooltip text="Average 3-month return of all stocks selected by this strategy">Avg 3M Return</InfoTooltip>
            </p>
            <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${stats.avg3m >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {stats.avg3m >= 0 ? '+' : ''}{stats.avg3m.toFixed(1)}%
            </p>
            <p className="text-xs t-muted mt-1">Median: {stats.median3m >= 0 ? '+' : ''}{stats.median3m.toFixed(1)}%</p>
          </div>
          <div className={`stat-card border-t-2 ${stats.avg1y >= 0 ? 'border-t-bullish' : 'border-t-bearish'}`}>
            <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
              <InfoTooltip text="Average 1-year return of all stocks selected by this strategy">Avg 1Y Return</InfoTooltip>
            </p>
            <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${stats.avg1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {stats.avg1y >= 0 ? '+' : ''}{stats.avg1y.toFixed(1)}%
            </p>
            <p className="text-xs t-muted mt-1">Best: {stats.best3m >= 0 ? '+' : ''}{stats.best3m.toFixed(1)}%</p>
          </div>
          <div className={`stat-card border-t-2 ${stats.winRate3m >= 50 ? 'border-t-bullish' : 'border-t-bearish'}`}>
            <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
              <InfoTooltip text="Percentage of stocks with positive returns">Win Rate (3M)</InfoTooltip>
            </p>
            <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${stats.winRate3m >= 50 ? 'text-bullish' : 'text-bearish'}`}>
              {stats.winRate3m.toFixed(0)}%
            </p>
            <p className="text-xs t-muted mt-1">1Y Win Rate: {stats.winRate1y.toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <div className="card-flat overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-3 text-left table-header">Ticker</th>
                  <th className="px-4 py-3 text-left table-header">Name</th>
                  <th className="px-4 py-3 text-left table-header">Market</th>
                  <th className="px-4 py-3 text-right table-header">Price</th>
                  <th className="px-4 py-3 text-center table-header">
                    <button onClick={() => toggleSort('currentScore')} className="hover:text-accent-light transition-colors">
                      Score{sortIcon('currentScore')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right table-header">
                    <button onClick={() => toggleSort('return3m')} className="hover:text-accent-light transition-colors">
                      3M Return{sortIcon('return3m')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right table-header">
                    <button onClick={() => toggleSort('return1y')} className="hover:text-accent-light transition-colors">
                      1Y Return{sortIcon('return1y')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right table-header">
                    <button onClick={() => toggleSort('scoreDelta')} className="hover:text-accent-light transition-colors">
                      Score Delta{sortIcon('scoreDelta')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 100).map(r => (
                  <tr key={r.stock.ticker} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link to={`/stock/${r.stock.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
                        {r.stock.ticker}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 t-secondary text-xs truncate max-w-[120px]">{r.stock.name}</td>
                    <td className="px-4 py-2.5"><MarketTag market={r.stock.market} /></td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">
                      {currencySymbol(r.stock.market)}{r.stock.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center"><ScoreBadge score={r.currentScore} /></td>
                    <td className="px-4 py-2.5 text-right"><ChangePercent value={r.return3m} /></td>
                    <td className="px-4 py-2.5 text-right"><ChangePercent value={r.return1y} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-mono tabular-nums text-xs ${
                        r.scoreDelta > 0 ? 'text-bullish' : r.scoreDelta < 0 ? 'text-bearish' : 't-muted'
                      }`}>
                        {r.scoreDelta > 0 ? '+' : ''}{r.scoreDelta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 100 && (
            <p className="text-xs t-muted p-3 text-center">Showing first 100 of {results.length} results</p>
          )}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">No stocks match the "{strategy.label}" criteria. Try a different strategy.</p>
        </div>
      )}
    </div>
  );
}
