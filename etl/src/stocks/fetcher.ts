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

// ---------- Yahoo quoteSummary (fundamentals for all stocks, especially UK) ----------

interface YahooFundamentals {
  marketCap: number;
  pe: number | null;
  forwardPe: number | null;
  beta: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  avgVolume: number;
}

async function fetchYahooFundamentals(ticker: string): Promise<YahooFundamentals | null> {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encoded}?modules=defaultKeyStatistics,financialData,summaryDetail,price`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) {
        await delay((attempt + 1) * 2000);
        continue;
      }
      if (!res.ok) return null;

      const data = await res.json() as any;
      const result = data?.quoteSummary?.result?.[0];
      if (!result) return null;

      const stats = result.defaultKeyStatistics ?? {};
      const fin = result.financialData ?? {};
      const summary = result.summaryDetail ?? {};
      const price = result.price ?? {};

      return {
        marketCap: price.marketCap?.raw ?? summary.marketCap?.raw ?? 0,
        pe: summary.trailingPE?.raw ?? null,
        forwardPe: summary.forwardPE?.raw ?? stats.forwardPE?.raw ?? null,
        beta: stats.beta?.raw ?? null,
        earningsGrowth: fin.earningsGrowth?.raw ?? stats.earningsQuarterlyGrowth?.raw ?? null,
        revenueGrowth: fin.revenueGrowth?.raw ?? null,
        avgVolume: summary.averageVolume?.raw ?? price.averageDailyVolume3Month?.raw ?? 0,
      };
    } catch {
      if (attempt < 1) await delay(1000);
    }
  }
  return null;
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

  // Phase 2: Fetch fundamentals — FinViz for US, Yahoo quoteSummary for UK (in parallel)
  const usStocks = validCharts.filter(r => r.meta.market === 'US');
  const ukStocks = validCharts.filter(r => r.meta.market === 'UK');
  console.log(`  Phase 2: Fetching fundamentals — ${usStocks.length} US (FinViz) + ${ukStocks.length} UK (Yahoo)...`);

  const finvizLimit = pLimit(CONFIG.finvizConcurrency);
  const yahooFundLimit = pLimit(CONFIG.concurrency);
  const fundamentalsMap = new Map<string, Fundamentals | YahooFundamentals | null>();

  // Fetch US (FinViz) and UK (Yahoo) fundamentals in parallel
  await Promise.all([
    // US stocks via FinViz
    Promise.all(
      usStocks.map((r, idx) =>
        finvizLimit(async () => {
          await delay(300);
          const f = await fetchFinvizFundamentals(r.meta.ticker);
          fundamentalsMap.set(r.meta.ticker, f);
          if ((idx + 1) % 50 === 0) {
            console.log(`    FinViz: ${idx + 1}/${usStocks.length}`);
          }
        })
      )
    ),
    // UK stocks via Yahoo quoteSummary
    Promise.all(
      ukStocks.map((r, idx) =>
        yahooFundLimit(async () => {
          const f = await fetchYahooFundamentals(r.meta.ticker);
          fundamentalsMap.set(r.meta.ticker, f);
          if ((idx + 1) % 50 === 0) {
            console.log(`    Yahoo fundamentals: ${idx + 1}/${ukStocks.length}`);
          }
        })
      )
    ),
  ]);

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
