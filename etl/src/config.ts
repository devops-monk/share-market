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

  // FinBERT (HuggingFace Inference API — separate from chat completions)
  finbertBatchSize: 20,
  finbertRateDelayMs: 100,

  // AI Research Notes — LLM chat completions
  // Supports multiple providers: 'groq' (free 14K req/day), 'huggingface', 'openrouter'
  aiProviders: {
    groq: {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      envKey: 'GROQ_API_KEY',
    },
    huggingface: {
      url: 'https://router.huggingface.co/v1/chat/completions',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      envKey: 'HUGGINGFACE_API_KEY',
    },
    openrouter: {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      envKey: 'OPENROUTER_API_KEY',
    },
  } as Record<string, { url: string; model: string; envKey: string }>,
  aiResearchConcurrency: 1,    // Sequential to respect free tier rate limits
  aiResearchDelayMs: 3000,     // 3s between requests (Groq free: 12K TPM ≈ ~4 req/min)
  aiResearchMaxStocks: 50,     // Reduced from 100 to fit within timeout

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
