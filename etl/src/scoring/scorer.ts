import { CONFIG } from '../config.js';
import type { TechnicalData } from '../indicators/technical.js';
import type { Signal } from '../indicators/signals.js';
import type { QuoteData } from '../stocks/fetcher.js';

export interface ScoreBreakdown {
  priceMomentum: number;
  technicalSignals: number;
  newsSentiment: number;
  fundamentals: number;
  volumeTrend: number;
  riskInverse: number;
  composite: number;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((val - min) / (max - min)) * 100);
}

export function computeScore(
  quote: QuoteData,
  tech: TechnicalData,
  signals: Signal[],
  sentimentScore: number // -1 to 1
): ScoreBreakdown {
  const w = CONFIG.weights;

  // Price Momentum (3m and 6m returns, -50% to +50% mapped to 0-100)
  const avgReturn = (tech.priceReturn3m + tech.priceReturn6m) / 2;
  const priceMomentum = normalize(avgReturn, -0.5, 0.5);

  // Technical Signals score
  const bullishWeight = signals
    .filter(s => s.direction === 'bullish')
    .reduce((sum, s) => sum + s.severity, 0);
  const bearishWeight = signals
    .filter(s => s.direction === 'bearish')
    .reduce((sum, s) => sum + s.severity, 0);
  const netSignal = bullishWeight - bearishWeight; // typically -10 to +10
  const technicalSignals = normalize(netSignal, -8, 8);

  // News Sentiment (-1 to 1 → 0-100)
  const newsSentiment = normalize(sentimentScore, -1, 1);

  // Fundamentals (P/E and growth)
  let fundamentals = 50;
  if (quote.pe != null && quote.pe > 0) {
    // Lower P/E is better value (up to a point)
    const peScore = normalize(quote.pe, 5, 60);
    const invertedPe = 100 - peScore; // invert so low P/E = high score
    fundamentals = invertedPe;
  }
  if (quote.earningsGrowth != null) {
    const growthScore = normalize(quote.earningsGrowth, -0.5, 0.5);
    fundamentals = fundamentals * 0.5 + growthScore * 0.5;
  }

  // Volume Trend (ratio > 1 means higher than average, could be good)
  const volumeTrend = normalize(tech.volumeRatio, 0.3, 3);

  // Risk (inverse) — lower beta & volatility = higher score
  const betaScore = quote.beta != null ? normalize(quote.beta, 0, 2) : 50;
  const volScore = normalize(tech.volatility, 0, 1);
  const riskInverse = 100 - (betaScore * 0.5 + volScore * 0.5);

  // Weighted composite
  const composite = clamp(
    priceMomentum * w.priceMomentum +
    technicalSignals * w.technicalSignals +
    newsSentiment * w.newsSentiment +
    fundamentals * w.fundamentals +
    volumeTrend * w.volumeTrend +
    riskInverse * w.riskInverse
  );

  return {
    priceMomentum: Math.round(priceMomentum),
    technicalSignals: Math.round(technicalSignals),
    newsSentiment: Math.round(newsSentiment),
    fundamentals: Math.round(fundamentals),
    volumeTrend: Math.round(volumeTrend),
    riskInverse: Math.round(riskInverse),
    composite: Math.round(composite),
  };
}
