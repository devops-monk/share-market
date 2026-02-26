import { ALL_STOCKS } from './stocks/universe.js';
import { fetchAllStocks } from './stocks/fetcher.js';
import { computeTechnicals } from './indicators/technical.js';
import { detectSignals, computeBearishScore, computeBullishScore, computeTimeframeSentiment } from './indicators/signals.js';
import { computeSupportResistance } from './indicators/support-resistance.js';
import { computeScore } from './scoring/scorer.js';
import { computeDividendMetrics } from './indicators/dividends.js';
import { fetchGoogleNews } from './news/google-news.js';
import { fetchFinvizNews } from './news/finviz-scraper.js';
import { scoreNewsItemsWithFinBERT, averageSentiment } from './news/sentiment.js';
import { computeMarketRegime } from './indicators/regime.js';
import { writeOutputs, type StockRecord, type OhlcvData } from './output/writer.js';
import { fetchFinancials } from './fundamentals/financials.js';
import { fetchInsiderTrades } from './insider/edgar.js';
import { CONFIG } from './config.js';
import pLimit from 'p-limit';

async function main() {
  console.log(`Starting ETL for ${ALL_STOCKS.length} stocks...`);
  const startTime = Date.now();

  // Step 1: Fetch all stock data (charts + fundamentals in parallel phases)
  console.log('Fetching stock data...');
  const quotes = await fetchAllStocks(ALL_STOCKS);
  console.log(`Fetched ${quotes.length}/${ALL_STOCKS.length} stocks in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Step 2: Fetch news + market regime in parallel
  console.log('Fetching news and market regime...');
  const newsStart = Date.now();
  const newsLimit = pLimit(CONFIG.newsConcurrency);
  const allNews: any[] = [];
  const topTickers = quotes.slice(0, 100);

  const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;

  const [, marketRegime] = await Promise.all([
    // News fetching
    Promise.all(
      topTickers.map(q =>
        newsLimit(async () => {
          const [googleNews, finvizNews] = await Promise.all([
            fetchGoogleNews(q.ticker, q.name),
            q.market === 'US' ? fetchFinvizNews(q.ticker) : Promise.resolve([]),
          ]);
          const scored = await scoreNewsItemsWithFinBERT([...googleNews, ...finvizNews], huggingFaceApiKey);
          allNews.push(...scored);
        })
      )
    ),
    // Market regime (runs in parallel with news)
    computeMarketRegime(),
  ]);
  console.log(`Collected ${allNews.length} news items in ${((Date.now() - newsStart) / 1000).toFixed(1)}s`);
  if (marketRegime) {
    console.log(`Market regime: ${marketRegime.overall} (US: ${marketRegime.us.regime}, UK: ${marketRegime.uk.regime})`);
  }

  // Step 2b: Fetch insider trading data (SEC EDGAR Form 4)
  console.log('Fetching insider trading data...');
  const marketCapMap = new Map(quotes.map(q => [q.ticker, q.marketCap]));
  const insiderTradesMap = await fetchInsiderTrades(
    quotes.filter(q => q.market === 'US').map(q => q.ticker),
    marketCapMap,
  );

  // Step 2c: Fetch financial statements (Piotroski, Graham, Buffett)
  console.log('Fetching financial statements...');
  const allTickers = quotes.map(q => q.ticker);
  const financialsMap = await fetchFinancials(allTickers);

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
  const ohlcvRecords: OhlcvData[] = [];

  for (let i = 0; i < stockTechData.length; i++) {
    const { quote, tech } = stockTechData[i];
    const signals = detectSignals(tech, quote);
    const bearishScore = computeBearishScore(signals);
    const bullishScore = computeBullishScore(signals);
    const timeframeSentiment = computeTimeframeSentiment(signals);
    const dividendMetrics = computeDividendMetrics(quote.dividendHistory);

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
      priceReturn2y: tech.priceReturn2y,
      priceReturn3y: tech.priceReturn3y,
      priceReturn4y: tech.priceReturn4y,
      yearlyReturns: tech.yearlyReturns,
      yearlyUptrendYears: tech.yearlyUptrendYears,
      weightedAlpha: tech.weightedAlpha,
      pctBelowResistance: null, // computed after supportResistance below
      volatility: tech.volatility,
      signals,
      timeframeSentiment,
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
      institutionsCount: quote.institutionsCount,
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
      // Sector-relative scoring (populated in post-processing below)
      sectorZScore: null,
      sectorRank: 1,
      sectorCount: 1,
      // Support & resistance levels
      supportResistance: quote.ohlcvHigh.length >= 5
        ? computeSupportResistance(quote.ohlcvHigh, quote.ohlcvLow, quote.historicalClose, quote.price)
        : [],
      // Expert screens (Piotroski, Graham, Buffett)
      piotroskiScore: financialsMap.get(quote.ticker)?.ppiScore ?? null,
      piotroskiDetails: financialsMap.get(quote.ticker)?.ppiDetails ?? [],
      // Graham Number uses quote-level EPS & bookValue (financial statements lack sharesOutstanding)
      grahamNumber: (quote.trailingEps != null && quote.bookValue != null && quote.trailingEps > 0 && quote.bookValue > 0)
        ? +Math.sqrt(22.5 * quote.trailingEps * quote.bookValue).toFixed(2)
        : null,
      buffettScore: financialsMap.get(quote.ticker)?.buffettScore ?? null,
      buffettDetails: financialsMap.get(quote.ticker)?.buffettDetails ?? [],
      // Earnings date
      earningsDate: quote.earningsDate,
      dividendMetrics,
      // DCF Lite: simple intrinsic value = OCF × (1 + growth) / discount_rate
      dcfValue: (() => {
        const ocf = quote.operatingCashflow;
        const shares = quote.sharesOutstanding;
        if (ocf == null || shares == null || shares <= 0 || ocf <= 0) return null;
        const growth = quote.revenueGrowth ?? quote.earningsGrowth ?? 0.05;
        const g = Math.max(0, Math.min(growth, 0.3)); // cap growth at 30%
        const discountRate = 0.10; // 10% required return
        const terminalMultiple = 15;
        // 5-year DCF: sum of discounted FCF + terminal value
        let dcfSum = 0;
        let currentCF = ocf;
        for (let yr = 1; yr <= 5; yr++) {
          currentCF *= (1 + g);
          dcfSum += currentCF / Math.pow(1 + discountRate, yr);
        }
        dcfSum += (currentCF * terminalMultiple) / Math.pow(1 + discountRate, 5);
        return +(dcfSum / shares).toFixed(2);
      })(),
    });

    // Compute pctBelowResistance from the supportResistance data
    const lastRecord = stockRecords[stockRecords.length - 1];
    const nearestResistance = lastRecord.supportResistance
      .filter(l => l.type === 'resistance')
      .sort((a, b) => a.price - b.price)[0];
    if (nearestResistance) {
      lastRecord.pctBelowResistance = +((
        (nearestResistance.price - lastRecord.price) / nearestResistance.price
      ) * 100).toFixed(2);
    }

    // Collect OHLCV for candlestick charts
    if (quote.ohlcvTimestamps.length > 0) {
      ohlcvRecords.push({
        ticker: quote.ticker,
        timestamps: quote.ohlcvTimestamps,
        open: quote.ohlcvOpen,
        high: quote.ohlcvHigh,
        low: quote.ohlcvLow,
        close: quote.historicalClose,
        volume: quote.historicalVolume,
      });
    }
  }

  // Sector-relative scoring
  const sectorGroups = new Map<string, number[]>();
  for (const s of stockRecords) {
    if (!sectorGroups.has(s.sector)) sectorGroups.set(s.sector, []);
    sectorGroups.get(s.sector)!.push(s.score.composite);
  }

  const sectorStats = new Map<string, { mean: number; std: number }>();
  for (const [sector, scores] of sectorGroups) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    sectorStats.set(sector, { mean, std: Math.sqrt(variance) });
  }

  // Sort within sectors for rank
  const sectorRankMap = new Map<string, Map<string, number>>();
  const sectorGrouped = new Map<string, StockRecord[]>();
  for (const s of stockRecords) {
    if (!sectorGrouped.has(s.sector)) sectorGrouped.set(s.sector, []);
    sectorGrouped.get(s.sector)!.push(s);
  }
  for (const [sector, stocks] of sectorGrouped) {
    const sorted = [...stocks].sort((a, b) => b.score.composite - a.score.composite);
    const rankMap = new Map<string, number>();
    sorted.forEach((s, i) => rankMap.set(s.ticker, i + 1));
    sectorRankMap.set(sector, rankMap);
  }

  for (const s of stockRecords) {
    const stats = sectorStats.get(s.sector);
    const sectorStocks = sectorGrouped.get(s.sector);
    s.sectorZScore = stats && stats.std > 0 ? +((s.score.composite - stats.mean) / stats.std).toFixed(2) : null;
    s.sectorRank = sectorRankMap.get(s.sector)?.get(s.ticker) ?? 1;
    s.sectorCount = sectorStocks?.length ?? 1;
  }

  // Step 4: Identify bearish alerts
  const bearishAlerts = stockRecords
    .filter(s => s.bearishScore >= CONFIG.bearishScoreThreshold)
    .sort((a, b) => b.bearishScore - a.bearishScore);

  console.log(`Found ${bearishAlerts.length} bearish alerts`);

  // Step 5: Write outputs
  writeOutputs(stockRecords, allNews, bearishAlerts, ohlcvRecords, marketRegime, financialsMap, insiderTradesMap);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`ETL completed in ${elapsed}s`);

  // Force exit — open HTTP keep-alive sockets prevent clean shutdown
  process.exit(0);
}

main().catch(err => {
  console.error('ETL failed:', err);
  process.exit(1);
});
