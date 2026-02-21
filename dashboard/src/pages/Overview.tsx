import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord, SummaryData, Metadata } from '../types';
import { MarketTag, CapTag, ScoreBadge } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
  summary: SummaryData | null;
  metadata: Metadata | null;
  bearishCount: number;
}

export default function Overview({ stocks, summary, metadata, bearishCount }: Props) {
  const [capTab, setCapTab] = useState<'all' | 'Large' | 'Mid' | 'Small'>('all');

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No data available. Run the ETL pipeline first.</p>
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
    ? (stocks.reduce((a, s) => a + s.changePercent, 0) / stocks.length).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Stocks" value={summary.totalStocks.toString()} />
        <Card label="Avg Score" value={summary.avgScore.toString()} color={summary.avgScore >= 50 ? 'text-bullish' : 'text-bearish'} />
        <Card label="Avg Change" value={`${avgChange}%`} color={Number(avgChange) >= 0 ? 'text-bullish' : 'text-bearish'} />
        <Card label="Bearish Alerts" value={bearishCount.toString()} color="text-bearish" link="/bearish" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="US Stocks" value={usCount.toString()} />
        <Card label="UK Stocks" value={ukCount.toString()} />
        <Card label="Large Cap" value={stocks.filter(s => s.capCategory === 'Large').length.toString()} />
        <Card label="Small/Mid Cap" value={stocks.filter(s => s.capCategory !== 'Large').length.toString()} />
      </div>

      {/* Top Performers */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">Top Performers</h2>
          <div className="flex gap-1">
            {(['all', 'Large', 'Mid', 'Small'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCapTab(tab)}
                className={`px-3 py-1 rounded text-sm ${
                  capTab === tab ? 'bg-surface-tertiary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All' : tab + ' Cap'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {topByTab.map((s, i) => (
            <Link
              key={s.ticker}
              to={`/stock/${s.ticker}`}
              className="flex items-center justify-between bg-surface-secondary p-3 rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-6">{i + 1}</span>
                <div>
                  <span className="font-medium">{s.ticker}</span>
                  <span className="text-gray-400 text-sm ml-2">{s.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MarketTag market={s.market} />
                <ScoreBadge score={s.score} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Performers */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Bottom Performers</h2>
        <div className="grid gap-2">
          {summary.bottomOverall.map((s, i) => (
            <Link
              key={s.ticker}
              to={`/stock/${s.ticker}`}
              className="flex items-center justify-between bg-surface-secondary p-3 rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-6">{i + 1}</span>
                <div>
                  <span className="font-medium">{s.ticker}</span>
                  <span className="text-gray-400 text-sm ml-2">{s.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MarketTag market={s.market} />
                <ScoreBadge score={s.score} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, color = 'text-white', link }: {
  label: string; value: string; color?: string; link?: string;
}) {
  const content = (
    <div className="bg-surface-secondary rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}
