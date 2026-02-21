import YahooFinance from 'yahoo-finance2';
import pLimit from 'p-limit';
import { CONFIG } from '../config.js';
import type { StockMeta } from './universe.js';

const yf = new YahooFinance();

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

interface ChartResult {
  closes: number[];
  volumes: number[];
}

async function fetchHistorical(ticker: string): Promise<ChartResult> {
  try {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - 180 * 24 * 60 * 60; // 6 months
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return { closes: [], volumes: [] };
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return { closes: [], volumes: [] };

    const closes = (result.indicators?.quote?.[0]?.close || []).filter((v: any) => v != null) as number[];
    const volumes = (result.indicators?.quote?.[0]?.volume || []).filter((v: any) => v != null) as number[];
    return { closes, volumes };
  } catch {
    return { closes: [], volumes: [] };
  }
}

export async function fetchStock(meta: StockMeta): Promise<QuoteData | null> {
  try {
    const [quote, historical] = await Promise.all([
      yf.quote(meta.ticker),
      fetchHistorical(meta.ticker),
    ]);

    await delay(CONFIG.requestDelayMs);

    if (!quote || !quote.regularMarketPrice) return null;

    return {
      ticker: meta.ticker,
      name: meta.name,
      market: meta.market,
      sector: meta.sector,
      trading212: meta.trading212,
      price: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose ?? quote.regularMarketPrice,
      changePercent: quote.regularMarketChangePercent ?? 0,
      marketCap: quote.marketCap ?? 0,
      capCategory: classifyCap(quote.marketCap ?? 0),
      pe: quote.trailingPE ?? null,
      forwardPe: quote.forwardPE ?? null,
      earningsGrowth: (quote as any).earningsQuarterlyGrowth ?? null,
      revenueGrowth: (quote as any).revenueGrowth ?? null,
      beta: (quote as any).beta ?? null,
      volume: quote.regularMarketVolume ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? quote.averageDailyVolume10Day ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? quote.regularMarketPrice,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? quote.regularMarketPrice,
      historicalClose: historical.closes,
      historicalVolume: historical.volumes,
    };
  } catch (err) {
    console.warn(`Failed to fetch ${meta.ticker}:`, (err as Error).message);
    return null;
  }
}

export async function fetchAllStocks(stocks: StockMeta[]): Promise<QuoteData[]> {
  const limit = pLimit(CONFIG.concurrency);
  const results = await Promise.all(
    stocks.map(stock => limit(() => fetchStock(stock)))
  );
  return results.filter((r): r is QuoteData => r !== null);
}
