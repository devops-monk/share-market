export const CONFIG = {
  concurrency: 25,          // Yahoo chart API (tolerant, handles high concurrency)
  finvizConcurrency: 8,     // FinViz scraping (aggressive rate-limiting, keep low)
  newsConcurrency: 10,      // News fetching
  requestDelayMs: 50,
  historicalPeriod: '5y',
  historicalInterval: '1d' as const,

  // Scoring weights (must sum to 1.0)
  weights: {
    priceMomentum: 0.25,
    technicalSignals: 0.25,
    newsSentiment: 0.15,
    fundamentals: 0.15,
    volumeTrend: 0.10,
    riskInverse: 0.10,
  },

  // Thresholds
  rsiOverbought: 70,
  rsiOversold: 30,
  bearishScoreThreshold: 4,

  // Market cap classification (USD)
  marketCap: {
    small: 2_000_000_000,
    mid: 10_000_000_000,
  },

  // FinBERT (HuggingFace)
  finbertBatchSize: 20,
  finbertRateDelayMs: 100,

  // AI Research Notes (HuggingFace chat completions)
  aiResearchModel: 'mistralai/Mistral-7B-Instruct-v0.3',
  aiResearchConcurrency: 3,
  aiResearchDelayMs: 500,
  aiResearchMaxStocks: 100,

  // FRED API (macro data)
  fredRateDelayMs: 100,

  // Social sentiment (ApeWisdom)
  socialDelayMs: 500,

  // SEC EDGAR (insider trading)
  edgarConcurrency: 12,
  edgarUserAgent: 'StockDashboard/1.0 (stock-dashboard@example.com)',
  insiderLookbackDays: 180,

  // Output paths
  dataDir: new URL('../../data', import.meta.url).pathname,
};
