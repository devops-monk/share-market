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

  // First pass: compute technicals and collect returns for RS percentile
  const stockTechData: { quote: typeof quotes[0]; tech: ReturnType<typeof computeTechnicals> }[] = [];
  for (const quote of quotes) {
    const tech = computeTechnicals(quote);
    stockTechData.push({ quote, tech });
  }

  // Compute RS percentile: weighted 1-year return (40% latest quarter, 20% each prior)
  const rsReturns = stockTechData.map(({ tech }, i) => ({
    idx: i,
    rs: tech.priceReturn3m * 0.4 + tech.priceReturn6m * 0.3 + tech.priceReturn1y * 0.3,
  }));
  const sortedRs = [...rsReturns].sort((a, b) => a.rs - b.rs);
  const rsPercentiles = new Map<number, number>();
  sortedRs.forEach((item, rank) => {
    rsPercentiles.set(item.idx, Math.round(((rank + 1) / sortedRs.length) * 99));
  });

  const stockRecords: StockRecord[] = [];

  for (let i = 0; i < stockTechData.length; i++) {
    const { quote, tech } = stockTechData[i];
    const signals = detectSignals(tech, quote);
    const bearishScore = computeBearishScore(signals);
    const bullishScore = computeBullishScore(signals);

    const stockNews = allNews.filter(n => n.ticker === quote.ticker);
    const sentimentAvg = averageSentiment(stockNews);
    const score = computeScore(quote, tech, signals, sentimentAvg);

    // 52W range position (0-100)
    const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
    const fiftyTwoWeekRangePercent = range > 0
      ? Math.round(((quote.price - quote.fiftyTwoWeekLow) / range) * 100)
      : 50;

    // Accumulation/Distribution rating (A-E)
    const ad = tech.accumulationDistribution;
    const accDistRating = ad == null ? 'C'
      : ad > 0.3 ? 'A' : ad > 0.1 ? 'B' : ad > -0.1 ? 'C' : ad > -0.3 ? 'D' : 'E';

    // Style classification
    const pe = quote.pe;
    const eg = quote.earningsGrowth;
    let styleClassification = 'Blend';
    if (pe != null && pe > 0 && pe < 15 && (eg == null || eg < 0.15)) {
      styleClassification = 'Value';
    } else if ((eg != null && eg > 0.2) || (pe != null && pe > 30)) {
      styleClassification = 'Growth';
    }

    // Data completeness
    const fundamentalFields = [
      quote.pe, quote.forwardPe, quote.earningsGrowth, quote.revenueGrowth,
      quote.beta, quote.priceToBook, quote.returnOnEquity, quote.grossMargins,
      quote.debtToEquity, quote.freeCashflow, quote.enterpriseValue, quote.ebitda,
      quote.dividendYield, quote.trailingEps, quote.operatingMargins,
    ];
    const filledCount = fundamentalFields.filter(v => v != null).length;
    const dataCompleteness = Math.round((filledCount / fundamentalFields.length) * 100);

    // Minervini trend template checks
    const rsP = rsPercentiles.get(i) ?? 50;
    const priceAbove150and200 = (tech.sma150 != null && tech.sma200 != null)
      ? quote.price > tech.sma150 && quote.price > tech.sma200 : false;
    const sma150Above200 = (tech.sma150 != null && tech.sma200 != null)
      ? tech.sma150 > tech.sma200 : false;
    const sma200Trending = tech.sma200Slope != null ? tech.sma200Slope > 0 : false;
    const sma50Above150and200 = (tech.sma50 != null && tech.sma150 != null && tech.sma200 != null)
      ? tech.sma50 > tech.sma150 && tech.sma50 > tech.sma200 : false;
    const priceAbove50 = tech.sma50 != null ? quote.price > tech.sma50 : false;
    const price30PctAboveLow = quote.fiftyTwoWeekLow > 0
      ? quote.price >= quote.fiftyTwoWeekLow * 1.3 : false;
    const priceWithin25PctOfHigh = quote.fiftyTwoWeekHigh > 0
      ? quote.price >= quote.fiftyTwoWeekHigh * 0.75 : false;
    const rsAbove70 = rsP >= 70;

    const minerviniChecks = {
      priceAbove150and200, sma150Above200, sma200Trending,
      sma50Above150and200, priceAbove50, price30PctAboveLow,
      priceWithin25PctOfHigh, rsAbove70,
      passed: [priceAbove150and200, sma150Above200, sma200Trending,
        sma50Above150and200, priceAbove50, price30PctAboveLow,
        priceWithin25PctOfHigh, rsAbove70].filter(Boolean).length,
    };

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
      sma150: tech.sma150,
      sma200: tech.sma200,
      sma20: tech.sma20,
      sma200Slope: tech.sma200Slope,
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
      priceReturn1y: tech.priceReturn1y,
      volatility: tech.volatility,
      signals,
      bearishScore,
      bullishScore,
      sentimentAvg,
      score,
      // Expanded fundamentals
      priceToBook: quote.priceToBook,
      pegRatio: quote.pegRatio,
      enterpriseValue: quote.enterpriseValue,
      profitMargins: quote.profitMargins,
      grossMargins: quote.grossMargins,
      operatingMargins: quote.operatingMargins,
      returnOnEquity: quote.returnOnEquity,
      returnOnAssets: quote.returnOnAssets,
      debtToEquity: quote.debtToEquity,
      currentRatio: quote.currentRatio,
      dividendYield: quote.dividendYield,
      trailingEps: quote.trailingEps,
      forwardEps: quote.forwardEps,
      bookValue: quote.bookValue,
      sharesOutstanding: quote.sharesOutstanding,
      heldPercentInsiders: quote.heldPercentInsiders,
      heldPercentInstitutions: quote.heldPercentInstitutions,
      shortPercentOfFloat: quote.shortPercentOfFloat,
      targetMeanPrice: quote.targetMeanPrice,
      freeCashflow: quote.freeCashflow,
      totalRevenue: quote.totalRevenue,
      totalDebt: quote.totalDebt,
      ebitda: quote.ebitda,
      totalCash: quote.totalCash,
      operatingCashflow: quote.operatingCashflow,
      averageAnalystRating: quote.averageAnalystRating,
      // Computed metrics
      rsPercentile: rsP,
      fiftyTwoWeekRangePercent,
      weeklyHighLowRange: tech.weeklyHighLowRange,
      accDistRating,
      styleClassification,
      dataCompleteness,
      minerviniChecks,
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
