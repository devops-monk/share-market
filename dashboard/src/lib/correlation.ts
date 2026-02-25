/**
 * Compute Pearson correlation matrix from OHLCV data.
 * Uses daily log returns aligned by timestamp intersection.
 */
export function computeCorrelationMatrix(
  ohlcvMap: Map<string, number[][]>,
  tickers: string[],
): number[][] {
  const n = tickers.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Extract close-price log returns keyed by timestamp
  const returnsMap = new Map<string, Map<number, number>>();

  for (const ticker of tickers) {
    const candles = ohlcvMap.get(ticker);
    if (!candles || candles.length < 2) continue;

    const returns = new Map<number, number>();
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1][4];
      const currClose = candles[i][4];
      if (prevClose > 0 && currClose > 0) {
        returns.set(candles[i][0], Math.log(currClose / prevClose));
      }
    }
    returnsMap.set(ticker, returns);
  }

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1; // Self-correlation

    for (let j = i + 1; j < n; j++) {
      const r = pearson(
        returnsMap.get(tickers[i]),
        returnsMap.get(tickers[j]),
      );
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }

  return matrix;
}

function pearson(
  a: Map<number, number> | undefined,
  b: Map<number, number> | undefined,
): number {
  if (!a || !b) return 0;

  // Align by timestamp intersection
  const shared: [number, number][] = [];
  for (const [ts, va] of a) {
    const vb = b.get(ts);
    if (vb !== undefined) shared.push([va, vb]);
  }

  if (shared.length < 20) return 0; // Not enough data

  const n = shared.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

  for (const [va, vb] of shared) {
    sumA += va;
    sumB += vb;
    sumAB += va * vb;
    sumA2 += va * va;
    sumB2 += vb * vb;
  }

  const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (denom === 0) return 0;

  return (n * sumAB - sumA * sumB) / denom;
}
