import pLimit from 'p-limit';
import { CONFIG } from '../config.js';

export interface InsiderTrade {
  ticker: string;
  filingDate: string;
  insiderName: string;
  insiderTitle: string;
  transactionType: 'P' | 'S' | 'A' | 'D' | string; // Purchase, Sale, Award, Disposition
  transactionDate: string;
  shares: number;
  pricePerShare: number | null;
  totalValue: number | null;
}

export interface InsiderSummary {
  ticker: string;
  trades: InsiderTrade[];
  netShares90d: number;
  buyCount90d: number;
  sellCount90d: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// SEC requires a descriptive User-Agent
const EDGAR_HEADERS = {
  'User-Agent': CONFIG.edgarUserAgent,
  'Accept': 'application/json',
};

/**
 * Fetch insider trading data for a set of US tickers from SEC EDGAR.
 */
export async function fetchInsiderTrades(
  tickers: string[],
  marketCaps: Map<string, number>,
): Promise<Map<string, InsiderSummary>> {
  const results = new Map<string, InsiderSummary>();

  // Step 1: Build ticker → CIK mapping
  console.log('  Fetching SEC EDGAR company tickers...');
  const cikMap = await fetchCikMap();
  if (cikMap.size === 0) {
    console.warn('  Failed to fetch CIK map — skipping insider trading');
    return results;
  }
  console.log(`  CIK map: ${cikMap.size} companies`);

  // Step 2: Select top 200 US stocks by market cap
  const usTickers = tickers
    .filter(t => !t.includes('.')) // US stocks don't have dots
    .sort((a, b) => (marketCaps.get(b) ?? 0) - (marketCaps.get(a) ?? 0))
    .slice(0, 200);

  // Step 3: Fetch insider filings for each ticker
  const limit = pLimit(CONFIG.edgarConcurrency);
  const lookbackMs = CONFIG.insiderLookbackDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - lookbackMs);

  let fetched = 0;
  await Promise.all(
    usTickers.map(ticker =>
      limit(async () => {
        const cik = cikMap.get(ticker.toUpperCase());
        if (!cik) return;

        try {
          const trades = await fetchForm4Filings(ticker, cik, cutoffDate);
          if (trades.length > 0) {
            const summary = computeInsiderSummary(ticker, trades);
            results.set(ticker, summary);
          }
        } catch {
          // Silently skip on error
        }

        fetched++;
        if (fetched % 50 === 0) {
          console.log(`    Insider trades: ${fetched}/${usTickers.length}`);
        }

        await delay(120); // SEC rate limit
      })
    )
  );

  console.log(`  Fetched insider trades for ${results.size} stocks`);
  return results;
}

async function fetchCikMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: EDGAR_HEADERS,
    });
    if (!res.ok) return map;

    const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
    for (const entry of Object.values(data)) {
      // Pad CIK to 10 digits as required by EDGAR
      const paddedCik = String(entry.cik_str).padStart(10, '0');
      map.set(entry.ticker.toUpperCase(), paddedCik);
    }
  } catch (err) {
    console.warn('  Failed to fetch CIK map:', err);
  }
  return map;
}

async function fetchForm4Filings(
  ticker: string,
  cik: string,
  cutoffDate: Date,
): Promise<InsiderTrade[]> {
  const allTrades: InsiderTrade[] = [];

  try {
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const res = await fetch(url, { headers: EDGAR_HEADERS });
    if (!res.ok) return allTrades;

    const data = await res.json() as any;
    const recent = data.filings?.recent;
    if (!recent) return allTrades;

    const forms = recent.form as string[];
    const filingDates = recent.filingDate as string[];
    const accessionNumbers = recent.accessionNumber as string[];
    const primaryDocuments = recent.primaryDocument as string[];

    // Collect Form 4 filing references (limit to 10 most recent for rate limiting)
    const form4Refs: { accession: string; primaryDoc: string; filingDate: string }[] = [];
    for (let i = 0; i < forms.length && form4Refs.length < 10; i++) {
      if (forms[i] !== '4' && forms[i] !== '4/A') continue;

      const filingDate = new Date(filingDates[i]);
      if (filingDate < cutoffDate) break; // filings are reverse chronological

      form4Refs.push({
        accession: accessionNumbers[i],
        primaryDoc: primaryDocuments[i],
        filingDate: filingDates[i],
      });
    }

    // Fetch and parse each Form 4 XML for real transaction data
    for (const ref of form4Refs) {
      const trades = await parseForm4Xml(
        ticker, cik, ref.accession, ref.primaryDoc, ref.filingDate,
      );
      allTrades.push(...trades);
      await delay(120); // SEC rate limit: ~10 req/sec
    }

    return allTrades;
  } catch {
    return allTrades;
  }
}

/**
 * Parse Form 4 XML to extract transaction details.
 * Fetches the actual filing XML for accurate data.
 */
async function parseForm4Xml(
  ticker: string,
  cik: string,
  accession: string,
  primaryDoc: string,
  filingDate: string,
): Promise<InsiderTrade[]> {
  const trades: InsiderTrade[] = [];

  try {
    const accFormatted = accession.replace(/-/g, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accFormatted}/${primaryDoc}`;
    const res = await fetch(url, { headers: EDGAR_HEADERS });
    if (!res.ok) return trades;

    const xml = await res.text();

    // Extract reporter name
    const nameMatch = xml.match(/<rptOwnerName>([^<]+)<\/rptOwnerName>/);
    const name = nameMatch?.[1] ?? 'Unknown';

    // Extract title
    const titleMatch = xml.match(/<officerTitle>([^<]+)<\/officerTitle>/);
    const title = titleMatch?.[1] ?? '';

    // Extract transactions
    const txRegex = /<(nonDerivativeTransaction|derivativeTransaction)>([\s\S]*?)<\/\1>/g;
    let match;
    while ((match = txRegex.exec(xml)) !== null) {
      const txXml = match[2];

      const codeMatch = txXml.match(/<transactionCode>([^<]+)<\/transactionCode>/);
      const code = codeMatch?.[1] ?? '';

      const sharesMatch = txXml.match(/<transactionShares>[\s\S]*?<value>([^<]+)<\/value>/);
      const shares = sharesMatch ? parseFloat(sharesMatch[1]) : 0;

      const priceMatch = txXml.match(/<transactionPricePerShare>[\s\S]*?<value>([^<]+)<\/value>/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      const dateMatch = txXml.match(/<transactionDate>[\s\S]*?<value>([^<]+)<\/value>/);
      const txDate = dateMatch?.[1] ?? filingDate;

      const adMatch = txXml.match(/<transactionAcquiredDisposedCode>[\s\S]*?<value>([^<]+)<\/value>/);
      const adCode = adMatch?.[1] ?? '';

      if (shares > 0 && (code === 'P' || code === 'S' || code === 'A' || code === 'D' || code === 'M')) {
        trades.push({
          ticker,
          filingDate,
          insiderName: name,
          insiderTitle: title,
          transactionType: code,
          transactionDate: txDate,
          shares: adCode === 'D' ? -shares : shares,
          pricePerShare: price,
          totalValue: price != null ? +(shares * price).toFixed(2) : null,
        });
      }
    }
  } catch {
    // Skip on error
  }

  return trades;
}

function extractReporterName(companyName: string): string {
  // Fallback name extraction from company name
  return companyName || 'Unknown';
}

function computeInsiderSummary(ticker: string, trades: InsiderTrade[]): InsiderSummary {
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const recent90d = trades.filter(t => {
    const d = new Date(t.transactionDate).getTime();
    return now - d <= ninetyDaysMs;
  });

  let netShares = 0;
  let buyCount = 0;
  let sellCount = 0;

  for (const t of recent90d) {
    if (t.transactionType === 'P') {
      buyCount++;
      netShares += Math.abs(t.shares);
    } else if (t.transactionType === 'S') {
      sellCount++;
      netShares -= Math.abs(t.shares);
    }
  }

  const sentiment: InsiderSummary['sentiment'] =
    buyCount > sellCount * 2 ? 'bullish' :
    sellCount > buyCount * 2 ? 'bearish' :
    'neutral';

  return {
    ticker,
    trades,
    netShares90d: netShares,
    buyCount90d: buyCount,
    sellCount90d: sellCount,
    sentiment,
  };
}
