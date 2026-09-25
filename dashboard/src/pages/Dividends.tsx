import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent } from '../components/common/Tags';
import { currencySymbol, formatMarketCap } from '../lib/format';
import MultiSelect from '../components/common/MultiSelect';
import InfoTooltip from '../components/common/InfoTooltip';
import { PRESETS, buildDividendView } from '../lib/dividend-score';
import type { DividendPreset, DividendView } from '../lib/dividend-score';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_MARKETS = ['US', 'UK', 'IN', 'HK', 'JP', 'DE', 'FR'];
const ALL_CAPS = ['Large', 'Mid', 'Small'];

type SortKey = 'score' | 'yield' | 'growth' | 'exDate' | 'payout' | 'discount' | 'marketCap';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score',     label: 'Dividend Score' },
  { key: 'yield',     label: 'Highest Yield' },
  { key: 'growth',    label: 'Growth Streak' },
  { key: 'exDate',    label: 'Next Ex-Date' },
  { key: 'payout',    label: 'Safest Payout' },
  { key: 'discount',  label: 'Biggest Discount' },
  { key: 'marketCap', label: 'Largest Company' },
];

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', 'semi-annual': 'Twice a year',
  annual: 'Once a year', irregular: 'Irregular', unknown: 'Unknown',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function exDateLabel(v: DividendView): string {
  if (v.daysToExDate == null) return '—';
  if (v.daysToExDate < 0) return 'passed';
  if (v.daysToExDate === 0) return 'today';
  return `${v.daysToExDate}d`;
}

function yieldColor(pct: number): string {
  if (pct >= 6) return 'text-yellow-400';   // high, verify it is safe
  if (pct >= 3) return 'text-bullish';
  if (pct > 0) return 't-secondary';
  return 't-muted';
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function DividendRow({ view }: { view: DividendView }) {
  const [open, setOpen] = useState(false);
  const s = view.stock;
  const sym = currencySymbol(s.market);
  const annuals = s.dividendMetrics?.annualDividends ?? [];
  const maxDps = Math.max(...annuals.map(a => a.totalDPS), 0);

  return (
    <div className="card-flat">
      {/* Summary line */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left p-3 flex items-center gap-3 hover:bg-surface-hover transition-colors rounded-xl"
      >
        <span className="w-9 flex-shrink-0 text-center">
          <ScoreBadge score={view.total} size="sm" />
        </span>

        <span className="w-28 flex-shrink-0 min-w-0">
          <Link
            to={`/stock/${s.ticker}`}
            onClick={e => e.stopPropagation()}
            className="font-mono font-semibold text-sm text-accent-light hover:underline block truncate"
          >
            {s.ticker}
          </Link>
          <span className="block text-[11px] t-muted truncate">{s.name}</span>
        </span>

        <span className="hidden sm:flex items-center gap-1 flex-shrink-0">
          <MarketTag market={s.market} />
          <CapTag cap={s.capCategory} />
        </span>

        <span className="w-16 text-right flex-shrink-0">
          <span className={`font-mono font-semibold text-sm ${yieldColor(view.yieldPct)}`}>
            {view.yieldPct.toFixed(2)}%
          </span>
          <span className="block text-[10px] t-muted">yield</span>
        </span>

        <span className="hidden md:block w-20 text-right flex-shrink-0">
          <span className="font-mono text-sm t-secondary">
            {view.dps != null ? `${sym}${view.dps.toFixed(2)}` : '—'}
          </span>
          <span className="block text-[10px] t-muted">per share/yr</span>
        </span>

        <span className="hidden md:block w-20 text-right flex-shrink-0">
          <span className={`font-mono text-sm ${
            view.payoutRatioPct == null ? 't-muted'
              : view.payoutRatioPct > 100 ? 'text-bearish'
              : view.payoutRatioPct > 75 ? 'text-yellow-400' : 'text-bullish'
          }`}>
            {view.payoutRatioPct != null ? `${view.payoutRatioPct.toFixed(0)}%` : '—'}
          </span>
          <span className="block text-[10px] t-muted">payout</span>
        </span>

        <span className="hidden lg:block w-20 text-right flex-shrink-0">
          <span className="font-mono text-sm t-secondary">
            {view.growthStreak > 0 ? `${view.growthStreak}yr` : '—'}
          </span>
          <span className="block text-[10px] t-muted">rising</span>
        </span>

        <span className="w-20 text-right flex-shrink-0">
          <span className={`font-mono text-sm ${
            view.daysToExDate != null && view.daysToExDate >= 0 && view.daysToExDate <= 14
              ? 'text-accent-light' : 't-secondary'
          }`}>
            {exDateLabel(view)}
          </span>
          <span className="block text-[10px] t-muted">to ex-date</span>
        </span>

        <span className="hidden xl:block w-20 text-right flex-shrink-0">
          <ChangePercent value={s.changePercent} />
          <span className="block text-[10px] t-muted">today</span>
        </span>

        <svg
          className={`w-4 h-4 t-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detail */}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-surface-border space-y-3">
          {view.warnings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {view.warnings.map(w => (
                <span key={w} className="badge bg-bearish/10 text-bearish ring-1 ring-bearish/20 text-[10px]">
                  {w}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Fact label="Pays" value={FREQUENCY_LABEL[view.frequency] ?? 'Unknown'} />
            <Fact
              label="Next ex-date"
              value={view.nextExDate ? formatDate(view.nextExDate) : '—'}
              hint={view.nextExDate ? (view.nextExDateIsEstimate ? 'estimated from its payment cycle' : 'confirmed') : undefined}
            />
            <Fact label="Pay date" value={view.payDate ? formatDate(view.payDate) : '—'} />
            <Fact
              label="5-yr growth"
              value={view.cagr != null ? `${view.cagr > 0 ? '+' : ''}${view.cagr.toFixed(1)}%/yr` : '—'}
            />
            <Fact
              label="Cash cover"
              value={view.fcfCover != null ? `${view.fcfCover.toFixed(1)}x` : '—'}
              hint="Free cash flow ÷ dividends paid — above 1x means the cash is really there"
            />
            <Fact label="Paid without a gap" value={view.yearsPaying > 0 ? `${view.consistencyPct.toFixed(0)}% of ${view.yearsPaying}yr` : '—'} />
            <Fact
              label="Yield vs its own 5-yr avg"
              value={view.yieldVsHistory != null
                ? `${view.yieldVsHistory > 0 ? '+' : ''}${view.yieldVsHistory.toFixed(2)}pp`
                : '—'}
              hint="Above its average usually means the price is low relative to the payment"
            />
            <Fact label="Below 52-week high" value={`${view.dropFromHigh.toFixed(1)}%`} />
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ['Yield', view.scores.yield],
              ['Safety', view.scores.safety],
              ['Growth', view.scores.growth],
              ['Consistency', view.scores.consistency],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} className="p-2 rounded-lg bg-surface-tertiary border border-surface-border">
                <div className="flex items-center justify-between text-[10px] t-muted mb-1">
                  <span>{label}</span>
                  <span className="font-mono t-secondary">{Math.round(val)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Payment history */}
          {annuals.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold t-tertiary uppercase tracking-wider mb-1.5">
                Dividend per share by year
              </div>
              <div className="flex items-end gap-2 h-16 max-w-sm">
                {annuals.slice(-8).map(a => (
                  <div key={a.year} className="flex-1 flex flex-col items-center gap-1" title={`${a.year}: ${sym}${a.totalDPS}`}>
                    <div
                      className="w-full rounded-t bg-accent/50"
                      style={{ height: `${maxDps > 0 ? Math.max(3, (a.totalDPS / maxDps) * 46) : 3}px` }}
                    />
                    <span className="text-[9px] t-muted">{String(a.year).slice(2)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] t-faint mt-1">
                The final bar is the current year and is usually part paid.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs t-muted">
            <span>Cap: <span className="t-secondary">{formatMarketCap(s.marketCap, s.market)}</span></span>
            {s.pe != null && <span>P/E: <span className="t-secondary">{s.pe.toFixed(1)}</span></span>}
            {s.sector && <span>{s.sector}</span>}
            <Link to={`/stock/${s.ticker}`} className="ml-auto text-accent-light hover:underline">
              Full analysis &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[10px] t-muted flex items-center gap-1">
        {hint ? <InfoTooltip text={hint}><span className="underline decoration-dotted decoration-surface-border">{label}</span></InfoTooltip> : label}
      </div>
      <div className="font-mono text-sm t-secondary mt-0.5">{value}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dividends({ stocks }: { stocks: StockRecord[] }) {
  const [preset, setPreset] = useState<DividendPreset>('balanced');
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState<string[]>([]);
  const [caps, setCaps] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [minYield, setMinYield] = useState(0);
  const [maxPayout, setMaxPayout] = useState(200);
  const [minStreak, setMinStreak] = useState(0);
  const [exWithin, setExWithin] = useState(0);        // 0 = any
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [hideWarnings, setHideWarnings] = useState(false);

  const allSectors = useMemo(
    () => [...new Set(stocks.map(s => s.sector).filter(Boolean))].sort() as string[],
    [stocks],
  );

  const payers = useMemo(
    () => stocks.map(s => buildDividendView(s, preset)).filter((v): v is DividendView => v != null && v.yieldPct > 0),
    [stocks, preset],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = payers.filter(v => {
      const s = v.stock;
      if (q && !s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      if (markets.length > 0 && !markets.includes(s.market)) return false;
      if (caps.length > 0 && !caps.includes(s.capCategory)) return false;
      if (sectors.length > 0 && !sectors.includes(s.sector ?? '')) return false;
      if (v.yieldPct < minYield) return false;
      if (maxPayout < 200 && (v.payoutRatioPct == null || v.payoutRatioPct > maxPayout)) return false;
      if (v.growthStreak < minStreak) return false;
      if (exWithin > 0 && (v.daysToExDate == null || v.daysToExDate < 0 || v.daysToExDate > exWithin)) return false;
      if (onlyDiscounted && v.dropFromHigh < 10) return false;
      if (hideWarnings && v.warnings.length > 0) return false;
      return true;
    });

    rows.sort((a, b) => {
      switch (sortBy) {
        case 'yield':     return b.yieldPct - a.yieldPct;
        case 'growth':    return b.growthStreak - a.growthStreak || (b.cagr ?? 0) - (a.cagr ?? 0);
        case 'exDate': {
          const av = a.daysToExDate == null || a.daysToExDate < 0 ? 9999 : a.daysToExDate;
          const bv = b.daysToExDate == null || b.daysToExDate < 0 ? 9999 : b.daysToExDate;
          return av - bv;
        }
        case 'payout':    return (a.payoutRatioPct ?? 999) - (b.payoutRatioPct ?? 999);
        case 'discount':  return b.dropFromHigh - a.dropFromHigh;
        case 'marketCap': return b.stock.marketCap - a.stock.marketCap;
        default:          return b.total - a.total;
      }
    });

    return rows;
  }, [payers, search, markets, caps, sectors, minYield, maxPayout, minStreak, exWithin, onlyDiscounted, hideWarnings, sortBy]);

  // Ex-dates coming up, for the calendar strip
  const upcoming = useMemo(
    () => payers
      .filter(v => v.daysToExDate != null && v.daysToExDate >= 0 && v.daysToExDate <= 30)
      .sort((a, b) => (a.daysToExDate ?? 0) - (b.daysToExDate ?? 0))
      .slice(0, 12),
    [payers],
  );

  const activePreset = PRESETS.find(p => p.key === preset)!;
  const avgYield = filtered.length > 0
    ? filtered.reduce((a, v) => a + v.yieldPct, 0) / filtered.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold t-primary">Dividend Stocks</h1>
          <p className="text-sm t-muted mt-1">
            Every payer we track, ranked on how much they pay, how safely, and when you need to own them
          </p>
        </div>
        <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30 text-sm">
          {filtered.length} of {payers.length} payers
        </span>
        {filtered.length > 0 && (
          <span className="text-xs t-muted">Average yield {avgYield.toFixed(2)}%</span>
        )}
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
              Every stock here pays a dividend. The score blends four things — <strong className="t-secondary">yield</strong> (what
              it pays today), <strong className="t-secondary">safety</strong> (whether it can keep paying: payout ratio, cash cover,
              debt), <strong className="t-secondary">growth</strong> (is the payment rising, and how fast) and{' '}
              <strong className="t-secondary">consistency</strong> (has it been paid every year, for long enough to trust).
              The three presets just reweight those four.
            </p>
            <p>
              <strong className="t-secondary">Timing matters.</strong> You must own the stock <em>before</em> its ex-dividend date
              to be paid; buy on that date or later and the payment goes to the seller. The price typically drops by roughly the
              dividend amount on the ex-date, so buying purely to catch a dividend gains you nothing by itself — the payment is
              worth having when you wanted to own the company anyway.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><strong className="t-secondary">Payout ratio</strong> — dividends as a share of earnings. Under 60% is comfortable; over 100% means it is paying more than it earns.</li>
              <li><strong className="t-secondary">Cash cover</strong> — free cash flow ÷ dividends paid. Below 1x the cash is coming from somewhere other than the business.</li>
              <li><strong className="t-secondary">A very high yield is a warning, not a prize</strong> — above ~8% it usually means the market expects a cut. Those rows carry a red flag.</li>
              <li><strong className="t-secondary">Yield vs its own 5-yr average</strong> — a payer yielding well above its own history is often simply cheap right now.</li>
            </ul>
            <p className="text-xs mt-2 pt-2 border-t border-surface-border">
              <strong>Strategy tip:</strong> set Income preset, max payout 75%, minimum 5 years of rises, then sort by
              Biggest Discount — quality payers that are temporarily marked down, rather than whatever yields most today.
            </p>
          </div>
        </details>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              preset === p.key
                ? 'bg-accent/10 border-accent/30 text-accent-light'
                : 'bg-surface-tertiary border-surface-border t-tertiary hover:t-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="text-xs t-muted">{activePreset.blurb}</span>
      </div>

      {/* Upcoming ex-dates */}
      {upcoming.length > 0 && (
        <div className="card p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <div className="text-xs font-semibold t-tertiary uppercase tracking-wider">
              Ex-dividend dates in the next 30 days
            </div>
            <span className="text-xs t-muted">Own it before this date to receive the payment</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {upcoming.map(v => (
              <Link
                key={v.stock.ticker}
                to={`/stock/${v.stock.ticker}`}
                className="p-2.5 rounded-lg bg-surface-tertiary border border-surface-border hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-sm text-accent-light">{v.stock.ticker}</span>
                  <span className={`font-mono text-xs ${(v.daysToExDate ?? 99) <= 7 ? 'text-accent-light' : 't-secondary'}`}>
                    {exDateLabel(v)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] t-muted truncate">{v.nextExDate ? formatDate(v.nextExDate) : ''}</span>
                  <span className={`font-mono text-[11px] ${yieldColor(v.yieldPct)}`}>{v.yieldPct.toFixed(2)}%</span>
                </div>
                {v.nextExDateIsEstimate && (
                  <span className="block text-[9px] t-faint mt-0.5">estimated from its cycle</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-52"
          />
          <MultiSelect label="Market" options={ALL_MARKETS} selected={markets} onChange={setMarkets} />
          <MultiSelect label="Cap" options={ALL_CAPS} selected={caps} onChange={setCaps} />
          <MultiSelect label="Sector" options={allSectors} selected={sectors} onChange={setSectors} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="input-field"
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-xs">
          <FilterGroup label="Min yield">
            {[0, 2, 3, 4, 5, 6].map(v => (
              <Chip key={v} active={minYield === v} onClick={() => setMinYield(v)}>
                {v === 0 ? 'Any' : `${v}%+`}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Max payout">
            {[200, 100, 75, 60, 40].map(v => (
              <Chip key={v} active={maxPayout === v} onClick={() => setMaxPayout(v)}>
                {v === 200 ? 'Any' : `<${v}%`}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Years rising">
            {[0, 3, 5, 10].map(v => (
              <Chip key={v} active={minStreak === v} onClick={() => setMinStreak(v)}>
                {v === 0 ? 'Any' : `${v}+`}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Ex-date within">
            {[0, 7, 14, 30].map(v => (
              <Chip key={v} active={exWithin === v} onClick={() => setExWithin(v)}>
                {v === 0 ? 'Any' : `${v}d`}
              </Chip>
            ))}
          </FilterGroup>

          <label className="flex items-center gap-2 t-secondary cursor-pointer">
            <input type="checkbox" checked={onlyDiscounted} onChange={e => setOnlyDiscounted(e.target.checked)} className="accent-accent" />
            10%+ below 52w high
          </label>

          <label className="flex items-center gap-2 t-secondary cursor-pointer">
            <input type="checkbox" checked={hideWarnings} onChange={e => setHideWarnings(e.target.checked)} className="accent-accent" />
            Hide flagged risks
          </label>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm t-muted">
          No dividend payers match these filters — try loosening the yield or payout limits.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.slice(0, 150).map(v => (
            <DividendRow key={v.stock.ticker} view={v} />
          ))}
          {filtered.length > 150 && (
            <p className="text-xs t-muted text-center pt-2">
              Showing the top 150 of {filtered.length} — narrow the filters to see further down the list.
            </p>
          )}
        </div>
      )}

      <p className="text-xs t-muted">
        Dividend history from Yahoo Finance price data; payout ratio, ex-dividend and pay dates from Yahoo company data.
        Ex-dates marked "estimated" are projected from the company's own payment cycle. Educational purposes only — not
        investment advice.
      </p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="t-muted">{label}:</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-md border transition-all ${
        active
          ? 'bg-accent/15 border-accent/30 text-accent-light'
          : 'bg-surface-tertiary border-surface-border t-tertiary hover:t-primary'
      }`}
    >
      {children}
    </button>
  );
}
