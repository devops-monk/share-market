import { ALL_STOCKS } from './stocks/universe.js';
import { fetchAllStocks } from './stocks/fetcher.js';
import { computeTechnicals } from './indicators/technical.js';
import { detectSignals, computeBearishScore, computeBullishScore } from './indicators/signals.js';
import { computeScore } from './scoring/scorer.js';
import { fetchGoogleNews } from './news/google-news.js';
import { fetchFinvizNews } from './news/finviz-scraper.js';
import { scoreNewsItems, averageSentiment } from './news/sentiment.js';
import { writeOutputs, type StockRecord } from './output/writer.js';
import { CONFIG } from './config.js';
import pLimit from 'p-limit';

async function main() {
  console.log(`Starting ETL for ${ALL_STOCKS.length} stocks...`);
  const startTime = Date.now();

  // Step 1: Fetch all stock data (charts + fundamentals in parallel phases)
  console.log('Fetching stock data...');
  const quotes = await fetchAllStocks(ALL_STOCKS);
  console.log(`Fetched ${quotes.length}/${ALL_STOCKS.length} stocks in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Step 2: Fetch news (top 50 stocks, higher concurrency)
  console.log('Fetching news...');
  const newsStart = Date.now();
  const newsLimit = pLimit(CONFIG.newsConcurrency);
  const allNews: any[] = [];
  const topTickers = quotes.slice(0, 100);

  await Promise.all(
    topTickers.map(q =>
      newsLimit(async () => {
        const [googleNews, finvizNews] = await Promise.all([
          fetchGoogleNews(q.ticker, q.name),
          q.market === 'US' ? fetchFinvizNews(q.ticker) : Promise.resolve([]),
        ]);
        const scored = scoreNewsItems([...googleNews, ...finvizNews]);
        allNews.push(...scored);
      })
    )
  );
  console.log(`Collected ${allNews.length} news items in ${((Date.now() - newsStart) / 1000).toFixed(1)}s`);

  // Step 3: Process each stock (CPU-only, fast)
  console.log('Computing indicators and scores...');
  const stockRecords: StockRecord[] = [];

  for (const quote of quotes) {
    const tech = computeTechnicals(quote);
    const signals = detectSignals(tech, quote);
    const bearishScore = computeBearishScore(signals);
    const bullishScore = computeBullishScore(signals);

    const stockNews = allNews.filter(n => n.ticker === quote.ticker);
    const sentimentAvg = averageSentiment(stockNews);
    const score = computeScore(quote, tech, signals, sentimentAvg);

    stockRecords.push({
      ticker: quote.ticker,
      name: quote.name,
      market: quote.market,
      sector: quote.sector,
      trading212: quote.trading212,
      price: quote.price,
      changePercent: quote.changePercent,
      marketCap: quote.marketCap,
      capCategory: quote.capCategory,
      pe: quote.pe,
      forwardPe: quote.forwardPe,
      earningsGrowth: quote.earningsGrowth,
      revenueGrowth: quote.revenueGrowth,
      beta: quote.beta,
      volume: quote.volume,
      avgVolume: quote.avgVolume,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      rsi: tech.rsi,
      macdHistogram: tech.macd?.histogram ?? null,
      sma50: tech.sma50,
      sma200: tech.sma200,
      sma20: tech.sma20,
      bollingerUpper: tech.bollinger?.upper ?? null,
      bollingerLower: tech.bollinger?.lower ?? null,
      bollingerBandwidth: tech.bollinger?.bandwidth ?? null,
      bollingerPercentB: tech.bollinger?.percentB ?? null,
      bollingerSqueeze: tech.bollinger?.squeeze ?? false,
      stochasticK: tech.stochastic?.k ?? null,
      stochasticD: tech.stochastic?.d ?? null,
      obvTrend: tech.obvTrend,
      obvDivergence: tech.obvDivergence,
      volumeRatio: tech.volumeRatio,
      priceReturn3m: tech.priceReturn3m,
      priceReturn6m: tech.priceReturn6m,
      volatility: tech.volatility,
      signals,
      bearishScore,
      bullishScore,
      sentimentAvg,
      score,
    });
  }

  // Step 4: Identify bearish alerts
  const bearishAlerts = stockRecords
    .filter(s => s.bearishScore >= CONFIG.bearishScoreThreshold)
    .sort((a, b) => b.bearishScore - a.bearishScore);

  console.log(`Found ${bearishAlerts.length} bearish alerts`);

  // Step 5: Write outputs
  writeOutputs(stockRecords, allNews, bearishAlerts);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`ETL completed in ${elapsed}s`);

  // Force exit — open HTTP keep-alive sockets prevent clean shutdown
  process.exit(0);
}

main().catch(err => {
  console.error('ETL failed:', err);
  process.exit(1);
});
