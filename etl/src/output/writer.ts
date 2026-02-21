import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { CONFIG } from '../config.js';
import path from 'path';

export interface StockRecord {
  ticker: string;
  name: string;
  market: 'US' | 'UK';
  sector: string;
  trading212: boolean;
  price: number;
  changePercent: number;
  marketCap: number;
  capCategory: string;
  pe: number | null;
  forwardPe: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  beta: number | null;
  volume: number;
  avgVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  rsi: number | null;
  macdHistogram: number | null;
  sma50: number | null;
  sma200: number | null;
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  volatility: number;
  signals: { type: string; direction: string; severity: number; description: string }[];
  bearishScore: number;
  bullishScore: number;
  sentimentAvg: number;
  score: {
    priceMomentum: number;
    technicalSignals: number;
    newsSentiment: number;
    fundamentals: number;
    volumeTrend: number;
    riskInverse: number;
    composite: number;
  };
}

export function writeOutputs(
  stocks: StockRecord[],
  newsItems: any[],
  bearishAlerts: StockRecord[],
) {
  const dataDir = CONFIG.dataDir;
  mkdirSync(dataDir, { recursive: true });

  // latest.json — full dataset
  writeFileSync(
    path.join(dataDir, 'latest.json'),
    JSON.stringify(stocks, null, 2)
  );

  // summary.json — top/bottom 10
  const sorted = [...stocks].sort((a, b) => b.score.composite - a.score.composite);
  const summary = {
    topOverall: sorted.slice(0, 10).map(s => ({ ticker: s.ticker, name: s.name, score: s.score.composite, market: s.market, capCategory: s.capCategory })),
    bottomOverall: sorted.slice(-10).reverse().map(s => ({ ticker: s.ticker, name: s.name, score: s.score.composite, market: s.market, capCategory: s.capCategory })),
    topLargeCap: sorted.filter(s => s.capCategory === 'Large').slice(0, 10).map(s => ({ ticker: s.ticker, name: s.name, score: s.score.composite, market: s.market })),
    topMidCap: sorted.filter(s => s.capCategory === 'Mid').slice(0, 10).map(s => ({ ticker: s.ticker, name: s.name, score: s.score.composite, market: s.market })),
    topSmallCap: sorted.filter(s => s.capCategory === 'Small').slice(0, 10).map(s => ({ ticker: s.ticker, name: s.name, score: s.score.composite, market: s.market })),
    totalStocks: stocks.length,
    avgScore: Math.round(sorted.reduce((a, s) => a + s.score.composite, 0) / sorted.length),
    bearishAlertCount: bearishAlerts.length,
  };
  writeFileSync(
    path.join(dataDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // bearish-alerts.json
  writeFileSync(
    path.join(dataDir, 'bearish-alerts.json'),
    JSON.stringify(bearishAlerts, null, 2)
  );

  // news-sentiment.json
  writeFileSync(
    path.join(dataDir, 'news-sentiment.json'),
    JSON.stringify(newsItems, null, 2)
  );

  // metadata.json
  writeFileSync(
    path.join(dataDir, 'metadata.json'),
    JSON.stringify({
      lastUpdated: new Date().toISOString(),
      stockCount: stocks.length,
      bearishAlerts: bearishAlerts.length,
      newsCount: newsItems.length,
    }, null, 2)
  );

  // CSV files
  const csvColumns = [
    'ticker', 'name', 'market', 'sector', 'price', 'changePercent',
    'marketCap', 'capCategory', 'pe', 'rsi', 'sma50', 'sma200',
    'bearishScore', 'bullishScore', 'sentimentAvg', 'compositeScore',
  ];

  const toCsvRow = (s: StockRecord) => ({
    ticker: s.ticker,
    name: s.name,
    market: s.market,
    sector: s.sector,
    price: s.price,
    changePercent: s.changePercent.toFixed(2),
    marketCap: s.marketCap,
    capCategory: s.capCategory,
    pe: s.pe ?? '',
    rsi: s.rsi?.toFixed(1) ?? '',
    sma50: s.sma50?.toFixed(2) ?? '',
    sma200: s.sma200?.toFixed(2) ?? '',
    bearishScore: s.bearishScore,
    bullishScore: s.bullishScore,
    sentimentAvg: s.sentimentAvg.toFixed(3),
    compositeScore: s.score.composite,
  });

  const usStocks = stocks.filter(s => s.market === 'US');
  const ukStocks = stocks.filter(s => s.market === 'UK');

  writeFileSync(
    path.join(dataDir, 'us-stocks.csv'),
    stringify(usStocks.map(toCsvRow), { header: true, columns: csvColumns })
  );

  writeFileSync(
    path.join(dataDir, 'uk-stocks.csv'),
    stringify(ukStocks.map(toCsvRow), { header: true, columns: csvColumns })
  );

  console.log(`Wrote ${stocks.length} stocks to ${dataDir}`);
}
