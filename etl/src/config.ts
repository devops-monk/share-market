export const CONFIG = {
  concurrency: 15,          // Yahoo chart API (tolerant)
  finvizConcurrency: 8,     // FinViz scraping (more sensitive)
  newsConcurrency: 6,       // News fetching
  requestDelayMs: 100,
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
  finbertBatchSize: 10,
  finbertRateDelayMs: 200,

  // SEC EDGAR (insider trading)
  edgarConcurrency: 8,
  edgarUserAgent: 'StockDashboard/1.0 (stock-dashboard@example.com)',
  insiderLookbackDays: 180,

  // Output paths
  dataDir: new URL('../../data', import.meta.url).pathname,
};
