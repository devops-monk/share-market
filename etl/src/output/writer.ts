import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { CONFIG } from '../config.js';
import type { MarketRegime } from '../indicators/regime.js';
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
  sma150: number | null;
  sma200: number | null;
  sma20: number | null;
  sma200Slope: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  bollingerBandwidth: number | null;
  bollingerPercentB: number | null;
  bollingerSqueeze: boolean;
  stochasticK: number | null;
  stochasticD: number | null;
  obvTrend: string | null;
  obvDivergence: string | null;
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  priceReturn1y: number;
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
  // Expanded fundamentals
  priceToBook: number | null;
  pegRatio: number | null;
  enterpriseValue: number | null;
  profitMargins: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  bookValue: number | null;
  sharesOutstanding: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  shortPercentOfFloat: number | null;
  targetMeanPrice: number | null;
  freeCashflow: number | null;
  totalRevenue: number | null;
  totalDebt: number | null;
  ebitda: number | null;
  totalCash: number | null;
  operatingCashflow: number | null;
  averageAnalystRating: string | null;
  // Computed metrics
  rsPercentile: number;          // 1-99 relative strength
  fiftyTwoWeekRangePercent: number; // 0-100, position in 52W range
  weeklyHighLowRange: number | null; // consolidation range %
  accDistRating: string;         // A-E rating
  styleClassification: string;   // Value / Blend / Growth
  dataCompleteness: number;      // 0-100 %
  // Minervini trend template
  minerviniChecks: {
    priceAbove150and200: boolean;
    sma150Above200: boolean;
    sma200Trending: boolean;
    sma50Above150and200: boolean;
    priceAbove50: boolean;
    price30PctAboveLow: boolean;
    priceWithin25PctOfHigh: boolean;
    rsAbove70: boolean;
    passed: number; // count of checks passed
  };
  // Sector-relative scoring
  sectorZScore: number | null;  // z-score within sector
  sectorRank: number;           // rank within sector (1=best)
  sectorCount: number;          // total in sector
  // Support & resistance levels
  supportResistance: { price: number; strength: number; type: 'support' | 'resistance' }[];
  // Expert screens (Piotroski, Graham, Buffett)
  piotroskiScore: number | null;
  piotroskiDetails: string[];
  grahamNumber: number | null;
  buffettScore: number | null;
  buffettDetails: string[];
}

export interface OhlcvData {
  ticker: string;
  timestamps: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export function writeOutputs(
  stocks: StockRecord[],
  newsItems: any[],
  bearishAlerts: StockRecord[],
  ohlcvData?: OhlcvData[],
  marketRegime?: MarketRegime | null,
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
      marketRegime: marketRegime ?? null,
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

  // OHLCV chart data — per-stock files for lightweight-charts
  if (ohlcvData && ohlcvData.length > 0) {
    const chartsDir = path.join(dataDir, 'charts');
    mkdirSync(chartsDir, { recursive: true });

    for (const chart of ohlcvData) {
      // Compact format: array of [time, open, high, low, close, volume]
      const candles = chart.timestamps.map((t, i) => ([
        t,
        +chart.open[i].toFixed(2),
        +chart.high[i].toFixed(2),
        +chart.low[i].toFixed(2),
        +chart.close[i].toFixed(2),
        chart.volume[i],
      ]));
      writeFileSync(
        path.join(chartsDir, `${chart.ticker.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`),
        JSON.stringify(candles)
      );
    }
    console.log(`Wrote ${ohlcvData.length} chart files to ${chartsDir}`);
  }

  // Score history — daily composite scores per ticker (last 90 days)
  const historyPath = path.join(dataDir, 'score-history.json');
  let history: Record<string, Record<string, number>> = {};
  try {
    const existing = readFileSync(historyPath, 'utf-8');
    history = JSON.parse(existing);
  } catch { /* first run */ }

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  for (const s of stocks) {
    if (!history[s.ticker]) history[s.ticker] = {};
    history[s.ticker][today] = s.score.composite;
    // Prune old entries
    for (const date of Object.keys(history[s.ticker])) {
      if (date < cutoffStr) delete history[s.ticker][date];
    }
  }

  writeFileSync(historyPath, JSON.stringify(history));

  console.log(`Wrote ${stocks.length} stocks to ${dataDir}`);
}
