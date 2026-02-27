import { RSI, MACD, SMA, BollingerBands, Stochastic, OBV, ADX, WilliamsR } from 'technicalindicators';
import type { QuoteData } from '../stocks/fetcher.js';

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;  // (upper - lower) / middle
  percentB: number;   // (price - lower) / (upper - lower)
  squeeze: boolean;   // bandwidth below threshold
}

export interface StochasticData {
  k: number;
  d: number;
}

export interface TechnicalData {
  rsi: number | null;
  macd: { MACD: number; signal: number; histogram: number } | null;
  sma50: number | null;
  sma150: number | null;
  sma200: number | null;
  sma20: number | null;
  sma200Slope: number | null;  // slope of SMA200 over last 20 days
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  priceReturn1y: number;
  volatility: number;
  bollinger: BollingerData | null;
  stochastic: StochasticData | null;
  obv: number | null;
  obvTrend: 'rising' | 'falling' | 'flat' | null;
  obvDivergence: 'bullish' | 'bearish' | null;
  weeklyHighLowRange: number | null;  // consolidation detection: 6-week range %
  accumulationDistribution: number | null; // 13-week up-volume vs down-volume ratio
  priceReturn2y: number;
  priceReturn3y: number;
  priceReturn4y: number;
  // Year-over-year returns for each of the last 4 years (most recent first)
  yearlyReturns: number[];  // e.g. [+0.15, +0.10, -0.05, +0.20] = Year1 +15%, Year2 +10%, Year3 -5%, Year4 +20%
  yearlyUptrendYears: number;  // total number of positive-return years (0-4), NOT consecutive
  weightedAlpha: number | null;  // exponentially-weighted 1-year return, annualized %
  // N6: Additional Technical Indicators
  adx: number | null;           // Average Directional Index (trend strength)
  plusDI: number | null;        // +DI (bullish directional indicator)
  minusDI: number | null;       // -DI (bearish directional indicator)
  williamsR: number | null;     // Williams %R (-100 to 0)
  chaikinMoneyFlow: number | null; // CMF (-1 to 1)
  // N4: Risk-Adjusted Returns
  sharpeRatio: number | null;   // annualized Sharpe ratio (risk-free = 4.5%)
  sortinoRatio: number | null;  // annualized Sortino ratio
  maxDrawdown: number | null;   // maximum drawdown (negative %)
}

export function computeTechnicals(quote: QuoteData): TechnicalData {
  const closes = quote.historicalClose;
  const volumes = quote.historicalVolume;
  const highs = closes.map((c, i) => c * 1.005); // Approximate highs from close
  const lows = closes.map((c, i) => c * 0.995);  // Approximate lows from close

  // RSI (14-period)
  let rsi: number | null = null;
  if (closes.length >= 15) {
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  }

  // MACD (12, 26, 9)
  let macd: TechnicalData['macd'] = null;
  if (closes.length >= 27) {
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const last = macdValues[macdValues.length - 1];
    if (last && last.MACD != null && last.signal != null && last.histogram != null) {
      macd = { MACD: last.MACD, signal: last.signal, histogram: last.histogram };
    }
  }

  // SMA 20, 50, 150, 200
  let sma20: number | null = null;
  let sma50: number | null = null;
  let sma150: number | null = null;
  let sma200: number | null = null;
  let sma200Slope: number | null = null;
  if (closes.length >= 20) {
    const sma20Values = SMA.calculate({ values: closes, period: 20 });
    sma20 = sma20Values[sma20Values.length - 1] ?? null;
  }
  if (closes.length >= 50) {
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    sma50 = sma50Values[sma50Values.length - 1] ?? null;
  }
  if (closes.length >= 150) {
    const sma150Values = SMA.calculate({ values: closes, period: 150 });
    sma150 = sma150Values[sma150Values.length - 1] ?? null;
  }
  if (closes.length >= 200) {
    const sma200Values = SMA.calculate({ values: closes, period: 200 });
    sma200 = sma200Values[sma200Values.length - 1] ?? null;
    // SMA200 slope: compare current SMA200 vs 20 days ago
    if (sma200Values.length >= 21) {
      const current = sma200Values[sma200Values.length - 1];
      const past = sma200Values[sma200Values.length - 21];
      sma200Slope = (current - past) / past;
    }
  }

  // Bollinger Bands (20-period, 2 std dev)
  let bollinger: BollingerData | null = null;
  if (closes.length >= 20) {
    const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const last = bbValues[bbValues.length - 1];
    if (last) {
      const bandwidth = (last.upper - last.lower) / last.middle;
      const percentB = last.upper !== last.lower
        ? (quote.price - last.lower) / (last.upper - last.lower)
        : 0.5;
      // Squeeze: bandwidth below 10th percentile of recent readings
      const recentBW = bbValues.slice(-60).map(b => (b.upper - b.lower) / b.middle);
      const sortedBW = [...recentBW].sort((a, b) => a - b);
      const threshold = sortedBW[Math.floor(sortedBW.length * 0.15)] ?? bandwidth;
      bollinger = {
        upper: last.upper,
        middle: last.middle,
        lower: last.lower,
        bandwidth,
        percentB,
        squeeze: bandwidth <= threshold,
      };
    }
  }

  // Stochastic Oscillator (14, 3, 3)
  let stochastic: StochasticData | null = null;
  if (closes.length >= 17) {
    const stochValues = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    });
    const last = stochValues[stochValues.length - 1];
    if (last && last.k != null && last.d != null) {
      stochastic = { k: last.k, d: last.d };
    }
  }

  // On-Balance Volume
  let obv: number | null = null;
  let obvTrend: TechnicalData['obvTrend'] = null;
  let obvDivergence: TechnicalData['obvDivergence'] = null;
  if (closes.length >= 20 && volumes.length >= 20) {
    const minLen = Math.min(closes.length, volumes.length);
    const c = closes.slice(-minLen);
    const v = volumes.slice(-minLen);
    const obvValues = OBV.calculate({ close: c, volume: v });

    if (obvValues.length >= 20) {
      obv = obvValues[obvValues.length - 1];

      // OBV trend: compare last 20-day SMA of OBV vs 20 days ago
      const obvRecent = obvValues.slice(-20);
      const obvAvgRecent = obvRecent.reduce((a, b) => a + b, 0) / obvRecent.length;
      const obvOlder = obvValues.slice(-40, -20);
      if (obvOlder.length >= 10) {
        const obvAvgOlder = obvOlder.reduce((a, b) => a + b, 0) / obvOlder.length;
        const change = (obvAvgRecent - obvAvgOlder) / Math.abs(obvAvgOlder || 1);
        obvTrend = change > 0.05 ? 'rising' : change < -0.05 ? 'falling' : 'flat';
      }

      // OBV divergence detection
      // Price rising but OBV falling = bearish divergence
      // Price falling but OBV rising = bullish divergence
      if (closes.length >= 20) {
        const priceChange20d = (closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20];
        const obvChange20d = obvValues.length >= 20
          ? (obvValues[obvValues.length - 1] - obvValues[obvValues.length - 20]) / Math.abs(obvValues[obvValues.length - 20] || 1)
          : 0;
        if (priceChange20d > 0.03 && obvChange20d < -0.05) {
          obvDivergence = 'bearish';
        } else if (priceChange20d < -0.03 && obvChange20d > 0.05) {
          obvDivergence = 'bullish';
        }
      }
    }
  }

  // Volume ratio (current vs 20-day average)
  let volumeRatio = 1;
  if (volumes.length >= 20) {
    const recent20 = volumes.slice(-20);
    const avgVol = recent20.reduce((a, b) => a + b, 0) / recent20.length;
    volumeRatio = avgVol > 0 ? quote.volume / avgVol : 1;
  }

  // Price returns
  const priceReturn3m = closes.length >= 63
    ? (closes[closes.length - 1] - closes[closes.length - 63]) / closes[closes.length - 63]
    : 0;
  const priceReturn6m = closes.length >= 126
    ? (closes[closes.length - 1] - closes[closes.length - 126]) / closes[closes.length - 126]
    : closes.length >= 2
      ? (closes[closes.length - 1] - closes[0]) / closes[0]
      : 0;
  const priceReturn1y = closes.length >= 252
    ? (closes[closes.length - 1] - closes[closes.length - 252]) / closes[closes.length - 252]
    : priceReturn6m;

  // Volatility (std dev of daily returns over last 30 days)
  let volatility = 0;
  if (closes.length >= 31) {
    const returns: number[] = [];
    const slice = closes.slice(-31);
    for (let i = 1; i < slice.length; i++) {
      returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    volatility = Math.sqrt(variance) * Math.sqrt(252);
  }

  // Consolidation detection: 6-week (30 trading day) high-low range as %
  let weeklyHighLowRange: number | null = null;
  if (closes.length >= 30) {
    const recent30 = closes.slice(-30);
    const high30 = Math.max(...recent30);
    const low30 = Math.min(...recent30);
    weeklyHighLowRange = low30 > 0 ? (high30 - low30) / low30 : null;
  }

  // Accumulation/Distribution: 13-week (65 trading day) up-volume vs down-volume
  let accumulationDistribution: number | null = null;
  if (closes.length >= 66 && volumes.length >= 66) {
    const len = Math.min(closes.length, volumes.length);
    let upVol = 0, downVol = 0;
    const start = Math.max(1, len - 65);
    for (let i = start; i < len; i++) {
      if (closes[i] > closes[i - 1]) upVol += volumes[i];
      else if (closes[i] < closes[i - 1]) downVol += volumes[i];
    }
    const totalVol = upVol + downVol;
    accumulationDistribution = totalVol > 0 ? (upVol - downVol) / totalVol : 0;
  }

  // Multi-year price returns (2y = ~504, 3y = ~756, 4y = ~1008 trading days)
  const priceReturn2y = closes.length >= 504
    ? (closes[closes.length - 1] - closes[closes.length - 504]) / closes[closes.length - 504]
    : priceReturn1y;
  const priceReturn3y = closes.length >= 756
    ? (closes[closes.length - 1] - closes[closes.length - 756]) / closes[closes.length - 756]
    : priceReturn2y;
  const priceReturn4y = closes.length >= 1008
    ? (closes[closes.length - 1] - closes[closes.length - 1008]) / closes[closes.length - 1008]
    : priceReturn3y;

  // Year-over-year returns for each of the last 4 years (most recent first)
  // Year 1: last 252 days, Year 2: 252-504, Year 3: 504-756, Year 4: 756-1008
  const yearlyReturns: number[] = [];
  const yearBoundaries = [0, 252, 504, 756, 1008];
  for (let y = 0; y < 4; y++) {
    const endIdx = closes.length - yearBoundaries[y];
    const startIdx = closes.length - yearBoundaries[y + 1];
    if (startIdx >= 0 && endIdx > 0) {
      yearlyReturns.push(
        (closes[endIdx - 1] - closes[startIdx]) / closes[startIdx]
      );
    }
  }

  // Count total positive-return years (NOT consecutive)
  // e.g. [+15%, -5%, +10%, +20%] = 3 positive years out of 4
  const yearlyUptrendYears = yearlyReturns.filter(r => r > 0).length;

  // Weighted Alpha: exponentially-weighted 1-year return (annualized %)
  // Uses decay factor 0.985 so recent days matter more
  let weightedAlpha: number | null = null;
  if (closes.length >= 252) {
    const recentCloses = closes.slice(-252);
    let weightedSum = 0;
    let weightSum = 0;
    const decay = 0.985;
    for (let i = 1; i < recentCloses.length; i++) {
      const dailyReturn = (recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1];
      const weight = Math.pow(decay, recentCloses.length - 1 - i); // more recent = higher weight
      weightedSum += dailyReturn * weight;
      weightSum += weight;
    }
    const avgWeightedDailyReturn = weightedSum / weightSum;
    weightedAlpha = +(avgWeightedDailyReturn * 252 * 100).toFixed(2); // annualized %
  }

  // N6: ADX (Average Directional Index) — use real OHLCV if available
  const realHighs = quote.ohlcvHigh?.length >= 20 ? quote.ohlcvHigh : highs;
  const realLows = quote.ohlcvLow?.length >= 20 ? quote.ohlcvLow : lows;
  let adxVal: number | null = null;
  let plusDI: number | null = null;
  let minusDI: number | null = null;
  if (closes.length >= 28 && realHighs.length >= 28 && realLows.length >= 28) {
    const minLen = Math.min(closes.length, realHighs.length, realLows.length);
    const adxResult = ADX.calculate({
      high: realHighs.slice(-minLen),
      low: realLows.slice(-minLen),
      close: closes.slice(-minLen),
      period: 14,
    });
    const lastAdx = adxResult[adxResult.length - 1];
    if (lastAdx) {
      adxVal = +lastAdx.adx.toFixed(2);
      plusDI = +lastAdx.pdi.toFixed(2);
      minusDI = +lastAdx.mdi.toFixed(2);
    }
  }

  // N6: Williams %R
  let williamsRVal: number | null = null;
  if (closes.length >= 14 && realHighs.length >= 14 && realLows.length >= 14) {
    const minLen = Math.min(closes.length, realHighs.length, realLows.length);
    const wrResult = WilliamsR.calculate({
      high: realHighs.slice(-minLen),
      low: realLows.slice(-minLen),
      close: closes.slice(-minLen),
      period: 14,
    });
    if (wrResult.length > 0) {
      williamsRVal = +wrResult[wrResult.length - 1].toFixed(2);
    }
  }

  // N6: Chaikin Money Flow (20-period)
  let chaikinMoneyFlow: number | null = null;
  if (closes.length >= 20 && realHighs.length >= 20 && realLows.length >= 20 && volumes.length >= 20) {
    const period = 20;
    const minLen = Math.min(closes.length, realHighs.length, realLows.length, volumes.length);
    const c = closes.slice(-minLen);
    const h = realHighs.slice(-minLen);
    const l = realLows.slice(-minLen);
    const v = volumes.slice(-minLen);
    let mfvSum = 0;
    let volSum = 0;
    for (let j = c.length - period; j < c.length; j++) {
      const hl = h[j] - l[j];
      const mfm = hl > 0 ? ((c[j] - l[j]) - (h[j] - c[j])) / hl : 0;
      mfvSum += mfm * v[j];
      volSum += v[j];
    }
    chaikinMoneyFlow = volSum > 0 ? +(mfvSum / volSum).toFixed(4) : null;
  }

  // N4: Risk-Adjusted Returns (Sharpe, Sortino, Max Drawdown) — 1-year data
  let sharpeRatio: number | null = null;
  let sortinoRatio: number | null = null;
  let maxDrawdown: number | null = null;
  if (closes.length >= 252) {
    const yearCloses = closes.slice(-252);
    const dailyReturns: number[] = [];
    for (let j = 1; j < yearCloses.length; j++) {
      dailyReturns.push((yearCloses[j] - yearCloses[j - 1]) / yearCloses[j - 1]);
    }
    const riskFreeDaily = 0.045 / 252; // 4.5% annual risk-free rate
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const excessReturns = dailyReturns.map(r => r - riskFreeDaily);
    const excessMean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;

    // Sharpe: annualized
    const stdDev = Math.sqrt(excessReturns.reduce((s, r) => s + (r - excessMean) ** 2, 0) / excessReturns.length);
    if (stdDev > 0) {
      sharpeRatio = +((excessMean / stdDev) * Math.sqrt(252)).toFixed(2);
    }

    // Sortino: only downside deviation
    const negativeReturns = excessReturns.filter(r => r < 0);
    if (negativeReturns.length > 0) {
      const downsideDev = Math.sqrt(negativeReturns.reduce((s, r) => s + r ** 2, 0) / excessReturns.length);
      if (downsideDev > 0) {
        sortinoRatio = +((excessMean / downsideDev) * Math.sqrt(252)).toFixed(2);
      }
    }

    // Max Drawdown
    let peak = yearCloses[0];
    let worstDrawdown = 0;
    for (const p of yearCloses) {
      if (p > peak) peak = p;
      const dd = (p - peak) / peak;
      if (dd < worstDrawdown) worstDrawdown = dd;
    }
    maxDrawdown = +(worstDrawdown * 100).toFixed(2);
  }

  return {
    rsi, macd, sma20, sma50, sma150, sma200, sma200Slope, volumeRatio,
    priceReturn3m, priceReturn6m, priceReturn1y, volatility,
    bollinger, stochastic, obv, obvTrend, obvDivergence,
    weeklyHighLowRange, accumulationDistribution,
    priceReturn2y, priceReturn3y, priceReturn4y, yearlyReturns, yearlyUptrendYears,
    weightedAlpha,
    adx: adxVal, plusDI, minusDI, williamsR: williamsRVal, chaikinMoneyFlow,
    sharpeRatio, sortinoRatio, maxDrawdown,
  };
}
