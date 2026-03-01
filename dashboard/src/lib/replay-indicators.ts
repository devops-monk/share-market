/**
 * N29: Chart Replay — Pure indicator functions for partial OHLCV data
 */

/** Simple Moving Average — returns array aligned with closes (null when insufficient data) */
export function computeSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      result.push(sum / period);
    }
  }
  return result;
}

/** Relative Strength Index */
export function computeRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  // Compute gains and losses
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  result.push(null); // index 0 (no previous close)
  for (let i = 0; i < period; i++) result.push(null); // not enough data yet

  // First RSI
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs0));

  // Smoothed RSI
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

/** Volume bars with color direction */
export interface VolBar {
  time: number;
  volume: number;
  direction: 'up' | 'down';
}

export function computeVolumeBars(ohlcv: number[][]): VolBar[] {
  return ohlcv.map((candle, i) => ({
    time: candle[0],
    volume: candle[5],
    direction: candle[4] >= candle[1] ? 'up' : 'down', // close >= open
  }));
}
