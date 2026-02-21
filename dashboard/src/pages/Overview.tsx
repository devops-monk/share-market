import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord, SummaryData, Metadata } from '../types';
import { MarketTag, ScoreBadge, ChangePercent } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
  summary: SummaryData | null;
  metadata: Metadata | null;
  bearishCount: number;
}

export default function Overview({ stocks, summary, metadata, bearishCount }: Props) {
  const [capTab, setCapTab] = useState<'all' | 'Large' | 'Mid' | 'Small'>('all');

  if (!summary || summary.totalStocks === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl">
          📊
        </div>
        <h2 className="text-xl font-semibold t-primary">No Data Yet</h2>
        <p className="t-tertiary text-center max-w-md">
          Run the ETL pipeline to fetch market data. The dashboard will populate automatically once data is available.
        </p>
        <code className="text-sm text-accent bg-accent/10 px-3 py-1.5 rounded-lg font-mono">
          cd etl && npm start
        </code>
      </div>
    );
  }

  const topByTab = capTab === 'all'
    ? summary.topOverall
    : capTab === 'Large'
      ? summary.topLargeCap
      : capTab === 'Mid'
        ? summary.topMidCap
        : summary.topSmallCap;

  const usCount = stocks.filter(s => s.market === 'US').length;
  const ukCount = stocks.filter(s => s.market === 'UK').length;
  const avgChange = stocks.length
    ? stocks.reduce((a, s) => a + s.changePercent, 0) / stocks.length
    : 0;
  const bullishCount = stocks.filter(s => s.score.composite >= 60).length;

  return (
    <div className="space-y-8">
      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Stocks"
          value={summary.totalStocks.toString()}
          sub={`${usCount} US / ${ukCount} UK`}
          gradient="from-accent/20 to-transparent"
          borderColor="border-t-accent"
        />
        <StatCard
          label="Avg Score"
          value={summary.avgScore.toString()}
          sub={`${bullishCount} bullish (60+)`}
          gradient={summary.avgScore >= 50 ? 'from-bullish/20 to-transparent' : 'from-bearish/20 to-transparent'}
          borderColor={summary.avgScore >= 50 ? 'border-t-bullish' : 'border-t-bearish'}
        />
        <StatCard
          label="Avg Change"
          value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
          sub="Today's average"
          gradient={avgChange >= 0 ? 'from-bullish/20 to-transparent' : 'from-bearish/20 to-transparent'}
          borderColor={avgChange >= 0 ? 'border-t-bullish' : 'border-t-bearish'}
        />
        <Link to="/bearish">
          <StatCard
            label="Bearish Alerts"
            value={bearishCount.toString()}
            sub="Stocks with strong warnings"
            gradient="from-bearish/20 to-transparent"
            borderColor="border-t-bearish"
          />
        </Link>
      </div>

      {/* Top Performers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold t-primary">Top Performers</h2>
            <p className="text-sm t-muted mt-0.5">Highest composite scores</p>
          </div>
          <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1">
            {(['all', 'Large', 'Mid', 'Small'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCapTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  capTab === tab ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>
        </div>
        <div className="card-flat overflow-hidden">
          {topByTab.map((s, i) => (
            <Link
              key={s.ticker}
              to={`/stock/${s.ticker}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-surface-border last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <span className="w-7 h-7 rounded-full bg-surface-tertiary flex items-center justify-center text-xs font-bold t-tertiary">
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold t-primary">{s.ticker}</span>
                    <MarketTag market={s.market} />
                  </div>
                  <span className="text-xs t-muted">{s.name}</span>
                </div>
              </div>
              <ScoreBadge score={s.score} />
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Performers */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold t-primary">Bottom Performers</h2>
          <p className="text-sm t-muted mt-0.5">Lowest composite scores — exercise caution</p>
        </div>
        <div className="card-flat overflow-hidden">
          {summary.bottomOverall.map((s, i) => (
            <Link
              key={s.ticker}
              to={`/stock/${s.ticker}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-surface-border last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <span className="w-7 h-7 rounded-full bg-bearish/10 flex items-center justify-center text-xs font-bold text-bearish">
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold t-primary">{s.ticker}</span>
                    <MarketTag market={s.market} />
                  </div>
                  <span className="text-xs t-muted">{s.name}</span>
                </div>
              </div>
              <ScoreBadge score={s.score} />
            </Link>
          ))}
        </div>
      </section>

      {/* Market breakdown */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold t-tertiary uppercase tracking-wider mb-3">By Market</h3>
          <div className="space-y-3">
            <BarStat label="US Stocks" value={usCount} total={summary.totalStocks} color="bg-blue-500" />
            <BarStat label="UK Stocks" value={ukCount} total={summary.totalStocks} color="bg-violet-500" />
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold t-tertiary uppercase tracking-wider mb-3">By Cap Size</h3>
          <div className="space-y-3">
            <BarStat label="Large Cap" value={stocks.filter(s => s.capCategory === 'Large').length} total={summary.totalStocks} color="bg-emerald-500" />
            <BarStat label="Mid Cap" value={stocks.filter(s => s.capCategory === 'Mid').length} total={summary.totalStocks} color="bg-amber-500" />
            <BarStat label="Small Cap" value={stocks.filter(s => s.capCategory === 'Small').length} total={summary.totalStocks} color="bg-rose-500" />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, gradient, borderColor }: {
  label: string; value: string; sub: string; gradient: string; borderColor: string;
}) {
  return (
    <div className={`stat-card border-t-2 ${borderColor}`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient} pointer-events-none`} />
      <div className="relative">
        <p className="text-xs font-medium t-tertiary uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold t-primary mt-1 font-mono tabular-nums">{value}</p>
        <p className="text-xs t-muted mt-1">{sub}</p>
      </div>
    </div>
  );
}

function BarStat({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="t-secondary">{label}</span>
        <span className="font-mono tabular-nums t-primary">{value}</span>
      </div>
      <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
