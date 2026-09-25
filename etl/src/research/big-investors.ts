import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import {
  fetchFiling45Congress,
  fetchFiling45Coverage,
  fetchFiling45Executive,
  fetchFiling45Funds,
  filing45Configured,
  type ExecutiveOfficial,
  type Filing45Coverage,
} from './filing45.js';

/**
 * Big Investors — what famous investors and politicians are actually buying.
 *
 * Two independent, free data sources:
 *  1. SEC EDGAR 13F-HR filings → quarterly holdings of ~30 well-known fund
 *     managers (Buffett, Ackman, Burry, Dalio, Wood, ...). We pull the two most
 *     recent quarters so we can diff them into new buys / adds / trims / exits.
 *  2. QuiverQuant's public congressional-trading pages → individual stock
 *     transactions disclosed by members of Congress (Pelosi, Tuberville, ...).
 *
 * CUSIPs in 13F filings are mapped to tickers via OpenFIGI (free, no key) with
 * an on-disk cache so repeat runs cost almost nothing.
 *
 * When FILING45_TOKEN is set, both halves come instead from the Filing45 API,
 * which ingests the same filings plus the Senate and the executive branch and
 * covers far more filers than the hand-kept list below. The scrapers stay as
 * the fallback for a missing token or an unreachable API, so this page keeps
 * working either way.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type HoldingChange = 'new' | 'add' | 'trim' | 'hold' | 'exit';

export interface InvestorHolding {
  cusip: string;
  ticker: string | null;
  issuer: string;
  value: number;             // USD market value at quarter end
  shares: number;
  pctOfPortfolio: number;    // 0-100
  changeType: HoldingChange;
  sharesChange: number;      // vs previous quarter (0 when unknown)
  sharesChangePct: number | null;
  inUniverse: boolean;       // ticker exists in our stock universe
}

export interface Superinvestor {
  id: string;
  manager: string;           // person, e.g. "Warren Buffett"
  firm: string;              // filer, e.g. "Berkshire Hathaway"
  cik: string;
  style: string;             // short label, e.g. "Value"
  quarter: string;           // "Q2 2026"
  periodOfReport: string;    // "2026-06-30"
  filedAt: string;           // "2026-08-14"
  filingUrl: string;
  portfolioValue: number;
  holdingsCount: number;
  topHoldings: InvestorHolding[];
  newBuys: InvestorHolding[];
  addedTo: InvestorHolding[];
  trimmed: InvestorHolding[];
  soldOut: InvestorHolding[];
  stale: boolean;            // filing older than ~7 months
}

export interface PoliticianTrade {
  ticker: string;
  assetName: string;
  transaction: string;       // Purchase | Sale | Exchange | ...
  tradedDate: string;        // YYYY-MM-DD
  filedDate: string;         // YYYY-MM-DD
  amountRange: string;       // "$1,000,001 - $5,000,000"
  amountEstimate: number | null;
  assetType: string;
  sector: string | null;
  description: string;
  inUniverse: boolean;
}

export interface Politician {
  id: string;                // bioguide ID
  name: string;
  chamber: string;           // House | Senate
  party: string;             // Democratic | Republican | ...
  image: string | null;
  profileUrl: string;
  tradeCount: number;        // disclosed trades in our window
  buyCount: number;
  sellCount: number;
  volumeEstimate: number;    // summed midpoint estimates in our window
  lastTraded: string | null;
  trades: PoliticianTrade[];
}

export interface BigInvestorsData {
  updatedAt: string;
  superinvestors: Superinvestor[];
  politicians: Politician[];
  /** Cabinet and White House filings. Only present when Filing45 supplied them. */
  executive?: ExecutiveOfficial[];
  /** How much ground the source covers, for the page to state plainly. */
  coverage?: Filing45Coverage | null;
  source?: 'filing45' | 'scraped';
}

export type { ExecutiveOfficial, ExecutiveTransaction, Filing45Coverage } from './filing45.js';

// ─── Config ──────────────────────────────────────────────────────────────────

/** Well-known 13F filers. CIKs verified against data.sec.gov. */
const SUPERINVESTORS: { manager: string; firm: string; cik: string; style: string }[] = [
  { manager: 'Warren Buffett',        firm: 'Berkshire Hathaway',   cik: '0001067983', style: 'Value' },
  { manager: 'Bill Ackman',           firm: 'Pershing Square',      cik: '0002026053', style: 'Activist' },
  { manager: 'Michael Burry',         firm: 'Scion Asset Mgmt',     cik: '0001649339', style: 'Contrarian' },
  { manager: 'Ray Dalio',             firm: 'Bridgewater',          cik: '0001350694', style: 'Macro' },
  { manager: 'Stanley Druckenmiller', firm: 'Duquesne Family Office', cik: '0001536411', style: 'Macro' },
  { manager: 'David Tepper',          firm: 'Appaloosa',            cik: '0001656456', style: 'Distressed' },
  { manager: 'Daniel Loeb',           firm: 'Third Point',          cik: '0001040273', style: 'Activist' },
  { manager: 'Chase Coleman',         firm: 'Tiger Global',         cik: '0001167483', style: 'Growth' },
  { manager: 'Philippe Laffont',      firm: 'Coatue Management',    cik: '0001135730', style: 'Tech Growth' },
  { manager: 'Cathie Wood',           firm: 'ARK Invest',           cik: '0001697748', style: 'Disruptive Growth' },
  { manager: 'Jim Simons',            firm: 'Renaissance Tech',     cik: '0001037389', style: 'Quant' },
  { manager: 'Ken Griffin',           firm: 'Citadel Advisors',     cik: '0001423053', style: 'Multi-Strategy' },
  { manager: 'Stephen Mandel',        firm: 'Lone Pine Capital',    cik: '0001061165', style: 'Growth' },
  { manager: 'Andreas Halvorsen',     firm: 'Viking Global',        cik: '0001103804', style: 'Long/Short' },
  { manager: 'Seth Klarman',          firm: 'Baupost Group',        cik: '0001061768', style: 'Deep Value' },
  { manager: 'George Soros',          firm: 'Soros Fund Mgmt',      cik: '0001029160', style: 'Macro' },
  { manager: 'Paul Singer',           firm: 'Elliott Management',   cik: '0001791786', style: 'Activist' },
  { manager: 'Li Lu',                 firm: 'Himalaya Capital',     cik: '0001709323', style: 'Value' },
  { manager: 'Terry Smith',           firm: 'Fundsmith',            cik: '0001569205', style: 'Quality Growth' },
  { manager: 'Chuck Akre',            firm: 'Akre Capital',         cik: '0001112520', style: 'Compounders' },
  { manager: 'Mohnish Pabrai',        firm: 'Dalal Street',         cik: '0001549575', style: 'Value' },
  { manager: 'Gates Foundation',      firm: 'Gates Foundation Trust', cik: '0001166559', style: 'Endowment' },
  { manager: 'Nelson Peltz',          firm: 'Trian Fund Mgmt',      cik: '0001345471', style: 'Activist' },
  { manager: 'Joel Greenblatt',       firm: 'Gotham Asset Mgmt',    cik: '0001510387', style: 'Quant Value' },
  { manager: 'Howard Marks',          firm: 'Oaktree Capital',      cik: '0000949509', style: 'Credit / Distressed' },
  { manager: 'Chris Hohn',            firm: 'TCI Fund Mgmt',        cik: '0001647251', style: 'Concentrated' },
  { manager: 'David Abrams',          firm: 'Abrams Capital',       cik: '0001358706', style: 'Value' },
  { manager: 'Israel Englander',      firm: 'Millennium Mgmt',      cik: '0001273087', style: 'Multi-Strategy' },
  { manager: 'Two Sigma',             firm: 'Two Sigma Investments', cik: '0001179392', style: 'Quant' },
];

const EDGAR_HEADERS = {
  'User-Agent': CONFIG.edgarUserAgent,
  'Accept': 'application/json, text/xml, */*',
};

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

const TOP_HOLDINGS = 25;        // holdings kept per manager
const TOP_MOVES = 12;           // buys/adds/trims/exits kept per manager
const MAX_CUSIP_LOOKUPS = 320;  // new OpenFIGI lookups per run (rate-limited; cache converges)
const MAX_POLITICIANS = 14;     // most active members of Congress to fetch
const CONGRESS_BUDGET_MS = 150_000; // stop fetching members past this point
const POLITICIAN_TRADES = 40;   // trades kept per politician
const CONGRESS_LOOKBACK_DAYS = 365;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── CUSIP → ticker (OpenFIGI + on-disk cache) ───────────────────────────────

const cusipCachePath = () => path.join(CONFIG.dataDir, 'cusip-tickers.json');

function loadCusipCache(): Record<string, string | null> {
  try {
    const p = cusipCachePath();
    if (!existsSync(p)) return {};
    return JSON.parse(readFileSync(p, 'utf-8')) as Record<string, string | null>;
  } catch {
    return {};
  }
}

function saveCusipCache(cache: Record<string, string | null>) {
  try {
    writeFileSync(cusipCachePath(), JSON.stringify(cache));
  } catch { /* non-fatal */ }
}

/**
 * Resolve CUSIPs to tickers. OpenFIGI allows 25 requests/min with 10 jobs each
 * without an API key, so we batch, pace ourselves, and cache to disk. Each run
 * only looks up a capped number of new CUSIPs (highest-value positions first)
 * and the cache is flushed after every batch, so the map converges over runs
 * instead of any single run blowing its time budget.
 */
async function resolveCusips(prioritised: string[]): Promise<Record<string, string | null>> {
  const cache = loadCusipCache();
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const c of prioritised) {
    if (seen.has(c) || c in cache) continue;
    seen.add(c);
    missing.push(c);
    if (missing.length >= MAX_CUSIP_LOOKUPS) break;
  }
  if (missing.length === 0) {
    console.log(`  CUSIP map: ${Object.keys(cache).length} cached, nothing new to resolve`);
    return cache;
  }

  console.log(`  Resolving ${missing.length} new CUSIPs via OpenFIGI (${Object.keys(cache).length} cached)...`);
  let resolved = 0;

  for (let i = 0; i < missing.length; i += 10) {
    const batch = missing.slice(i, i + 10);
    let throttled = false;

    // Only a definitive "no match" is cached — a transient failure is simply
    // left for the next run rather than poisoning the map with a null.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch('https://api.openfigi.com/v3/mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'StockDashboard/1.0' },
          body: JSON.stringify(batch.map(c => ({ idType: 'ID_CUSIP', idValue: c, exchCode: 'US' }))),
        });

        if (res.status === 429) {
          throttled = true;
          await delay(6000 * attempt);
          continue;
        }
        if (!res.ok) break;

        const data = await res.json() as { data?: { ticker?: string }[] }[];
        batch.forEach((cusip, idx) => {
          const ticker = data[idx]?.data?.[0]?.ticker ?? null;
          cache[cusip] = ticker ? ticker.replace(/\//g, '-') : null;
          if (ticker) resolved++;
        });
        throttled = false;
        break;
      } catch {
        await delay(2000 * attempt);
      }
    }

    saveCusipCache(cache);   // flush as we go so a timeout still makes progress
    if (throttled) {
      console.warn('  OpenFIGI is rate-limiting — resolving the rest on a later run');
      break;
    }
    await delay(2600);       // stay under 25 req/min
  }

  console.log(`  CUSIP map: ${resolved}/${missing.length} newly resolved`);
  return cache;
}

// ─── SEC EDGAR 13F ───────────────────────────────────────────────────────────

interface RawHolding {
  cusip: string;
  issuer: string;
  value: number;
  shares: number;
}

interface Filing {
  accession: string;
  filedAt: string;
  periodOfReport: string;
  holdings: RawHolding[];
}

/**
 * EDGAR throttles bursts with 403/429 responses, so every request gets a couple
 * of backed-off retries. Without this a busy run silently loses managers.
 */
async function edgarFetch(url: string, attempts = 4): Promise<Response | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: EDGAR_HEADERS });
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        await delay(3000 * attempt);   // SEC parks bursty clients for a while
        continue;
      }
      if (!res.ok) return null;
      return res;
    } catch {
      await delay(1000 * attempt);
    }
  }
  return null;
}

async function edgarJson<T>(url: string): Promise<T | null> {
  try {
    const res = await edgarFetch(url);
    return res ? await res.json() as T : null;
  } catch {
    return null;
  }
}

async function edgarText(url: string): Promise<string | null> {
  try {
    const res = await edgarFetch(url);
    return res ? await res.text() : null;
  } catch {
    return null;
  }
}

/** The two most recent 13F-HR accession numbers (newest first). */
async function recent13FAccessions(cik: string): Promise<{ accession: string; filedAt: string }[]> {
  const data = await edgarJson<any>(`https://data.sec.gov/submissions/CIK${cik}.json`);
  const recent = data?.filings?.recent;
  if (!recent) return [];

  const out: { accession: string; filedAt: string }[] = [];
  for (let i = 0; i < recent.form.length && out.length < 2; i++) {
    if (recent.form[i] !== '13F-HR') continue;
    out.push({ accession: recent.accessionNumber[i], filedAt: recent.filingDate[i] });
  }
  return out;
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#39);/gi, m => XML_ENTITIES[m.toLowerCase()] ?? m);
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}

function parseInformationTable(xml: string): RawHolding[] {
  const byCusip = new Map<string, RawHolding>();
  const blockRe = /<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/g;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    if (/<(?:\w+:)?putCall>/.test(block)) continue; // options, not share positions

    const cusip = (tag(block, 'cusip') ?? '').toUpperCase();
    if (cusip.length < 6) continue;

    const issuer = tag(block, 'nameOfIssuer') ?? cusip;
    const value = parseFloat(tag(block, 'value') ?? '0');
    const shares = parseFloat(tag(block, 'sshPrnamt') ?? '0');
    const type = tag(block, 'sshPrnamtType');
    if (type && type.toUpperCase() !== 'SH') continue; // skip principal-amount (debt) rows
    if (!Number.isFinite(value) || !Number.isFinite(shares)) continue;

    const existing = byCusip.get(cusip);
    if (existing) {
      existing.value += value;
      existing.shares += shares;
    } else {
      byCusip.set(cusip, { cusip, issuer: titleCase(issuer), value, shares });
    }
  }

  return normaliseValues([...byCusip.values()]);
}

/**
 * Filings have reported values in whole dollars since 2023; older ones used
 * thousands. Detect the unit from the implied share price and rescale.
 */
function normaliseValues(holdings: RawHolding[]): RawHolding[] {
  const prices = holdings
    .filter(h => h.shares > 0 && h.value > 0)
    .map(h => h.value / h.shares)
    .sort((a, b) => a - b);
  if (prices.length === 0) return holdings;

  const median = prices[Math.floor(prices.length / 2)];
  if (median < 1) {
    for (const h of holdings) h.value *= 1000;
  }
  return holdings;
}

function titleCase(s: string): string {
  return decodeEntities(s)
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s&./-])([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase())
    .replace(/\b(Inc|Corp|Llc|Ltd|Plc|Co|Lp|Sa|Nv|Ag)\b/g, t => t.toUpperCase())
    .trim();
}

async function fetch13FFiling(cik: string, accession: string, filedAt: string): Promise<Filing | null> {
  const accNoDash = accession.replace(/-/g, '');
  const cikPlain = cik.replace(/^0+/, '');
  const base = `https://www.sec.gov/Archives/edgar/data/${cikPlain}/${accNoDash}`;

  const index = await edgarJson<{ directory: { item: { name: string; size: string }[] } }>(`${base}/index.json`);
  if (!index) return null;
  await delay(250);

  const items = index.directory?.item ?? [];
  // The information table is the largest .xml that isn't the cover page.
  const candidates = items
    .filter(it => it.name.toLowerCase().endsWith('.xml') && !/primary_doc/i.test(it.name))
    .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
  if (candidates.length === 0) return null;

  const [infoXml, coverXml] = await Promise.all([
    edgarText(`${base}/${candidates[0].name}`),
    edgarText(`${base}/primary_doc.xml`),
  ]);
  if (!infoXml) return null;

  const holdings = parseInformationTable(infoXml);
  if (holdings.length === 0) return null;

  // periodOfReport comes as MM-DD-YYYY on the cover page
  let period = filedAt;
  const raw = coverXml ? tag(coverXml, 'periodOfReport') : null;
  if (raw) {
    const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    period = m ? `${m[3]}-${m[1]}-${m[2]}` : raw;
  }

  return { accession, filedAt, periodOfReport: period, holdings };
}

function quarterLabel(period: string): string {
  const d = new Date(`${period}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return period;
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

function classify(
  current: RawHolding,
  previous: RawHolding | undefined,
  hasPreviousFiling: boolean,
): { changeType: HoldingChange; sharesChange: number; sharesChangePct: number | null } {
  // With no prior filing to diff against we cannot tell new from long-held
  if (!hasPreviousFiling) return { changeType: 'hold', sharesChange: 0, sharesChangePct: null };
  if (!previous) return { changeType: 'new', sharesChange: current.shares, sharesChangePct: null };

  const diff = current.shares - previous.shares;
  const pct = previous.shares > 0 ? (diff / previous.shares) * 100 : null;
  // Ignore sub-1% wobble (share splits, rounding) as "hold"
  if (pct != null && Math.abs(pct) < 1) return { changeType: 'hold', sharesChange: diff, sharesChangePct: pct };
  if (diff > 0) return { changeType: 'add', sharesChange: diff, sharesChangePct: pct };
  if (diff < 0) return { changeType: 'trim', sharesChange: diff, sharesChangePct: pct };
  return { changeType: 'hold', sharesChange: 0, sharesChangePct: 0 };
}

export async function fetchSuperinvestors(knownTickers: Set<string>): Promise<Superinvestor[]> {
  console.log('Fetching superinvestor 13F holdings from SEC EDGAR...');

  const limit = pLimit(Math.min(3, CONFIG.edgarConcurrency));
  const raw: { meta: typeof SUPERINVESTORS[number]; current: Filing; previous: Filing | null }[] = [];

  await Promise.all(
    SUPERINVESTORS.map(meta =>
      limit(async () => {
        try {
          const accessions = await recent13FAccessions(meta.cik);
          if (accessions.length === 0) {
            console.warn(`  ${meta.firm}: no 13F-HR filings found`);
            return;
          }
          await delay(250);

          const current = await fetch13FFiling(meta.cik, accessions[0].accession, accessions[0].filedAt);
          if (!current) {
            console.warn(`  ${meta.firm}: could not read latest 13F (${accessions[0].accession})`);
            return;
          }
          await delay(250);

          const previous = accessions[1]
            ? await fetch13FFiling(meta.cik, accessions[1].accession, accessions[1].filedAt)
            : null;

          raw.push({ meta, current, previous });
        } catch (err) {
          // A single manager failing must not take the rest down
          console.warn(`  ${meta.firm}: 13F fetch failed — ${(err as Error).message}`);
        }
        await delay(250);
      })
    )
  );

  // Resolve only the CUSIPs we will actually publish, round-robin across
  // managers so every portfolio gets its biggest positions named first.
  const perManager = raw.map(({ current, previous }) => {
    const rank = (hs: RawHolding[], n: number) =>
      [...hs].sort((a, b) => b.value - a.value).slice(0, n).map(h => h.cusip);
    return [...rank(current.holdings, TOP_HOLDINGS * 2), ...rank(previous?.holdings ?? [], TOP_HOLDINGS)];
  });
  const prioritised: string[] = [];
  const deepest = Math.max(0, ...perManager.map(l => l.length));
  for (let i = 0; i < deepest; i++) {
    for (const list of perManager) {
      if (i < list.length) prioritised.push(list[i]);
    }
  }
  const cusipToTicker = await resolveCusips(prioritised);

  const staleCutoff = Date.now() - 210 * 24 * 60 * 60 * 1000;

  const investors: Superinvestor[] = raw.map(({ meta, current, previous }) => {
    const portfolioValue = current.holdings.reduce((a, h) => a + h.value, 0);
    const prevByCusip = new Map((previous?.holdings ?? []).map(h => [h.cusip, h]));
    const currentByCusip = new Map(current.holdings.map(h => [h.cusip, h]));

    const toHolding = (h: RawHolding, changeType: HoldingChange, sharesChange: number, sharesChangePct: number | null): InvestorHolding => {
      const ticker = cusipToTicker[h.cusip] ?? null;
      return {
        cusip: h.cusip,
        ticker,
        issuer: h.issuer,
        value: Math.round(h.value),
        shares: Math.round(h.shares),
        pctOfPortfolio: portfolioValue > 0 ? +((h.value / portfolioValue) * 100).toFixed(2) : 0,
        changeType,
        sharesChange: Math.round(sharesChange),
        sharesChangePct: sharesChangePct == null ? null : +sharesChangePct.toFixed(1),
        inUniverse: ticker != null && knownTickers.has(ticker),
      };
    };

    const hasPreviousFiling = previous != null && previous.holdings.length > 0;
    const enriched = current.holdings.map(h => {
      const { changeType, sharesChange, sharesChangePct } = classify(h, prevByCusip.get(h.cusip), hasPreviousFiling);
      return toHolding(h, changeType, sharesChange, sharesChangePct);
    });

    const byValue = [...enriched].sort((a, b) => b.value - a.value);
    const hasPrevious = hasPreviousFiling;

    // Exits: held last quarter, gone this quarter (valued at last quarter's price)
    const soldOut: InvestorHolding[] = hasPrevious
      ? (previous!.holdings)
          .filter(h => !currentByCusip.has(h.cusip))
          .sort((a, b) => b.value - a.value)
          .slice(0, TOP_MOVES)
          .map(h => {
            const ticker = cusipToTicker[h.cusip] ?? null;
            return {
              cusip: h.cusip,
              ticker,
              issuer: h.issuer,
              value: Math.round(h.value),
              shares: Math.round(h.shares),
              pctOfPortfolio: 0,
              changeType: 'exit' as const,
              sharesChange: -Math.round(h.shares),
              sharesChangePct: -100,
              inUniverse: ticker != null && knownTickers.has(ticker),
            };
          })
      : [];

    return {
      id: meta.cik,
      manager: meta.manager,
      firm: meta.firm,
      cik: meta.cik,
      style: meta.style,
      quarter: quarterLabel(current.periodOfReport),
      periodOfReport: current.periodOfReport,
      filedAt: current.filedAt,
      filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${meta.cik}&type=13F-HR&dateb=&owner=include&count=10`,
      portfolioValue: Math.round(portfolioValue),
      holdingsCount: current.holdings.length,
      topHoldings: byValue.slice(0, TOP_HOLDINGS),
      newBuys: hasPrevious ? byValue.filter(h => h.changeType === 'new').slice(0, TOP_MOVES) : [],
      addedTo: hasPrevious ? byValue.filter(h => h.changeType === 'add').slice(0, TOP_MOVES) : [],
      trimmed: hasPrevious ? byValue.filter(h => h.changeType === 'trim').slice(0, TOP_MOVES) : [],
      soldOut,
      stale: new Date(`${current.periodOfReport}T00:00:00Z`).getTime() < staleCutoff,
    };
  });

  investors.sort((a, b) => b.portfolioValue - a.portfolioValue);
  console.log(`Superinvestors: ${investors.length}/${SUPERINVESTORS.length} filers with holdings`);
  return investors;
}

// ─── Congress trading ────────────────────────────────────────────────────────

const PARTY_LABEL: Record<string, string> = { D: 'Democratic', R: 'Republican', I: 'Independent' };

interface MemberRef {
  name: string;
  slug: string;
  chamber: string;
  party: string;
  image: string | null;
  volumeEstimate: number;
}

/** QuiverQuant rate-limits bursts, so fetch politely and back off on 429. */
async function fetchCongressHtml(url: string, attempts = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.quiverquant.com/congresstrading/',
        },
      });
      if (res.status === 429) {
        await delay(4000 * attempt);
        continue;
      }
      if (!res.ok) return null;
      return await res.text();
    } catch {
      await delay(1500 * attempt);
    }
  }
  return null;
}

function parseMoney(text: string): number {
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Most active members of Congress, ranked by disclosed trade volume. */
function parseMemberRanking(html: string): MemberRef[] {
  const $ = cheerio.load(html);
  const members: MemberRef[] = [];
  const seen = new Set<string>();

  $('tr').each((_, tr) => {
    const row = $(tr);
    const link = row.find('a[href*="/congresstrading/politician/"]').first();
    if (link.length === 0) return;

    const href = link.attr('href') ?? '';
    const slug = href.split('/congresstrading/politician/')[1];
    if (!slug || seen.has(slug)) return;

    const name = link.find('strong').first().text().trim();
    if (!name) return;

    const meta = link.find('span').first().text().trim();       // "House - Democratic"
    const [chamber, party] = meta.split('-').map(s => s.trim());
    const image = link.find('img').first().attr('src') ?? null;
    const cells = row.find('td');
    const volumeEstimate = parseMoney(cells.eq(cells.length - 1).text());

    seen.add(slug);
    members.push({
      name,
      slug,
      chamber: chamber || 'Unknown',
      party: party || 'Unknown',
      image,
      volumeEstimate,
    });
  });

  return members.sort((a, b) => b.volumeEstimate - a.volumeEstimate);
}

/**
 * Politician pages embed their trades as a `let tradeData = [[...]];` literal.
 * Column order: ticker, transaction, filed, traded, description, excessReturn,
 * politician, id, assetName, assetType, amountRange, chamber, party, sector,
 * amountEstimate.
 */
function parseTradeData(html: string): any[][] {
  const marker = html.search(/tradeData\s*=\s*\[\[/);
  if (marker === -1) return [];
  const start = html.indexOf('[[', marker);
  if (start === -1) return [];

  let depth = 0;
  let inString = false;
  let end = -1;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) return [];

  // The literal is JS, not JSON: unquoted NaN/Infinity appear in the
  // excess-return column, so neutralise them before parsing.
  const literal = html
    .slice(start, end)
    .replace(/(?<=[,[]\s*)(?:NaN|-?Infinity)(?=\s*[,\]])/g, 'null');

  try {
    const parsed = JSON.parse(literal);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dateOnly(value: unknown): string {
  if (typeof value !== 'string') return '';
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';  // source uses "NaT" for missing dates
}

export async function fetchCongressTrades(knownTickers: Set<string>): Promise<Politician[]> {
  console.log('Fetching congressional stock trades...');

  const indexHtml = await fetchCongressHtml('https://www.quiverquant.com/congresstrading/');
  if (!indexHtml) {
    console.warn('  Congress index page unavailable — skipping');
    return [];
  }

  const ranking = parseMemberRanking(indexHtml).slice(0, MAX_POLITICIANS);
  if (ranking.length === 0) {
    console.warn('  No politicians parsed from index page — layout may have changed');
    return [];
  }

  const cutoff = new Date(Date.now() - CONGRESS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  // One page at a time: these are multi-megabyte pages behind a rate limiter
  const limit = pLimit(1);
  const politicians: Politician[] = [];
  const deadline = Date.now() + CONGRESS_BUDGET_MS;

  await Promise.all(
    ranking.map(member =>
      limit(async () => {
        if (Date.now() > deadline) return;   // keep whatever we already have
        const url = `https://www.quiverquant.com/congresstrading/politician/${encodeURI(member.slug)}`;
        const html = await fetchCongressHtml(url);
        if (!html) {
          await delay(1000);
          return;
        }

        const rows = parseTradeData(html);
        const trades: PoliticianTrade[] = [];

        for (const row of rows) {
          const ticker = typeof row[0] === 'string' ? row[0].trim().toUpperCase() : '';
          const tradedDate = dateOnly(row[3]);
          if (!ticker || !tradedDate || tradedDate < cutoff) continue;

          const amountEstimate = typeof row[14] === 'number' ? row[14] : null;
          trades.push({
            ticker,
            assetName: typeof row[8] === 'string' ? titleCase(row[8]) : ticker,
            transaction: typeof row[1] === 'string' ? row[1] : 'Unknown',
            tradedDate,
            filedDate: dateOnly(row[2]),
            amountRange: typeof row[10] === 'string' ? row[10] : '',
            amountEstimate,
            assetType: typeof row[9] === 'string' ? row[9] : 'Stock',
            sector: typeof row[13] === 'string' ? row[13] : null,
            description: typeof row[4] === 'string' ? row[4] : '',
            inUniverse: knownTickers.has(ticker),
          });
        }

        if (trades.length === 0) return;

        trades.sort((a, b) => b.tradedDate.localeCompare(a.tradedDate));
        const kept = trades.slice(0, POLITICIAN_TRADES);
        const isBuy = (t: PoliticianTrade) => /purchase|buy/i.test(t.transaction);
        const isSell = (t: PoliticianTrade) => /sale|sold|sell/i.test(t.transaction);

        politicians.push({
          id: member.slug.split('-').pop() ?? member.slug,
          name: member.name,
          chamber: member.chamber,
          party: PARTY_LABEL[member.party] ?? member.party,
          image: member.image,
          profileUrl: url,
          tradeCount: kept.length,
          buyCount: kept.filter(isBuy).length,
          sellCount: kept.filter(isSell).length,
          volumeEstimate: Math.round(kept.reduce((a, t) => a + (t.amountEstimate ?? 0), 0)),
          lastTraded: kept[0]?.tradedDate ?? null,
          trades: kept,
        });

        await delay(1000);
      })
    )
  );

  politicians.sort((a, b) => b.volumeEstimate - a.volumeEstimate);
  console.log(`Congress trades: ${politicians.length} members, ${politicians.reduce((a, p) => a + p.trades.length, 0)} trades`);
  return politicians;
}

// ─── Main export ─────────────────────────────────────────────────────────────

function loadExisting(): BigInvestorsData | null {
  try {
    const p = path.join(CONFIG.dataDir, 'big-investors.json');
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf-8')) as BigInvestorsData;
  } catch {
    return null;
  }
}

/**
 * Both sources rate-limit, so a run can come back with only part of the list.
 * Merge fresh entries over the previous file per investor rather than
 * replacing wholesale, dropping carried-over entries once they go cold.
 */
function mergeCarryingOver<T extends { id: string }>(
  fresh: T[],
  previous: T[],
  stillFresh: (carried: T) => boolean,
): { merged: T[]; carried: number } {
  const byId = new Map<string, T>();
  let carried = 0;

  for (const p of previous) {
    if (!stillFresh(p)) continue;
    byId.set(p.id, p);
    carried++;
  }
  for (const f of fresh) {
    if (byId.has(f.id)) carried--;
    byId.set(f.id, f);
  }

  return { merged: [...byId.values()], carried };
}

export async function fetchBigInvestors(allTickers: string[]): Promise<BigInvestorsData> {
  const knownTickers = new Set(allTickers.map(t => t.toUpperCase()));

  // Filing45 first when it is configured; its ingest covers every 13F filer it
  // tracks, both chambers and the executive branch. The scrapers below remain
  // the fallback, so a missing token or a bad day for the API costs coverage
  // rather than the whole page.
  let superinvestors: Superinvestor[] = [];
  let politicians: Politician[] = [];
  let executive: ExecutiveOfficial[] = [];
  let coverage: Filing45Coverage | null = null;
  let source: 'filing45' | 'scraped' = 'scraped';

  if (filing45Configured()) {
    console.log('  Using Filing45 as the source for big investors');
    [superinvestors, politicians, executive, coverage] = await Promise.all([
      fetchFiling45Funds(knownTickers).catch(() => [] as Superinvestor[]),
      fetchFiling45Congress(knownTickers).catch(() => [] as Politician[]),
      fetchFiling45Executive().catch(() => [] as ExecutiveOfficial[]),
      fetchFiling45Coverage().catch(() => null),
    ]);
    if (superinvestors.length || politicians.length) source = 'filing45';
  }

  if (!superinvestors.length) {
    superinvestors = await fetchSuperinvestors(knownTickers).catch(err => {
      console.warn('Superinvestor fetch failed:', (err as Error).message);
      return [] as Superinvestor[];
    });
  }

  if (!politicians.length) {
    politicians = await fetchCongressTrades(knownTickers).catch(err => {
      console.warn('Congress fetch failed:', (err as Error).message);
      return [] as Politician[];
    });
  }

  const previous = loadExisting();

  // 13F filings are quarterly — keep a carried-over portfolio for up to 15
  // months, after which the manager has clearly stopped filing.
  const fundCutoff = Date.now() - 455 * 24 * 60 * 60 * 1000;
  const funds = mergeCarryingOver(
    superinvestors,
    previous?.superinvestors ?? [],
    f => new Date(`${f.periodOfReport}T00:00:00Z`).getTime() > fundCutoff,
  );
  funds.merged.sort((a, b) => b.portfolioValue - a.portfolioValue);

  const tradeCutoff = new Date(Date.now() - CONGRESS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const members = mergeCarryingOver(
    politicians,
    previous?.politicians ?? [],
    p => (p.lastTraded ?? '') >= tradeCutoff,
  );
  members.merged.sort((a, b) => b.volumeEstimate - a.volumeEstimate);

  if (funds.carried > 0 || members.carried > 0) {
    console.log(`  Carried over ${funds.carried} funds and ${members.carried} politicians from the previous run`);
  }

  return {
    updatedAt: new Date().toISOString(),
    superinvestors: funds.merged,
    politicians: members.merged,
    // Executive filings are rare, so an empty pull means an unreachable API far
    // more often than it means there is nothing to show.
    executive: executive.length ? executive : previous?.executive ?? [],
    coverage: coverage ?? previous?.coverage ?? null,
    source,
  };
}
