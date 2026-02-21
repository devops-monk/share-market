import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import { CONFIG } from '../config.js';
import type { StockMeta } from './universe.js';

export interface QuoteData {
  ticker: string;
  name: string;
  market: 'US' | 'UK';
  sector: string;
  trading212: boolean;
  price: number;
  previousClose: number;
  changePercent: number;
  marketCap: number;
  capCategory: 'Small' | 'Mid' | 'Large';
  pe: number | null;
  forwardPe: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  beta: number | null;
  volume: number;
  avgVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  historicalClose: number[];
  historicalVolume: number[];
}

function classifyCap(marketCap: number): 'Small' | 'Mid' | 'Large' {
  if (marketCap < CONFIG.marketCap.small) return 'Small';
  if (marketCap < CONFIG.marketCap.mid) return 'Mid';
  return 'Large';
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------- Yahoo v8 Chart API (no auth needed) ----------

interface ChartData {
  price: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  closes: number[];
  volumes: number[];
}

async function fetchChart(ticker: string): Promise<ChartData | null> {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=6mo&includePrePost=false`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) {
        await delay((attempt + 1) * 2000);
        continue;
      }
      if (!res.ok) return null;

      const data = await res.json() as any;
      const result = data?.chart?.result?.[0];
      if (!result?.meta?.regularMarketPrice) return null;

      const m = result.meta;
      const closes = (result.indicators?.quote?.[0]?.close || []).filter((v: any) => v != null) as number[];
      const volumes = (result.indicators?.quote?.[0]?.volume || []).filter((v: any) => v != null) as number[];

      return {
        price: m.regularMarketPrice,
        previousClose: m.chartPreviousClose ?? m.regularMarketPrice,
        volume: m.regularMarketVolume ?? (volumes.length > 0 ? volumes[volumes.length - 1] : 0),
        marketCap: 0, // filled by quoteSummary or FinViz later
        fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? Math.max(...closes, m.regularMarketPrice),
        fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? Math.min(...closes, m.regularMarketPrice),
        closes,
        volumes,
      };
    } catch {
      if (attempt < 2) await delay(1000);
    }
  }
  return null;
}

// ---------- Yahoo v7 Quote (fundamentals for UK stocks, requires crumb auth) ----------

interface YahooFundamentals {
  marketCap: number;
  pe: number | null;
  forwardPe: number | null;
  beta: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  avgVolume: number;
}

// Yahoo v7 quote API requires a crumb + cookie pair. Get it once per run.
let yahooCrumb: string | null = null;
let yahooCookie: string | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (yahooCrumb && yahooCookie) return { crumb: yahooCrumb, cookie: yahooCookie };

  try {
    // Step 1: Get cookie from Yahoo
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA },
      redirect: 'manual',
    });
    const setCookie = cookieRes.headers.get('set-cookie');
    if (!setCookie) return null;

    // Extract the A3 cookie value
    const cookieValue = setCookie.split(';')[0];

    // Step 2: Get crumb using the cookie
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': UA,
        'Cookie': cookieValue,
      },
    });
    if (!crumbRes.ok) return null;

    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes('<!')) return null;

    yahooCrumb = crumb;
    yahooCookie = cookieValue;
    return { crumb, cookie: cookieValue };
  } catch {
    return null;
  }
}

async function fetchYahooFundamentalsBatch(tickers: string[]): Promise<Map<string, YahooFundamentals>> {
  const result = new Map<string, YahooFundamentals>();
  const auth = await getYahooCrumb();
  if (!auth) {
    console.warn('  Failed to get Yahoo crumb — UK fundamentals will be missing');
    return result;
  }

  // Yahoo v7 supports batching up to ~50 symbols per request
  const batchSize = 40;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const symbols = batch.map(t => encodeURIComponent(t)).join(',');
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&crumb=${encodeURIComponent(auth.crumb)}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': UA, 'Cookie': auth.cookie },
        });
        if (res.status === 429) {
          await delay((attempt + 1) * 3000);
          continue;
        }
        if (!res.ok) break;

        const data = await res.json() as any;
        const quotes = data?.quoteResponse?.result ?? [];

        for (const q of quotes) {
          result.set(q.symbol, {
            marketCap: q.marketCap ?? 0,
            pe: q.trailingPE ?? null,
            forwardPe: q.forwardPE ?? null,
            beta: q.beta ?? null,
            earningsGrowth: q.earningsQuarterlyGrowth?.raw ?? null,
            revenueGrowth: q.revenueGrowth?.raw ?? null,
            avgVolume: q.averageDailyVolume3Month ?? 0,
          });
        }
        break; // success
      } catch {
        if (attempt < 1) await delay(1000);
      }
    }

    // Small delay between batches
    if (i + batchSize < tickers.length) await delay(300);
  }

  return result;
}

// ---------- FinViz Scraper (US stocks fundamentals) ----------

interface Fundamentals {
  marketCap: number;
  pe: number | null;
  forwardPe: number | null;
  beta: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  avgVolume: number;
}

function parseFinvizNumber(val: string): number | null {
  if (!val || val === '-') return null;
  const cleaned = val.replace(/,/g, '').replace('%', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseMarketCap(val: string): number {
  if (!val || val === '-') return 0;
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  if (val.endsWith('T')) return num * 1e12;
  if (val.endsWith('B')) return num * 1e9;
  if (val.endsWith('M')) return num * 1e6;
  return num;
}

function parseVolume(val: string): number {
  if (!val || val === '-') return 0;
  const num = parseFloat(val.replace(/,/g, ''));
  if (isNaN(num)) return 0;
  if (val.endsWith('M')) return num * 1e6;
  if (val.endsWith('K')) return num * 1e3;
  return num;
}

async function fetchFinvizFundamentals(ticker: string): Promise<Fundamentals | null> {
  try {
    const url = `https://finviz.com/quote.ashx?t=${ticker}&ty=c&p=d&b=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const data: Record<string, string> = {};
    let currentKey = '';
    $('table.snapshot-table2 td').each((i, el) => {
      const text = $(el).text().trim();
      if (i % 2 === 0) {
        currentKey = text;
      } else {
        data[currentKey] = text;
      }
    });

    return {
      marketCap: parseMarketCap(data['Market Cap'] || ''),
      pe: parseFinvizNumber(data['P/E'] || ''),
      forwardPe: parseFinvizNumber(data['Forward P/E'] || ''),
      beta: parseFinvizNumber(data['Beta'] || ''),
      earningsGrowth: (() => { const v = parseFinvizNumber(data['EPS Q/Q'] || ''); return v != null ? v / 100 : null; })(),
      revenueGrowth: (() => { const v = parseFinvizNumber(data['Sales Q/Q'] || ''); return v != null ? v / 100 : null; })(),
      avgVolume: parseVolume(data['Avg Volume'] || ''),
    };
  } catch {
    return null;
  }
}

// ---------- Main fetch ----------

export async function fetchAllStocks(stocks: StockMeta[]): Promise<QuoteData[]> {
  const startTime = Date.now();

  // Phase 1: Fetch all Yahoo charts in parallel (high concurrency)
  console.log(`  Phase 1: Fetching ${stocks.length} charts (concurrency ${CONFIG.concurrency})...`);
  const chartLimit = pLimit(CONFIG.concurrency);
  const chartResults = await Promise.all(
    stocks.map((meta, idx) =>
      chartLimit(async () => {
        const chart = await fetchChart(meta.ticker);
        if ((idx + 1) % 50 === 0) {
          console.log(`    Charts: ${idx + 1}/${stocks.length}`);
        }
        return { meta, chart };
      })
    )
  );

  const validCharts = chartResults.filter(r => r.chart !== null) as { meta: StockMeta; chart: ChartData }[];
  const chartElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Phase 1 done: ${validCharts.length}/${stocks.length} charts in ${chartElapsed}s`);

  // Phase 2: Fetch fundamentals via Yahoo v7 batch for ALL stocks (fast & reliable)
  // Then enrich US stocks with FinViz for extra data (earnings/revenue growth)
  const usStocks = validCharts.filter(r => r.meta.market === 'US');
  const ukStocks = validCharts.filter(r => r.meta.market === 'UK');
  const allTickers = validCharts.map(r => r.meta.ticker);
  console.log(`  Phase 2: Fetching fundamentals — ${allTickers.length} stocks (Yahoo v7 batch + FinViz enrichment)...`);

  const finvizLimit = pLimit(CONFIG.finvizConcurrency);
  const fundamentalsMap = new Map<string, Fundamentals | YahooFundamentals | null>();

  // Step 2a: Yahoo v7 batch for ALL stocks (market cap, P/E, beta, volume)
  const yahooFundamentals = await fetchYahooFundamentalsBatch(allTickers);
  for (const [ticker, f] of yahooFundamentals) {
    fundamentalsMap.set(ticker, f);
  }
  console.log(`    Yahoo v7 batch: ${yahooFundamentals.size}/${allTickers.length} fundamentals`);

  // Step 2b: Enrich US stocks with FinViz (earnings growth, revenue growth, etc.)
  // Only fetch FinViz for stocks where Yahoo data is missing key fields
  const usTickersNeedingFinviz = usStocks.filter(r => {
    const yf = fundamentalsMap.get(r.meta.ticker);
    return !yf || yf.earningsGrowth == null;
  });
  console.log(`    FinViz enrichment: ${usTickersNeedingFinviz.length} US stocks need extra data...`);

  await Promise.all(
    usTickersNeedingFinviz.map((r, idx) =>
      finvizLimit(async () => {
        await delay(300);
        const f = await fetchFinvizFundamentals(r.meta.ticker);
        if (f) {
          const existing = fundamentalsMap.get(r.meta.ticker);
          // Merge: prefer Yahoo for market cap/PE/beta (more reliable), FinViz for growth metrics
          fundamentalsMap.set(r.meta.ticker, {
            marketCap: existing?.marketCap || f.marketCap,
            pe: existing?.pe ?? f.pe,
            forwardPe: existing?.forwardPe ?? f.forwardPe,
            beta: existing?.beta ?? f.beta,
            earningsGrowth: f.earningsGrowth ?? existing?.earningsGrowth ?? null,
            revenueGrowth: f.revenueGrowth ?? existing?.revenueGrowth ?? null,
            avgVolume: existing?.avgVolume || f.avgVolume,
          });
        }
        if ((idx + 1) % 50 === 0) {
          console.log(`    FinViz: ${idx + 1}/${usTickersNeedingFinviz.length}`);
        }
      })
    )
  );

  const finvizElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Phase 2 done: ${fundamentalsMap.size} fundamentals in ${finvizElapsed}s total`);

  // Phase 3: Assemble results
  const results: QuoteData[] = [];

  for (const { meta, chart } of validCharts) {
    const fundamentals = fundamentalsMap.get(meta.ticker) ?? null;
    const changePercent = chart.previousClose
      ? ((chart.price - chart.previousClose) / chart.previousClose) * 100
      : 0;
    const marketCap = fundamentals?.marketCap ?? 0;

    results.push({
      ticker: meta.ticker,
      name: meta.name,
      market: meta.market,
      sector: meta.sector,
      trading212: meta.trading212,
      price: chart.price,
      previousClose: chart.previousClose,
      changePercent,
      marketCap,
      capCategory: classifyCap(marketCap),
      pe: fundamentals?.pe ?? null,
      forwardPe: fundamentals?.forwardPe ?? null,
      earningsGrowth: fundamentals?.earningsGrowth ?? null,
      revenueGrowth: fundamentals?.revenueGrowth ?? null,
      beta: fundamentals?.beta ?? null,
      volume: chart.volume,
      avgVolume: fundamentals?.avgVolume ?? 0,
      fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: chart.fiftyTwoWeekLow,
      historicalClose: chart.closes,
      historicalVolume: chart.volumes,
    });
  }

  console.log(`Successfully fetched ${results.length}/${stocks.length} stocks`);
  return results;
}
