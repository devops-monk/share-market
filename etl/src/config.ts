export const CONFIG = {
  concurrency: 3,
  requestDelayMs: 500,
  historicalPeriod: '6mo',
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
