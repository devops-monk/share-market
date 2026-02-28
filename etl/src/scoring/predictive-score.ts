import type { StockRecord } from '../output/writer.js';

export interface PredictiveScore {
  predicted: number;
  direction: 'improving' | 'stable' | 'declining';
  confidence: 'low' | 'medium' | 'high';
  slope: number;
  r2: number;
  factors: {
    trendMomentum: number;
    meanReversion: number;
    technicalSupport: number;
  };
}

/** Simple linear regression: returns { slope, intercept, r2 } */
function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 50, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += ys[i];
    sumXY += i * ys[i];
    sumX2 += i * i;
    sumY2 += ys[i] * ys[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  const ssTot = sumY2 - n * yMean * yMean;
  const ssRes = ys.reduce((acc, y, i) => {
    const pred = intercept + slope * i;
    return acc + (y - pred) ** 2;
  }, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, intercept, r2 };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Compute predictive score for a stock based on score history and current technicals.
 *
 * @param stock - Current stock record
 * @param scoreHistory - Object mapping date strings to composite scores (last 90 days)
 */
export function computePredictiveScore(
  stock: StockRecord,
  scoreHistory: Record<string, number> | undefined,
): PredictiveScore | null {
  // Get sorted score history entries
  const entries = scoreHistory
    ? Object.entries(scoreHistory).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const currentScore = stock.score.composite;

  // Need at least 5 data points for meaningful prediction
  if (entries.length < 5) {
    return null;
  }

  // Take last 30 entries (or all if fewer)
  const recentEntries = entries.slice(-30);
  const scores = recentEntries.map(([, s]) => s);

  // 1. Linear regression on score trend
  const { slope, r2 } = linearRegression(scores);

  // 2. Score acceleration: compare slope of first half vs second half
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);
  const { slope: slope1 } = linearRegression(firstHalf);
  const { slope: slope2 } = linearRegression(secondHalf);
  const acceleration = slope2 - slope1;

  // 3. Mean reversion signal: extreme scores tend to revert
  // Scores far from 50 have stronger reversion pull
  const meanReversionRaw = (50 - currentScore) / 50; // -1 to +1

  // 4. Technical support factors
  let technicalSupport = 0;
  let techFactors = 0;

  // RSI momentum: oversold tends to bounce, overbought tends to fall
  if (stock.rsi != null) {
    if (stock.rsi < 30) technicalSupport += 0.5;
    else if (stock.rsi < 40) technicalSupport += 0.2;
    else if (stock.rsi > 70) technicalSupport -= 0.5;
    else if (stock.rsi > 60) technicalSupport -= 0.2;
    techFactors++;
  }

  // MACD histogram direction
  if (stock.macdHistogram != null) {
    if (stock.macdHistogram > 0) technicalSupport += 0.3;
    else technicalSupport -= 0.3;
    techFactors++;
  }

  // Volume trend: high volume ratio with positive price = accumulation
  if (stock.volumeRatio > 1.5 && stock.changePercent > 0) {
    technicalSupport += 0.3;
    techFactors++;
  } else if (stock.volumeRatio > 1.5 && stock.changePercent < 0) {
    technicalSupport -= 0.3;
    techFactors++;
  }

  // SMA alignment (bullish when price > SMA50 > SMA200)
  if (stock.sma50 != null && stock.sma200 != null) {
    if (stock.price > stock.sma50 && stock.sma50 > stock.sma200) {
      technicalSupport += 0.4;
    } else if (stock.price < stock.sma50 && stock.sma50 < stock.sma200) {
      technicalSupport -= 0.4;
    }
    techFactors++;
  }

  const techSupportNorm = techFactors > 0 ? clamp(technicalSupport / techFactors, -1, 1) : 0;

  // Weighted combination
  const trendMomentum = clamp(slope * 5 + acceleration * 3, -1, 1); // normalize slope to -1..1 range
  const meanReversion = clamp(meanReversionRaw * 0.5, -1, 1); // dampened mean reversion

  // Predicted score change
  const predictedDelta =
    trendMomentum * 8 +        // trend contributes up to ±8 points
    meanReversion * 4 +         // mean reversion up to ±4 points
    techSupportNorm * 5;        // technicals up to ±5 points

  const predicted = clamp(Math.round(currentScore + predictedDelta), 0, 100);

  // Direction classification
  let direction: PredictiveScore['direction'];
  if (slope > 0.3 && acceleration >= -0.1) direction = 'improving';
  else if (slope < -0.3 && acceleration <= 0.1) direction = 'declining';
  else direction = 'stable';

  // Confidence based on data availability and trend consistency
  let confidence: PredictiveScore['confidence'];
  if (r2 > 0.5 && entries.length >= 20) confidence = 'high';
  else if (r2 > 0.2 && entries.length >= 10) confidence = 'medium';
  else confidence = 'low';

  return {
    predicted,
    direction,
    confidence,
    slope: +slope.toFixed(3),
    r2: +r2.toFixed(3),
    factors: {
      trendMomentum: +trendMomentum.toFixed(3),
      meanReversion: +meanReversion.toFixed(3),
      technicalSupport: +techSupportNorm.toFixed(3),
    },
  };
}
