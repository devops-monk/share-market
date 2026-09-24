import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type {
  BigInvestorsData, InvestorHolding, Politician, PoliticianTrade, StockRecord, Superinvestor,
} from '../types';
import { ScoreBadge, ChangePercent } from '../components/common/Tags';
import InfoTooltip from '../components/common/InfoTooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'funds' | 'congress';
type FundView = 'topHoldings' | 'newBuys' | 'addedTo' | 'trimmed' | 'soldOut';
type TradeSide = 'all' | 'buy' | 'sell';

const FUND_VIEWS: { key: FundView; label: string; desc: string }[] = [
  { key: 'topHoldings', label: 'Top Holdings', desc: 'Largest positions at quarter end' },
  { key: 'newBuys',     label: 'New Buys',     desc: 'Positions opened last quarter' },
  { key: 'addedTo',     label: 'Added To',     desc: 'Existing positions increased' },
  { key: 'trimmed',     label: 'Trimmed',      desc: 'Existing positions reduced' },
  { key: 'soldOut',     label: 'Sold Out',     desc: 'Positions closed entirely' },
];

const CHANGE_STYLE: Record<string, { label: string; className: string }> = {
  new:  { label: 'NEW',  className: 'bg-bullish/15 text-bullish ring-1 ring-bullish/30' },
  add:  { label: 'ADD',  className: 'bg-bullish/10 text-bullish ring-1 ring-bullish/20' },
  trim: { label: 'TRIM', className: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20' },
  exit: { label: 'EXIT', className: 'bg-bearish/10 text-bearish ring-1 ring-bearish/20' },
  hold: { label: 'HOLD', className: 'bg-surface-tertiary t-muted ring-1 ring-surface-border' },
};

const PARTY_STYLE: Record<string, string> = {
  Democratic:  'bg-accent/10 text-accent-light ring-1 ring-accent/20',
  Republican:  'bg-bearish/10 text-bearish ring-1 ring-bearish/20',
  Independent: 'bg-surface-tertiary t-secondary ring-1 ring-surface-border',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3)  return `$${(value / 1e3).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatShares(shares: number): string {
  const abs = Math.abs(shares);
  if (abs >= 1e9) return `${(shares / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(shares / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(shares / 1e3).toFixed(1)}K`;
  return shares.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Compact one-line date for dense rows: "28 Jul", with the year only if it differs. */
function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', year: '2-digit' });
}

function daysAgo(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`).getTime();
  if (Number.isNaN(d)) return 9999;
  return Math.floor((Date.now() - d) / 86_400_000);
}

function isBuy(t: PoliticianTrade): boolean {
  return /purchase|buy/i.test(t.transaction);
}

function isSell(t: PoliticianTrade): boolean {
  return /sale|sold|sell/i.test(t.transaction);
}

function holdingsFor(investor: Superinvestor, view: FundView): InvestorHolding[] {
  return investor[view] ?? [];
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

/** Ticker chip — links into the stock page when we actually track the stock. */
function TickerChip({ ticker, issuer, inUniverse, compact = false }: {
  ticker: string | null;
  issuer?: string;
  inUniverse: boolean;
  compact?: boolean;
}) {
  if (!ticker) {
    // In compact rows the issuer name is already shown in the next column
    return compact
      ? <span className="text-sm t-faint" title={issuer}>&ndash;</span>
      : <span className="block font-semibold text-sm t-secondary truncate" title={issuer}>{issuer ?? '—'}</span>;
  }
  if (!inUniverse) {
    return (
      <span
        className="block font-mono font-semibold text-sm t-secondary truncate"
        title={`${issuer ?? ticker} — not tracked on this dashboard`}
      >
        {ticker}
      </span>
    );
  }
  return (
    <Link
      to={`/stock/${ticker}`}
      className="block font-mono font-semibold text-sm text-accent-light hover:underline truncate"
      title={issuer ?? ticker}
    >
      {ticker}
    </Link>
  );
}

/** Consensus: which tickers the most independent investors touched. */
interface ConsensusRow {
  ticker: string;
  issuer: string;
  inUniverse: boolean;
  names: string[];
  value: number;
}

function ConsensusPanel({
  title, subtitle, rows, stockMap, emptyMessage,
}: {
  title: string;
  subtitle: string;
  rows: ConsensusRow[];
  stockMap: Map<string, StockRecord>;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card p-4">
        <div className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">{title}</div>
        <p className="text-sm t-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <div className="text-xs font-semibold t-tertiary uppercase tracking-wider">{title}</div>
        <span className="text-xs t-muted">{subtitle}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(row => {
          const stock = stockMap.get(row.ticker);
          return (
            <div key={row.ticker} className="p-3 rounded-lg bg-surface-tertiary border border-surface-border">
              <div className="flex items-center justify-between gap-2">
                <TickerChip ticker={row.ticker} issuer={row.issuer} inUniverse={row.inUniverse} />
                <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30">
                  {row.names.length}x
                </span>
              </div>
              <p className="text-[11px] t-muted mt-1 truncate" title={row.issuer}>{row.issuer}</p>
              <p className="text-[11px] t-secondary mt-1.5 line-clamp-2" title={row.names.join(', ')}>
                {row.names.join(' · ')}
              </p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-border text-[11px]">
                <span className="t-muted">{formatUsd(row.value)}</span>
                {stock && (
                  <>
                    <span className="t-faint">|</span>
                    <ChangePercent value={stock.changePercent} />
                    <span className="ml-auto"><ScoreBadge score={stock.score.composite} size="sm" /></span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fund manager card ────────────────────────────────────────────────────────

function FundCard({ investor, view, stockMap, onlyTracked }: {
  investor: Superinvestor;
  view: FundView;
  stockMap: Map<string, StockRecord>;
  onlyTracked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const holdings = useMemo(() => {
    const all = holdingsFor(investor, view);
    return onlyTracked ? all.filter(h => h.inUniverse) : all;
  }, [investor, view, onlyTracked]);

  const visible = expanded ? holdings : holdings.slice(0, 8);

  return (
    <div className="card p-4 flex flex-col">
      {/* Manager header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold t-primary truncate">{investor.manager}</h3>
          <p className="text-xs t-muted truncate">{investor.firm}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-mono font-semibold t-primary">{formatUsd(investor.portfolioValue)}</div>
          <div className="text-[10px] t-muted">{investor.holdingsCount.toLocaleString()} positions</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">{investor.style}</span>
        <span className="badge bg-accent/10 text-accent-light ring-1 ring-accent/20">{investor.quarter}</span>
        {investor.stale && (
          <span className="badge bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20" title="No recent 13F filing">
            Stale
          </span>
        )}
      </div>

      {/* Holdings list */}
      <div className="mt-3 space-y-1.5 flex-1">
        {visible.length === 0 ? (
          <p className="text-xs t-muted py-3">
            {onlyTracked ? 'Nothing here among the stocks we track.' : 'Nothing reported in this category.'}
          </p>
        ) : visible.map(h => {
          const style = CHANGE_STYLE[h.changeType] ?? CHANGE_STYLE.hold;
          return (
            <div key={`${h.cusip}-${h.ticker ?? ''}`} className="flex items-center gap-2 text-xs">
              <div className="w-16 flex-shrink-0 overflow-hidden">
                <TickerChip ticker={h.ticker} issuer={h.issuer} inUniverse={h.inUniverse} compact />
              </div>
              <span className="flex-1 t-muted truncate" title={h.issuer}>{h.issuer}</span>
              {view === 'topHoldings' && (
                <span className="font-mono t-secondary w-12 text-right">{h.pctOfPortfolio.toFixed(1)}%</span>
              )}
              <span className="font-mono t-tertiary w-14 text-right">{formatUsd(h.value)}</span>
              {view !== 'topHoldings' && h.sharesChangePct != null && h.changeType !== 'new' && (
                <span className={`font-mono w-14 text-right ${h.sharesChangePct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {h.sharesChangePct > 0 ? '+' : ''}{h.sharesChangePct.toFixed(0)}%
                </span>
              )}
              {view === 'topHoldings' && (
                <span className={`badge ${style.className} text-[9px] px-1.5`}>{style.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-surface-border">
        {holdings.length > 8 ? (
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-accent-light hover:underline">
            {expanded ? 'Show less' : `Show all ${holdings.length}`}
          </button>
        ) : <span />}
        <a
          href={investor.filingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[11px] t-muted hover:text-accent-light"
          title={`13F filed ${formatDate(investor.filedAt)}`}
        >
          SEC filing &#8599;
        </a>
      </div>
    </div>
  );
}

// ─── Politician card ──────────────────────────────────────────────────────────

function PoliticianCard({ politician, side, stockMap, onlyTracked }: {
  politician: Politician;
  side: TradeSide;
  stockMap: Map<string, StockRecord>;
  onlyTracked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const trades = useMemo(() => politician.trades.filter(t => {
    if (onlyTracked && !t.inUniverse) return false;
    if (side === 'buy') return isBuy(t);
    if (side === 'sell') return isSell(t);
    return true;
  }), [politician.trades, side, onlyTracked]);

  const visible = expanded ? trades : trades.slice(0, 6);

  return (
    <div className="card p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3">
        {politician.image ? (
          <img
            src={politician.image}
            alt=""
            loading="lazy"
            className="w-10 h-10 rounded-full object-cover bg-surface-tertiary border border-surface-border flex-shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-tertiary border border-surface-border flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold t-primary truncate">{politician.name}</h3>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">{politician.chamber}</span>
            <span className={`badge ${PARTY_STYLE[politician.party] ?? 'bg-surface-tertiary t-secondary ring-1 ring-surface-border'}`}>
              {politician.party}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-mono font-semibold t-primary">{formatUsd(politician.volumeEstimate)}</div>
          <div className="text-[10px] t-muted">
            <span className="text-bullish">{politician.buyCount} buy</span>
            {' / '}
            <span className="text-bearish">{politician.sellCount} sell</span>
          </div>
        </div>
      </div>

      {/* Trades */}
      <div className="mt-3 space-y-1.5 flex-1">
        {visible.length === 0 ? (
          <p className="text-xs t-muted py-3">No trades match this filter.</p>
        ) : visible.map((t, i) => (
          <div key={`${t.ticker}-${t.tradedDate}-${i}`} className="flex items-center gap-2 text-xs">
            <span className={`badge text-[9px] px-1.5 flex-shrink-0 ${
              isBuy(t)
                ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/30'
                : isSell(t)
                  ? 'bg-bearish/10 text-bearish ring-1 ring-bearish/20'
                  : 'bg-surface-tertiary t-muted ring-1 ring-surface-border'
            }`}>
              {isBuy(t) ? 'BUY' : isSell(t) ? 'SELL' : 'EXCH'}
            </span>
            <div className="w-16 flex-shrink-0 overflow-hidden">
              <TickerChip ticker={t.ticker} issuer={t.assetName} inUniverse={t.inUniverse} compact />
            </div>
            <span className="flex-1 t-muted truncate" title={t.description || t.assetName}>
              {t.amountRange || t.assetName}
            </span>
            {t.assetType === 'Options' && (
              <span className="badge bg-purple-500/10 text-purple-400 text-[9px] px-1.5 flex-shrink-0">OPT</span>
            )}
            <span
              className="t-faint w-14 text-right flex-shrink-0 whitespace-nowrap"
              title={`Traded ${formatDate(t.tradedDate)} · filed ${formatDate(t.filedDate)}`}
            >
              {formatShortDate(t.tradedDate)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-surface-border">
        {trades.length > 6 ? (
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-accent-light hover:underline">
            {expanded ? 'Show less' : `Show all ${trades.length}`}
          </button>
        ) : <span />}
        <span className="text-[11px] t-muted">
          {politician.lastTraded ? `Last trade ${daysAgo(politician.lastTraded)}d ago` : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  stocks: StockRecord[];
  bigInvestors: BigInvestorsData | null;
}

export default function BigInvestors({ stocks, bigInvestors }: Props) {
  const [tab, setTab] = useState<Tab>('funds');
  const [fundView, setFundView] = useState<FundView>('topHoldings');
  const [side, setSide] = useState<TradeSide>('all');
  const [search, setSearch] = useState('');
  const [onlyTracked, setOnlyTracked] = useState(false);

  const stockMap = useMemo(
    () => new Map(stocks.map(s => [s.ticker.toUpperCase(), s])),
    [stocks],
  );

  const funds = bigInvestors?.superinvestors ?? [];
  const politicians = bigInvestors?.politicians ?? [];

  const query = search.trim().toLowerCase();

  // ── Fund filtering ──
  const filteredFunds = useMemo(() => {
    if (!query) return funds;
    return funds.filter(f =>
      f.manager.toLowerCase().includes(query) ||
      f.firm.toLowerCase().includes(query) ||
      holdingsFor(f, fundView).some(h =>
        (h.ticker ?? '').toLowerCase().includes(query) || h.issuer.toLowerCase().includes(query)
      )
    );
  }, [funds, query, fundView]);

  // ── Fund consensus: same stock bought by several managers ──
  const fundConsensus = useMemo<ConsensusRow[]>(() => {
    const map = new Map<string, ConsensusRow>();
    for (const f of funds) {
      const bought = [...f.newBuys, ...f.addedTo];
      const seen = new Set<string>();
      for (const h of bought) {
        const key = h.ticker ?? h.issuer;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const row = map.get(key);
        if (row) {
          row.names.push(f.manager);
          row.value += h.value;
        } else {
          map.set(key, {
            ticker: h.ticker ?? '',
            issuer: h.issuer,
            inUniverse: h.inUniverse,
            names: [f.manager],
            value: h.value,
          });
        }
      }
    }
    return [...map.values()]
      .filter(r => r.names.length >= 2)
      .sort((a, b) => b.names.length - a.names.length || b.value - a.value)
      .slice(0, 12);
  }, [funds]);

  // ── Politician filtering ──
  const filteredPoliticians = useMemo(() => {
    if (!query) return politicians;
    return politicians.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.party.toLowerCase().includes(query) ||
      p.chamber.toLowerCase().includes(query) ||
      p.trades.some(t => t.ticker.toLowerCase().includes(query) || t.assetName.toLowerCase().includes(query))
    );
  }, [politicians, query]);

  // ── Congress consensus: most-bought tickers in the last 90 days ──
  const congressBuys = useMemo<ConsensusRow[]>(() => {
    const map = new Map<string, ConsensusRow>();
    for (const p of politicians) {
      const seen = new Set<string>();
      for (const t of p.trades) {
        if (!isBuy(t) || daysAgo(t.tradedDate) > 90) continue;
        if (seen.has(t.ticker)) continue;
        seen.add(t.ticker);
        const row = map.get(t.ticker);
        if (row) {
          row.names.push(p.name);
          row.value += t.amountEstimate ?? 0;
        } else {
          map.set(t.ticker, {
            ticker: t.ticker,
            issuer: t.assetName,
            inUniverse: t.inUniverse,
            names: [p.name],
            value: t.amountEstimate ?? 0,
          });
        }
      }
    }
    return [...map.values()]
      .sort((a, b) => b.names.length - a.names.length || b.value - a.value);
  }, [politicians]);

  // Several members buying the same name is the real signal; when nobody
  // overlaps, fall back to showing the largest individual purchases.
  const congressConsensus = useMemo(() => {
    const shared = congressBuys.filter(r => r.names.length >= 2);
    return shared.length >= 3 ? shared.slice(0, 12) : congressBuys.slice(0, 12);
  }, [congressBuys]);
  const congressShared = congressConsensus.some(r => r.names.length >= 2);

  const hasData = funds.length > 0 || politicians.length > 0;
  const activeView = FUND_VIEWS.find(v => v.key === fundView);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold t-primary">Big Investors</h1>
          <p className="text-sm t-muted mt-1">
            What famous fund managers and members of Congress are actually buying and selling
          </p>
        </div>
        <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30 text-sm">
          {funds.length} funds &middot; {politicians.length} politicians
        </span>
        {bigInvestors?.updatedAt && (
          <span className="text-xs t-muted">
            Updated {new Date(bigInvestors.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
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
              <strong className="t-secondary">Fund managers</strong> running over $100M in US equities must file a{' '}
              <strong className="t-secondary">Form 13F</strong> with the SEC within 45 days of each quarter end.
              We read those filings straight from SEC EDGAR and compare the latest two quarters, so you can see which
              positions were opened, added to, trimmed or closed.
            </p>
            <p>
              <strong className="t-secondary">Members of Congress</strong> must disclose personal stock trades within
              45 days under the STOCK Act. Those disclosures are what feeds the Congress tab — including options trades,
              which are flagged <span className="badge bg-purple-500/10 text-purple-400 text-[9px] px-1.5">OPT</span>.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li><strong className="t-secondary">Both sources are delayed by design</strong> — a 13F shows a portfolio as it looked at quarter end, not today. Positions may already have changed.</li>
              <li><strong className="t-secondary">13F covers long US equity only</strong> — no shorts, bonds, cash or foreign listings, so a portfolio here is not the manager's whole book. Option positions are excluded.</li>
              <li><strong className="t-secondary">Congress amounts are ranges</strong>, not exact figures. We use the midpoint of each disclosed range to estimate size.</li>
              <li><strong className="t-secondary">Consensus is the useful signal</strong> — one manager buying is an opinion; five independent managers buying the same name is a pattern worth researching.</li>
            </ul>
            <p className="text-xs mt-2 pt-2 border-t border-surface-border">
              <strong>Strategy tip:</strong> use this page for idea generation, not entries. Take a name that several
              investors bought, then check its score, trend and fundamentals on its stock page before doing anything.
            </p>
          </div>
        </details>
      </div>

      {!hasData ? (
        <div className="card p-8 text-center">
          <p className="text-sm t-secondary font-medium">No big-investor data yet</p>
          <p className="text-xs t-muted mt-2">
            13F holdings and congressional trades are collected by the ETL pipeline. They will appear here after the
            next run.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-lg bg-surface-tertiary border border-surface-border">
              <button
                onClick={() => setTab('funds')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'funds' ? 'bg-accent/15 text-accent-light' : 't-tertiary hover:t-primary'
                }`}
              >
                Fund Managers
              </button>
              <button
                onClick={() => setTab('congress')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === 'congress' ? 'bg-accent/15 text-accent-light' : 't-tertiary hover:t-primary'
                }`}
              >
                Congress
              </button>
            </div>

            <input
              type="text"
              placeholder={tab === 'funds' ? 'Search manager or ticker...' : 'Search politician or ticker...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field w-56"
            />

            {tab === 'congress' && (
              <div className="flex gap-1 p-1 rounded-lg bg-surface-tertiary border border-surface-border">
                {(['all', 'buy', 'sell'] as TradeSide[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                      side === s ? 'bg-accent/15 text-accent-light' : 't-tertiary hover:t-primary'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'buy' ? 'Buys' : 'Sells'}
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-xs t-secondary cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={onlyTracked}
                onChange={e => setOnlyTracked(e.target.checked)}
                className="accent-accent"
              />
              <InfoTooltip text="Hide tickers that are not part of this dashboard's stock universe (ETFs, foreign listings, private funds).">
                <span className="underline decoration-dotted decoration-surface-border">Only stocks we track</span>
              </InfoTooltip>
            </label>
          </div>

          {tab === 'funds' ? (
            <>
              {/* View selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {FUND_VIEWS.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setFundView(v.key)}
                    title={v.desc}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      fundView === v.key
                        ? 'bg-accent/10 border-accent/30 text-accent-light'
                        : 'bg-surface-tertiary border-surface-border t-tertiary hover:t-primary'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
                {activeView && <span className="text-xs t-muted">{activeView.desc}</span>}
              </div>

              <ConsensusPanel
                title="Bought by multiple managers"
                subtitle="New or increased positions, last reported quarter"
                rows={fundConsensus}
                stockMap={stockMap}
                emptyMessage="No stock was bought by two or more of these managers in the latest quarter."
              />

              {filteredFunds.length === 0 ? (
                <div className="card p-8 text-center text-sm t-muted">No managers match your search.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFunds.map(f => (
                    <FundCard
                      key={f.id}
                      investor={f}
                      view={fundView}
                      stockMap={stockMap}
                      onlyTracked={onlyTracked}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <ConsensusPanel
                title={congressShared ? 'Bought by multiple members' : 'Largest recent purchases'}
                subtitle="Purchases disclosed in the last 90 days"
                rows={congressConsensus}
                stockMap={stockMap}
                emptyMessage="No purchases disclosed in the last 90 days."
              />

              {filteredPoliticians.length === 0 ? (
                <div className="card p-8 text-center text-sm t-muted">No politicians match your search.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPoliticians.map(p => (
                    <PoliticianCard
                      key={p.id}
                      politician={p}
                      side={side}
                      stockMap={stockMap}
                      onlyTracked={onlyTracked}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          <p className="text-xs t-muted">
            Sources: SEC EDGAR Form 13F filings (fund managers) and STOCK Act disclosures aggregated by QuiverQuant
            (Congress). Educational purposes only — not investment advice.
          </p>
        </>
      )}
    </div>
  );
}
