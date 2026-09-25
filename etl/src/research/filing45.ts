/**
 * Filing45 as a source for the Big Investors page.
 *
 * Filing45 (filing45.devops-monk.com) runs its own ingest against SEC EDGAR,
 * the House Clerk, the Senate eFD and OGE, and exposes the result as a JSON
 * API. Pulling from it here replaces several fragile scrapes with one HTTP
 * call each, and brings far more coverage: every 13F filer it tracks rather
 * than a hand-kept list, every member of Congress who has filed, and the
 * executive-branch filings this page had no source for at all.
 *
 * The token lives in FILING45_TOKEN. Without it this module does nothing and
 * the existing scrapers still run, so a missing secret degrades rather than
 * breaks.
 */

import type { HoldingChange, InvestorHolding, Politician, PoliticianTrade, Superinvestor } from './big-investors.js';

const BASE = process.env.FILING45_BASE ?? 'https://filing45.devops-monk.com/api/v1';
const TOKEN = process.env.FILING45_TOKEN ?? '';

/** The API allows 120 requests a minute; stay comfortably inside it. */
const MIN_GAP_MS = 650;
const FUNDS_TO_DETAIL = 60;
const MEMBERS_TO_DETAIL = 60;
const TRADES_PER_MEMBER = 40;

export const filing45Configured = () => Boolean(TOKEN);

let lastRequestAt = 0;

async function get<T>(path: string): Promise<T | null> {
  const wait = MIN_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    // A 429 means the window is full; wait it out once rather than lose the run.
    if (res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) || 60;
      await new Promise(r => setTimeout(r, Math.min(reset, 90) * 1000));
      return get<T>(path);
    }
    if (!res.ok) {
      console.warn(`  Filing45 ${path} → HTTP ${res.status}`);
      return null;
    }
    const body = await res.json() as { data: T };
    return body.data;
  } catch (err) {
    console.warn(`  Filing45 ${path} failed: ${(err as Error).message}`);
    return null;
  }
}

/* ---------- 13F funds ---------- */

interface ApiFund {
  slug: string; firm: string; manager: string | null; style: string | null; cik: string;
  period_of_report: string; filed_date: string; portfolio_value: string | number; holdings_count: number;
}

interface ApiHolding {
  ticker: string | null; issuer: string; value: string | number; shares: string | number;
  pct_of_portfolio: string | number | null; change_type: string;
  shares_change: string | number | null; shares_change_pct: string | number | null;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "2026-06-30" → "Q2 2026" */
function quarterOf(period: string): string {
  const [year, month] = period.split('-');
  return `Q${Math.ceil(Number(month) / 3)} ${year}`;
}

const CHANGE: Record<string, HoldingChange> = {
  new: 'new', add: 'add', trim: 'trim', hold: 'hold', exit: 'exit',
};

function toHolding(h: ApiHolding, known: Set<string>): InvestorHolding {
  const ticker = h.ticker?.toUpperCase() ?? null;
  const pct = h.shares_change_pct == null ? null : num(h.shares_change_pct);
  return {
    cusip: '',                                   // the API exposes resolved tickers, not CUSIPs
    ticker,
    issuer: h.issuer,
    value: num(h.value),
    shares: num(h.shares),
    pctOfPortfolio: num(h.pct_of_portfolio),
    changeType: CHANGE[h.change_type] ?? 'hold',
    sharesChange: num(h.shares_change),
    sharesChangePct: pct,
    inUniverse: Boolean(ticker && known.has(ticker)),
  };
}

export async function fetchFiling45Funds(known: Set<string>): Promise<Superinvestor[]> {
  const funds = await get<ApiFund[]>('/funds?limit=300');
  if (!funds?.length) return [];

  // The API ranks by portfolio value, which buries the people this page is
  // about: Burry sits at #122 and Ackman at #101, behind anonymous index
  // managers running hundreds of billions. A named manager is the marker of a
  // fund anyone follows by name, so those come first, each half by size.
  const ranked = [...funds].sort((a, b) => {
    const named = Number(Boolean(b.manager)) - Number(Boolean(a.manager));
    return named || num(b.portfolio_value) - num(a.portfolio_value);
  });

  const named = ranked.filter(f => f.manager).length;
  console.log(`  Filing45: ${funds.length} funds listed (${named} with a named manager), detailing the first ${Math.min(FUNDS_TO_DETAIL, ranked.length)}`);
  const staleBefore = Date.now() - 200 * 24 * 60 * 60 * 1000;   // two quarters without a filing
  const out: Superinvestor[] = [];

  for (const fund of ranked.slice(0, FUNDS_TO_DETAIL)) {
    const detail = await get<ApiFund & { holdings: ApiHolding[]; filing_url: string }>(`/funds/${fund.slug}`);
    if (!detail) continue;

    const holdings = (detail.holdings ?? []).map(h => toHolding(h, known));
    const held = holdings.filter(h => h.changeType !== 'exit');

    out.push({
      id: fund.slug,
      manager: fund.manager ?? fund.firm,
      firm: fund.firm,
      cik: fund.cik,
      style: fund.style ?? '',
      quarter: quarterOf(fund.period_of_report),
      periodOfReport: fund.period_of_report,
      filedAt: fund.filed_date,
      filingUrl: detail.filing_url ?? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${fund.cik}&type=13F`,
      portfolioValue: num(fund.portfolio_value),
      holdingsCount: fund.holdings_count,
      topHoldings: held.slice(0, 25),
      newBuys: holdings.filter(h => h.changeType === 'new'),
      addedTo: holdings.filter(h => h.changeType === 'add'),
      trimmed: holdings.filter(h => h.changeType === 'trim'),
      soldOut: holdings.filter(h => h.changeType === 'exit'),
      stale: new Date(`${fund.filed_date}T00:00:00Z`).getTime() < staleBefore,
    });
  }

  return out;
}

/* ---------- Congress ---------- */

interface ApiMember {
  slug: string; full_name: string; chamber: string; party: string | null;
  state: string | null; district: string | null; image_url: string | null;
  trade_count: number; last_traded: string | null; median_disclosure_days: number | null;
}

interface ApiTrade {
  ticker: string | null; asset_name: string; asset_type: string | null;
  transaction_type: string; transaction_date: string | null; filed_date: string;
  disclosure_lag_days: number | null;
  amount_min: string | number | null; amount_max: string | number | null; amount_range: string | null;
}

/** "P" / "S (partial)" → the words the page already uses. */
function transactionWord(type: string): string {
  if (/^P/i.test(type)) return 'Purchase';
  if (/^S/i.test(type)) return 'Sale';
  if (/^E/i.test(type)) return 'Exchange';
  return type;
}

/** The midpoint of the disclosed band is the only defensible single number. */
function midpoint(min: unknown, max: unknown): number | null {
  const lo = num(min);
  const hi = num(max);
  if (!lo && !hi) return null;
  if (!hi) return lo;
  return Math.round((lo + hi) / 2);
}

function toTrade(t: ApiTrade, known: Set<string>): PoliticianTrade {
  const ticker = t.ticker?.toUpperCase() ?? '';
  return {
    ticker,
    assetName: t.asset_name,
    transaction: transactionWord(t.transaction_type),
    tradedDate: t.transaction_date ?? '',
    filedDate: t.filed_date,
    amountRange: t.amount_range ?? '',
    amountEstimate: midpoint(t.amount_min, t.amount_max),
    assetType: t.asset_type ?? '',
    sector: null,
    description: t.asset_name,
    inUniverse: Boolean(ticker && known.has(ticker)),
  };
}

export async function fetchFiling45Congress(known: Set<string>): Promise<Politician[]> {
  const members = await get<ApiMember[]>(`/members?limit=${MEMBERS_TO_DETAIL}`);
  if (!members?.length) return [];

  const active = members.filter(m => m.trade_count > 0);
  console.log(`  Filing45: ${active.length} members with disclosed trades`);
  const out: Politician[] = [];

  for (const member of active) {
    const trades = await get<ApiTrade[]>(`/trades?member=${member.slug}&limit=${TRADES_PER_MEMBER}`);
    if (!trades?.length) continue;

    const mapped = trades.map(t => toTrade(t, known));
    out.push({
      id: member.slug,
      name: member.full_name,
      chamber: member.chamber === 'senate' ? 'Senate' : 'House',
      party: member.party ?? '',
      image: member.image_url,
      profileUrl: `https://filing45.devops-monk.com/members/${member.slug}`,
      tradeCount: member.trade_count,
      buyCount: mapped.filter(t => t.transaction === 'Purchase').length,
      sellCount: mapped.filter(t => t.transaction === 'Sale').length,
      volumeEstimate: mapped.reduce((sum, t) => sum + (t.amountEstimate ?? 0), 0),
      lastTraded: member.last_traded,
      trades: mapped,
    });
  }

  return out;
}

/* ---------- Executive branch ---------- */

export interface ExecutiveTransaction {
  assetName: string;
  transaction: string;
  tradedDate: string;
  filedDate: string;
  amountRange: string;
  amountEstimate: number | null;
  confident: boolean;
  sourceUrl: string;
}

export interface ExecutiveOfficial {
  id: string;
  name: string;
  role: string;
  profileUrl: string;
  transactionCount: number;
  lastFiled: string | null;
  transactions: ExecutiveTransaction[];
}

interface ApiOfficial { slug: string; full_name: string; role: string | null; transaction_count: number; last_filed: string | null }
interface ApiOfficialTrade {
  asset_name: string; transaction_type: string; transaction_date: string | null; filed_date: string;
  amount_min: string | number | null; amount_max: string | number | null; amount_range: string | null;
  confident: boolean; source_url: string;
}

export async function fetchFiling45Executive(): Promise<ExecutiveOfficial[]> {
  const officials = await get<ApiOfficial[]>('/executive');
  if (!officials?.length) return [];

  const out: ExecutiveOfficial[] = [];
  for (const person of officials.filter(o => o.transaction_count > 0)) {
    const detail = await get<ApiOfficial & { transactions: ApiOfficialTrade[] }>(`/executive/${person.slug}?limit=80`);
    if (!detail) continue;

    out.push({
      id: person.slug,
      name: person.full_name,
      role: person.role ?? 'Executive branch',
      profileUrl: `https://filing45.devops-monk.com/executive/${person.slug}`,
      transactionCount: person.transaction_count,
      lastFiled: person.last_filed,
      transactions: (detail.transactions ?? []).map(t => ({
        assetName: t.asset_name,
        transaction: transactionWord(t.transaction_type),
        tradedDate: t.transaction_date ?? '',
        filedDate: t.filed_date,
        amountRange: t.amount_range ?? '',
        amountEstimate: midpoint(t.amount_min, t.amount_max),
        confident: t.confident !== false,
        sourceUrl: t.source_url,
      })),
    });
  }

  console.log(`  Filing45: ${out.length} executive-branch officials`);
  return out;
}

/* ---------- Coverage ---------- */

export interface Filing45Coverage {
  trades: number;
  members: number;
  funds: number;
  fundHoldings: number;
  executiveTransactions: number;
  medianDisclosureDays: number | null;
  latestFiling: string | null;
}

export async function fetchFiling45Coverage(): Promise<Filing45Coverage | null> {
  const stats = await get<Record<string, number | string | null>>('/stats');
  if (!stats) return null;
  return {
    trades: num(stats.trades),
    members: num(stats.members_tracked),
    funds: num(stats.funds),
    fundHoldings: num(stats.fund_holdings),
    executiveTransactions: num(stats.executive_transactions),
    medianDisclosureDays: stats.median_disclosure_days == null ? null : num(stats.median_disclosure_days),
    latestFiling: (stats.latest_filing as string | null) ?? null,
  };
}
