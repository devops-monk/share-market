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
        await delay((attempt + 1) * 3000);
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
        fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? Math.max(...closes, m.regularMarketPrice),
        fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? Math.min(...closes, m.regularMarketPrice),
        closes,
        volumes,
      };
    } catch {
      if (attempt < 2) await delay(2000);
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

export async function fetchStock(meta: StockMeta): Promise<QuoteData | null> {
  try {
    // Step 1: Yahoo chart (works for all stocks)
    const chart = await fetchChart(meta.ticker);
    if (!chart) {
      console.warn(`  Chart failed for ${meta.ticker}`);
      return null;
    }

    // Step 2: FinViz fundamentals (US stocks only)
    let fundamentals: Fundamentals | null = null;
    if (meta.market === 'US') {
      await delay(1500); // Respect FinViz rate limits
      fundamentals = await fetchFinvizFundamentals(meta.ticker);
    }

    const changePercent = chart.previousClose
      ? ((chart.price - chart.previousClose) / chart.previousClose) * 100
      : 0;

    const marketCap = fundamentals?.marketCap ?? 0;

    return {
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
    };
  } catch (err) {
    console.warn(`  Failed ${meta.ticker}:`, (err as Error).message);
    return null;
  }
}

export async function fetchAllStocks(stocks: StockMeta[]): Promise<QuoteData[]> {
  // Process in small batches to avoid rate limits
  const batchSize = CONFIG.concurrency;
  const results: QuoteData[] = [];

  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(stocks.length / batchSize);
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.map(s => s.ticker).join(', ')})`);

    const batchResults = await Promise.all(batch.map(stock => fetchStock(stock)));
    for (const r of batchResults) {
      if (r) results.push(r);
    }

    // Pause between batches
    if (i + batchSize < stocks.length) {
      await delay(1000);
    }
  }

  console.log(`Successfully fetched ${results.length}/${stocks.length} stocks`);
  return results;
}
