import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord, Metadata } from '../types';
import { ScoreBadge, MarketTag, ChangePercent } from '../components/common/Tags';
import InfoTooltip from '../components/common/InfoTooltip';

/* ─── CAN SLIM CRITERIA ─── */
interface SlimResult {
  stock: StockRecord;
  checks: { key: string; label: string; pass: boolean; detail: string }[];
  passed: number;
  total: number;
}

function evaluateCanSlim(s: StockRecord, regimeOk: boolean): SlimResult {
  const checks = [
    {
      key: 'C',
      label: 'C — Current Earnings',
      pass: s.earningsGrowth != null && s.earningsGrowth >= 0.25,
      detail: s.earningsGrowth != null ? `EPS Growth: ${(s.earningsGrowth * 100).toFixed(0)}% (need 25%+)` : 'EPS growth data unavailable',
    },
    {
      key: 'A',
      label: 'A — Annual Earnings',
      pass: (s.piotroskiScore ?? 0) >= 5 && s.returnOnEquity != null && s.returnOnEquity > 0.15,
      detail: `Piotroski ${s.piotroskiScore ?? 'N/A'}/9, ROE ${s.returnOnEquity != null ? (s.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'} (proxy for consistent annual growth)`,
    },
    {
      key: 'N',
      label: 'N — New High',
      pass: s.fiftyTwoWeekRangePercent >= 80,
      detail: `52W Range: ${s.fiftyTwoWeekRangePercent}% (near new high = 80%+)`,
    },
    {
      key: 'S',
      label: 'S — Supply & Demand',
      pass: s.volumeRatio >= 1.2 && s.changePercent > 0,
      detail: `Vol Ratio: ${s.volumeRatio.toFixed(1)}x, Change: ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(1)}% (need above-avg volume on up days)`,
    },
    {
      key: 'L',
      label: 'L — Leader',
      pass: s.rsPercentile >= 80,
      detail: `RS Percentile: ${s.rsPercentile} (need 80+)`,
    },
    {
      key: 'I',
      label: 'I — Institutional Sponsorship',
      pass: s.heldPercentInstitutions != null && s.heldPercentInstitutions >= 0.2 && s.heldPercentInstitutions <= 0.9,
      detail: s.heldPercentInstitutions != null
        ? `Inst. Ownership: ${(s.heldPercentInstitutions * 100).toFixed(0)}% (need 20-90%)`
        : 'Institutional data unavailable',
    },
    {
      key: 'M',
      label: 'M — Market Direction',
      pass: regimeOk,
      detail: regimeOk ? 'Market regime is bullish' : 'Market regime is not bullish (correction/bear)',
    },
  ];

  return {
    stock: s,
    checks,
    passed: checks.filter(c => c.pass).length,
    total: checks.length,
  };
}

export default function CanSlim({ stocks, metadata }: { stocks: StockRecord[]; metadata: Metadata | null }) {
  const [minPassing, setMinPassing] = useState(5);
  const regimeOk = metadata?.marketRegime?.overall === 'bull';

  const results = useMemo(() => {
    return stocks
      .map(s => evaluateCanSlim(s, regimeOk))
      .filter(r => r.passed >= minPassing)
      .sort((a, b) => b.passed - a.passed || b.stock.rsPercentile - a.stock.rsPercentile);
  }, [stocks, regimeOk, minPassing]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">CAN SLIM Screen</h1>
        <p className="text-sm t-muted mt-1">
          William O'Neil's 7-point growth stock methodology.
          Stocks passing {minPassing}+ criteria out of 7.
        </p>
      </div>

      {/* Description */}
      <div className="card p-4">
        <p className="text-xs t-secondary leading-relaxed">
          <strong className="t-primary">CAN SLIM</strong> is a growth investing strategy by William O'Neil. Each letter represents a criterion:
          <strong> C</strong> = Current quarterly EPS growth 25%+,
          <strong> A</strong> = Annual earnings quality (Piotroski 5+ & ROE 15%+),
          <strong> N</strong> = New price high (near 52-week high),
          <strong> S</strong> = Supply & demand (above-avg volume on up days),
          <strong> L</strong> = Leader (RS Percentile 80+),
          <strong> I</strong> = Institutional sponsorship (20-90% inst. ownership),
          <strong> M</strong> = Market direction (bull regime).
          The more criteria passed, the stronger the candidate.
        </p>
      </div>

      {/* Filter */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm t-secondary">Minimum passing:</span>
        {[4, 5, 6, 7].map(n => (
          <button
            key={n}
            onClick={() => setMinPassing(n)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              minPassing === n ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
            }`}
          >
            {n}/7
          </button>
        ))}
        <span className="ml-auto badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
          {results.length} stocks
        </span>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">No stocks pass {minPassing}+ CAN SLIM criteria. Try lowering the threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(r => (
            <div key={r.stock.ticker} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Link to={`/stock/${r.stock.ticker}`} className="text-lg font-bold text-accent-light hover:t-primary transition-colors">
                    {r.stock.ticker}
                  </Link>
                  <MarketTag market={r.stock.market} />
                  <span className="text-xs t-muted">{r.stock.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold font-mono ${
                    r.passed >= 6 ? 'text-bullish' : r.passed >= 5 ? 'text-neutral' : 'text-bearish'
                  }`}>
                    {r.passed}/{r.total}
                  </span>
                  <ScoreBadge score={r.stock.score.composite} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {r.checks.map(c => (
                  <div key={c.key} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                    c.pass ? 'bg-bullish/5' : 'bg-surface-tertiary/50'
                  }`}>
                    <span className={`flex-shrink-0 font-bold ${c.pass ? 'text-bullish' : 'text-bearish'}`}>
                      {c.pass ? '+' : 'x'}
                    </span>
                    <div>
                      <span className={`font-medium ${c.pass ? 't-secondary' : 't-muted'}`}>{c.label}</span>
                      <p className="t-muted mt-0.5">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
