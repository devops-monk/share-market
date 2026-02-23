export const CONFIG = {
  concurrency: 10,          // Yahoo chart API (tolerant)
  finvizConcurrency: 5,     // FinViz scraping (more sensitive)
  newsConcurrency: 4,       // News fetching
  requestDelayMs: 200,
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

  // Output paths
  dataDir: new URL('../../data', import.meta.url).pathname,
};
